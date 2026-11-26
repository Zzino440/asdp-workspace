import "server-only";

// Client REST di GitLab con il token del service account (GITLAB_TOKEN, solo server).
// Usalo solo da src/lib/documents/: i permessi li decide Postgres prima di arrivare qui.

type TreeEntry = { path: string; type: "blob" | "tree" };
type FileResponse = { content: string; last_commit_id: string };

async function gitlab(path: string, init?: RequestInit) {
  const response = await fetch(`${process.env.GITLAB_URL}/api/v4${path}`, {
    ...init,
    headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN!, ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new GitLabError(response.status, path, await response.text());
  return response;
}

export class GitLabError extends Error {
  constructor(
    readonly status: number,
    path: string,
    readonly body: string,
  ) {
    super(`GitLab ${status} su ${path}: ${body}`);
  }

  // GitLab rifiuta l'aggiornamento se il file è cambiato dopo last_commit_id.
  get isConflict() {
    return this.status === 400 && this.body.includes("has changed since you started editing");
  }

  // GitLab rifiuta la creazione se il file esiste già.
  get isExisting() {
    return this.status === 400 && this.body.includes("already exists");
  }

  get isNotFound() {
    return this.status === 404;
  }
}

const project = (projectPath: string) => `/projects/${encodeURIComponent(projectPath)}`;

// Tutti i file sotto una cartella (ricorsivo, paginato). Cartella che non esiste ancora (repo
// appena preparata, nessun documento) = nessun file.
export async function listFiles(projectPath: string, ref: string, folder: string) {
  const files: string[] = [];
  let page = "1";
  while (page) {
    const query = new URLSearchParams({ path: folder, ref, recursive: "true", per_page: "100", page });
    const response = await findOrNullResponse(`${project(projectPath)}/repository/tree?${query}`);
    if (!response) {
      // Repo o branch sbagliati o non accessibili: errore, non un indice vuoto.
      if (!(await branchExists(projectPath, ref))) throw new GitLabError(404, project(projectPath), "Repo o branch non trovati");
      return files;
    }
    const entries = (await response.json()) as TreeEntry[];
    files.push(...entries.filter((e) => e.type === "blob").map((e) => e.path));
    page = response.headers.get("x-next-page") ?? "";
  }
  return files;
}

// Contenuto (UTF-8) e ultimo commit che ha modificato il file.
export async function readFile(projectPath: string, ref: string, filePath: string) {
  const response = await gitlab(
    `${project(projectPath)}/repository/files/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(ref)}`,
  );
  const file = (await response.json()) as FileResponse;
  return {
    content: Buffer.from(file.content, "base64").toString("utf8"),
    lastCommitId: file.last_commit_id,
  };
}

// Commit di un file esistente con l'utente come autore (committer resta il service account).
// GitLab controlla last_commit_id e rifiuta se il file è cambiato nel frattempo.
export async function updateFile(
  projectPath: string,
  branch: string,
  file: { path: string; content: string; lastCommitId: string },
  commit: { message: string; authorName: string; authorEmail: string },
) {
  const response = await gitlab(`${project(projectPath)}/repository/commits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      branch,
      commit_message: commit.message,
      author_name: commit.authorName,
      author_email: commit.authorEmail,
      actions: [
        { action: "update", file_path: file.path, content: file.content, last_commit_id: file.lastCommitId },
      ],
    }),
  });
  const created = (await response.json()) as { id: string };
  return created.id;
}

// Commit di un file nuovo con l'utente come autore; GitLab rifiuta se il file esiste già.
export async function createFile(
  projectPath: string,
  branch: string,
  file: { path: string; content: string },
  commit: { message: string; authorName: string; authorEmail: string },
) {
  const response = await gitlab(`${project(projectPath)}/repository/commits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      branch,
      commit_message: commit.message,
      author_name: commit.authorName,
      author_email: commit.authorEmail,
      actions: [{ action: "create", file_path: file.path, content: file.content }],
    }),
  });
  const created = (await response.json()) as { id: string };
  return created.id;
}

type CommitResponse ={ id: string; message: string; author_name: string; authored_date: string };

