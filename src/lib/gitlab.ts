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
  if (!response.ok) throw new Error(`GitLab ${response.status} su ${path}`);
  return response;
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
