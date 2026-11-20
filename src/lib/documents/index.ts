import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parse } from "yaml";
import { listFiles, readFile } from "@/lib/gitlab";

// Livello di servizio unico per i documenti: lo usano le server action della UI e i tool MCP.
// Riceve sempre un client Supabase: quello dell'utente (RLS) oppure, solo nel webhook, quello
// con la service role.

type DocumentType = { code: string; folder: string };
type Project = { id: string; gitlab_project_path: string | null; gitlab_branch: string; docs_root: string };

// Frontespizio GUIDA-FRONT: blocco YAML tra due righe "---" in testa al file.
export function splitFrontMatter(content: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (!match) return { frontMatter: {} as Record<string, unknown>, body: content };
  const parsed: unknown = parse(match[1]);
  return {
    frontMatter: (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>,
    body: content.slice(match[0].length),
  };
}

// Tipo del documento: prefisso del nome file (es. "T4.3-INDEX-…"), poi template_origine del
// frontespizio, infine la cartella se un solo tipo la usa.
function detectType(
  path: string,
  docsRoot: string,
  frontMatter: Record<string, unknown>,
  types: DocumentType[],
) {
  const byLength = [...types].sort((a, b) => b.code.length - a.code.length);
  const fileName = path.split("/").pop()!.toUpperCase();
  const fromName = byLength.find((t) => fileName.startsWith(t.code.toUpperCase()));
  if (fromName) return fromName.code;

  const origin = String(frontMatter.template_origine ?? "").split(" ")[0];
  const fromOrigin = types.find((t) => t.code === origin);
  if (fromOrigin) return fromOrigin.code;

  // Le cartelle del catalogo sono scritte con la radice predefinita "asdp/".
  const relative = path.slice(docsRoot.length);
  const inFolder = types.filter((t) => relative.startsWith(`${t.folder.replace(/^asdp\//, "")}/`));
  return inFolder.length === 1 ? inFolder[0].code : null;
}

const loadProject = (supabase: SupabaseClient, projectId: string) =>
  supabase
    .from("projects")
    .select("id, gitlab_project_path, gitlab_branch, docs_root")
    .eq("id", projectId)
    .single<Project>();

// Ricostruisce l'indice del progetto leggendo tutta la cartella dei documenti su GitLab.
export async function indexProject(supabase: SupabaseClient, projectId: string) {
  const { data: project, error } = await loadProject(supabase, projectId);
  if (error || !project.gitlab_project_path) throw new Error("Progetto senza repo documenti.");
  const repo = project.gitlab_project_path;
  const docsRoot = project.docs_root.replace(/\/?$/, "/");

  const { data: types } = await supabase.from("document_types").select("code, folder");
  const paths = await listFiles(repo, project.gitlab_branch, docsRoot);

  const rows = await Promise.all(
    paths.map(async (path) => {
      const file = await readFile(repo, project.gitlab_branch, path);
      const { frontMatter } = path.endsWith(".md") ? splitFrontMatter(file.content) : { frontMatter: {} };
      return {
        project_id: project.id,
        path,
        document_type: detectType(path, docsRoot, frontMatter, types ?? []),
        front_matter: frontMatter,
        last_commit_id: file.lastCommitId,
        indexed_at: new Date().toISOString(),
      };
    }),
  );

  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from("documents").upsert(rows);
    if (upsertError) throw new Error("Impossibile aggiornare l'indice.");
  }
  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("project_id", project.id)
    .not("path", "in", `(${paths.map((p) => `"${p}"`).join(",") || '""'})`);
  if (deleteError) throw new Error("Impossibile aggiornare l'indice.");

  return rows.length;
}

// Elenco visibile all'utente (filtrato dalla RLS secondo la matrice permessi).
export async function listDocuments(supabase: SupabaseClient, projectId: string) {
  const { data } = await supabase
    .from("documents")
    .select("path, document_type, front_matter, last_commit_id, indexed_at")
    .eq("project_id", projectId)
    .order("path");
  return data ?? [];
}

// Legge un documento da GitLab solo se la RLS lo rende visibile all'utente.
export async function readDocument(supabase: SupabaseClient, projectId: string, path: string) {
  const { data: indexed } = await supabase
    .from("documents")
    .select("path, document_type")
    .eq("project_id", projectId)
    .eq("path", path)
    .maybeSingle();
  if (!indexed) return null;

  const { data: project } = await loadProject(supabase, projectId);
  if (!project?.gitlab_project_path) return null;

  const file = await readFile(project.gitlab_project_path, project.gitlab_branch, path);
  return {
    path,
    documentType: indexed.document_type as string | null,
    lastCommitId: file.lastCommitId,
    ...(path.endsWith(".md")
      ? splitFrontMatter(file.content)
      : { frontMatter: {} as Record<string, unknown>, body: null }),
  };
}