// Commit che hanno toccato un file, dal più recente (fino a 100).
export async function listFileCommits(projectPath: string, ref: string, filePath: string) {
  const query = new URLSearchParams({ ref_name: ref, path: filePath, per_page: "100" });
  const response = await gitlab(`${project(projectPath)}/repository/commits?${query}`);
  const commits = (await response.json()) as CommitResponse[];
  return commits.map((c) => ({ id: c.id, message: c.message, authorName: c.author_name, authoredDate: c.authored_date }));
}

// Diff unificato di un file tra due commit ("" se il file non cambia).
export async function compareFile(projectPath: string, from: string, to: string, filePath: string) {
  const query = new URLSearchParams({ from, to, straight: "true" });
  const response = await gitlab(`${project(projectPath)}/repository/compare?${query}`);
  const { diffs } = (await response.json()) as { diffs: { new_path: string; old_path: string; diff: string }[] };
  return diffs.find((d) => d.new_path === filePath || d.old_path === filePath)?.diff ?? "";
}

// Webhook dei push verso l'app: crea quello con questo URL o lo aggiorna (il secret non si
// rilegge da GitLab, quindi lo riscrive sempre). Serve il ruolo Maintainer sulla repo.
export async function ensurePushWebhook(projectPath: string, url: string, token: string) {
  const hooks = (await (await gitlab(`${project(projectPath)}/hooks`)).json()) as { id: number; url: string }[];
  const existing = hooks.find((h) => h.url === url);
  await gitlab(`${project(projectPath)}/hooks${existing ? `/${existing.id}` : ""}`, {
    method: existing ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, token, push_events: true, enable_ssl_verification: true }),
  });
}

// --- Preparazione del progetto (gruppo e repo), usata da src/lib/workspace.ts ---

type Group = { id: number; full_path: string; web_url: string };
type GitLabProject = { id: number; path_with_namespace: string; web_url: string; empty_repo: boolean };

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// null se non esiste (o il token non lo vede).
async function findOrNullResponse(path: string) {
  try {
    return await gitlab(path);
  } catch (error) {
    if (error instanceof GitLabError && error.isNotFound) return null;
    throw error;
  }
}

async function findOrNull<T>(path: string) {
  const response = await findOrNullResponse(path);
  return response && ((await response.json()) as T);
}

export const getGroup = (groupPath: string) => findOrNull<Group>(`/groups/${encodeURIComponent(groupPath)}`);

export const getProject = (projectPath: string) => findOrNull<GitLabProject>(project(projectPath));

// Sottogruppo privato sotto parentId.
export async function createGroup(parentId: number, path: string, name: string) {
  const response = await gitlab("/groups", json("POST", { parent_id: parentId, path, name, visibility: "private" }));
  return (await response.json()) as Group;
}

// Project privato nel gruppo; con readme crea anche il primo commit sul branch predefinito.
export async function createProject(namespaceId: number, path: string, name: string, readme: boolean) {
  const response = await gitlab(
    "/projects",
    json("POST", {
      namespace_id: namespaceId,
      path,
      name,
      visibility: "private",
      default_branch: "main",
      initialize_with_readme: readme,
    }),
  );
  return (await response.json()) as GitLabProject;
}

// Un commit con più file nuovi (su una repo vuota crea anche il branch).
export async function commitFiles(
  projectPath: string,
  branch: string,
  files: { path: string; content: string }[],
  commit: { message: string; authorName: string; authorEmail: string },
) {
  await gitlab(
    `${project(projectPath)}/repository/commits`,
    json("POST", {
      branch,
      commit_message: commit.message,
      author_name: commit.authorName,
      author_email: commit.authorEmail,
      actions: files.map((f) => ({ action: "create", file_path: f.path, content: f.content })),
    }),
  );
}

// true se il branch esiste e il token dell'app lo vede; 404/403 → false. Timeout breve: è un
// controllo di cortesia e non deve bloccare il salvataggio se GitLab non risponde.
export async function branchExists(projectPath: string, branch: string) {
  try {
    await gitlab(`${project(projectPath)}/repository/branches/${encodeURIComponent(branch)}`, {
      signal: AbortSignal.timeout(5000),
    });
    return true;
  } catch (error) {
    if (error instanceof GitLabError && (error.status === 404 || error.status === 403)) return false;
    throw error;
  }
}
