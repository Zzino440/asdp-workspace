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
}

const project = (projectPath: string) => `/projects/${encodeURIComponent(projectPath)}`;

// Tutti i file sotto una cartella (ricorsivo, paginato).
export async function listFiles(projectPath: string, ref: string, folder: string) {
  const files: string[] = [];
  let page = "1";
  while (page) {
    const query = new URLSearchParams({ path: folder, ref, recursive: "true", per_page: "100", page });
    const response = await gitlab(`${project(projectPath)}/repository/tree?${query}`);
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
