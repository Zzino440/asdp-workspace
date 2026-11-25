import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parse } from "yaml";
import {
  compareFile,
  createFile,
  ensurePushWebhook,
  GitLabError,
  listFileCommits,
  listFiles,
  readFile,
  updateFile,
} from "@/lib/gitlab";
import { type FieldValue, setFrontMatterFields } from "@/lib/front-matter";
import { gateFor } from "@/lib/gates";
import { type AsdpRole, ROLE_LABELS } from "@/lib/labels";

// Livello di servizio unico per i documenti: lo usano le server action della UI e i tool MCP.
// Riceve sempre un client Supabase: quello dell'utente (RLS) oppure, solo nel webhook, quello
// con la service role.

type DocumentType = { code: string; folder: string };
type Project = { id: string; gitlab_project_path: string | null; gitlab_branch: string; docs_root: string };

// Frontespizio GUIDA-FRONT: blocco YAML tra due righe "---" in testa al file.
export function splitFrontMatter(content: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (!match) return { frontMatter: {} as Record<string, unknown>, frontMatterSource: null, body: content };
  const parsed: unknown = parse(match[1]);
  return {
    frontMatter: (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>,
    frontMatterSource: match[1],
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

// Coda delle approvazioni: documenti Completo (= in approvazione) visibili all'utente, tenuti solo
// dove ha "approve". Il filtro serve a mostrare la coda giusta; il permesso lo verifica changeApproval.
export async function listToApprove(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("documents")
    .select("project_id, path, document_type, front_matter, indexed_at, projects(name, code)")
    .eq("front_matter->>stato", "Completo")
    .order("indexed_at", { ascending: false });
  const rows = data ?? [];
  const keys = [...new Set(rows.map((r) => `${r.project_id}|${r.document_type ?? ""}`))];
  const levels = new Map(
    await Promise.all(
      keys.map(async (key) => {
        const [projectId, type] = key.split("|");
        return [key, await documentLevel(supabase, projectId, type || null)] as const;
      }),
    ),
  );
  return rows.filter((r) => levels.get(`${r.project_id}|${r.document_type ?? ""}`) === "approve");
}

// Documenti approvati negli ultimi `days` giorni, visibili all'utente (RLS), dal più recente.
export async function listApproved(supabase: SupabaseClient, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("documents")
    .select("project_id, path, document_type, front_matter, projects(name, code)")
    .eq("front_matter->>stato", "Approvato")
    .gte("front_matter->>approvato_il", since)
    .order("front_matter->>approvato_il", { ascending: false });
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
    content: file.content,
    ...(path.endsWith(".md")
      ? splitFrontMatter(file.content)
      : { frontMatter: {} as Record<string, unknown>, frontMatterSource: null, body: null }),
  };
}

// Livello dell'utente sul documento, deciso da Postgres (document_level).
export async function documentLevel(supabase: SupabaseClient, projectId: string, documentType: string | null) {
  const { data } = await supabase.rpc("document_level", {
    p_project_id: projectId,
    p_document_type: documentType,
  });
  return (data ?? "none") as "none" | "view" | "edit" | "approve";
}

export class DocumentError extends Error {
  constructor(
    readonly code:
      | "not_found"
      | "forbidden"
      | "conflict"
      | "approval_fields"
      | "exists"
      | "invalid_path"
      | "unknown_type"
      | "invalid_state"
      | "incomplete",
  ) {
    super(code);
  }
}

// Campi del frontespizio gestiti dal flusso di approvazione: solo chi ha "approve" li cambia.
const APPROVAL_FIELDS = ["approvato_da", "approvato_il", "versione_approvata", "evidenza_approvazione"];

function changesApproval(before: Record<string, unknown>, after: Record<string, unknown>) {
  const same = (key: string) => JSON.stringify(before[key] ?? null) === JSON.stringify(after[key] ?? null);
  const approvedBefore = before.stato === "Approvato";
  const approvedAfter = after.stato === "Approvato";
  return approvedBefore !== approvedAfter || !APPROVAL_FIELDS.every(same);
}

// Stato In corso e dati di approvazione svuotati, solo sulle chiavi già presenti nel frontespizio.
function clearedApproval(front: Record<string, unknown>) {
  const changes: Record<string, FieldValue> = { stato: "In corso" };
  for (const key of [...APPROVAL_FIELDS, "gate"]) if (key in front) changes[key] = null;
  return changes;
}

const withFrontMatter = (content: string, source: string, changes: Record<string, FieldValue>) =>
  content.replace(source, () => setFrontMatterFields(source, changes));

// Salva il testo completo di un documento con un commit a nome dell'utente.
// lastCommitId è l'ultimo commit visto dall'utente: se il file è cambiato nel frattempo → conflict.
export async function saveDocument(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    path: string;
    content: string;
    lastCommitId: string;
    message?: string;
    via: "app" | "mcp";
    userId: string;
  },
) {
  const { data: indexed } = await supabase
    .from("documents")
    .select("document_type")
    .eq("project_id", input.projectId)
    .eq("path", input.path)
    .maybeSingle();
  if (!indexed) throw new DocumentError("not_found");

  const level = await documentLevel(supabase, input.projectId, indexed.document_type);
  if (level !== "edit" && level !== "approve") throw new DocumentError("forbidden");

  const [{ data: project }, { data: profile }] = await Promise.all([
    loadProject(supabase, input.projectId),
    supabase.from("profiles").select("full_name, email").eq("id", input.userId).single(),
  ]);
  if (!project?.gitlab_project_path || !profile) throw new DocumentError("not_found");

  // Versione da cui parte l'utente: un id che non esiste vale come conflitto (va riletto).
  let previous: string;
  try {
    previous = (await readFile(project.gitlab_project_path, input.lastCommitId, input.path)).content;
  } catch (error) {
    if (error instanceof GitLabError && error.status === 404) throw new DocumentError("conflict");
    throw error;
  }
  let content = input.content;
  let note = "";
  if (input.path.endsWith(".md")) {
    const before = splitFrontMatter(previous);
    const after = splitFrontMatter(input.content);
    if (level !== "approve" && changesApproval(before.frontMatter, after.frontMatter)) {
      throw new DocumentError("approval_fields");
    }
    // GUIDA-FRONT: cambiare il testo di un documento Approvato ne annulla l'approvazione.
    if (
      before.frontMatter.stato === "Approvato" &&
      after.frontMatter.stato === "Approvato" &&
      after.frontMatterSource !== null &&
      before.body !== after.body
    ) {
      content = withFrontMatter(input.content, after.frontMatterSource, clearedApproval(after.frontMatter));
      note = "\n\nApprovazione annullata: il testo è cambiato, il documento torna In corso.";
    }
  }

  const fileName = input.path.split("/").pop();
  let commitId: string;
  try {
    commitId = await updateFile(
      project.gitlab_project_path,
      project.gitlab_branch,
      { path: input.path, content, lastCommitId: input.lastCommitId },
      {
        message: `${input.message?.trim() || `Aggiorna ${fileName}`}${note}\n\nVia: ${input.via}`,
        authorName: profile.full_name || profile.email,
        authorEmail: profile.email,
      },
    );
  } catch (error) {
    if (error instanceof GitLabError && error.isConflict) throw new DocumentError("conflict");
    throw error;
  }

  // Indice aggiornato subito (in locale il webhook non arriva); se fallisce lo ripara il webhook.
  const { frontMatter } = input.path.endsWith(".md") ? splitFrontMatter(content) : { frontMatter: {} };
  const { error } = await supabase
    .from("documents")
    .update({ front_matter: frontMatter, last_commit_id: commitId, indexed_at: new Date().toISOString() })
    .eq("project_id", input.projectId)
    .eq("path", input.path);
  if (error) console.error("Indice non aggiornato dopo il salvataggio", error);

  return { lastCommitId: commitId };
}

// Passi del flusso di approvazione e stato da cui partono. Completo vale come «in approvazione».
export type ApprovalStep = "complete" | "approve" | "request_changes" | "revoke";
const STEP_FROM: Record<ApprovalStep, string[]> = {
  complete: ["Da fare", "In corso"],
  approve: ["Completo"],
  request_changes: ["Completo"],
  revoke: ["Approvato"],
};

// Esegue un passo del flusso di approvazione: cambia solo il frontespizio e salva con
// saveDocument (stessi controlli di permesso e conflitto). complete serve "edit", gli altri "approve".
export async function changeApproval(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    path: string;
    lastCommitId: string;
    step: ApprovalStep;
    checked?: string[];
    evidence?: string;
    reason?: string;
    via: "app" | "mcp";
    userId: string;
  },
) {
  const { data: indexed } = await supabase
    .from("documents")
    .select("document_type")
    .eq("project_id", input.projectId)
    .eq("path", input.path)
    .maybeSingle();
  if (!indexed || !input.path.endsWith(".md")) throw new DocumentError("not_found");

  const level = await documentLevel(supabase, input.projectId, indexed.document_type);
  if (input.step !== "complete" && level !== "approve") throw new DocumentError("forbidden");

  const [{ data: project }, { data: profile }, { data: member }] = await Promise.all([
    loadProject(supabase, input.projectId),
    supabase.from("profiles").select("full_name, email").eq("id", input.userId).single(),
    supabase
      .from("project_members")
      .select("roles")
      .eq("project_id", input.projectId)
      .eq("user_id", input.userId)
      .maybeSingle(),
  ]);
  if (!project?.gitlab_project_path || !profile) throw new DocumentError("not_found");

  let previous: string;
  try {
    previous = (await readFile(project.gitlab_project_path, input.lastCommitId, input.path)).content;
  } catch (error) {
    if (error instanceof GitLabError && error.status === 404) throw new DocumentError("conflict");
    throw error;
  }
  const { frontMatter, frontMatterSource } = splitFrontMatter(previous);
  if (frontMatterSource === null || !STEP_FROM[input.step].includes(String(frontMatter.stato))) {
    throw new DocumentError("invalid_state");
  }

  const gate = gateFor(indexed.document_type);
  const reason = input.reason?.trim();
  const evidence = input.evidence?.trim();
  const today = new Date().toISOString().slice(0, 10);
  const fileName = input.path.split("/").pop();
  let changes: Record<string, FieldValue>;
  let message: string;

  if (input.step === "complete") {
    changes = { stato: "Completo", ...("completato_il" in frontMatter && { completato_il: today }) };
    message = `Segna come completo ${fileName}`;
  } else if (input.step === "approve") {
    const checked = input.checked ?? [];
    if (!gate.checklist.every((item) => checked.includes(item)) || (gate.externalEvidence && !evidence)) {
      throw new DocumentError("incomplete");
    }
    const roles = ((member?.roles ?? []) as AsdpRole[]).map((r) => ROLE_LABELS[r]).join("/");
    changes = {
      stato: "Approvato",
      approvato_da: `${profile.full_name || profile.email}${roles ? ` (${roles})` : ""}`,
      approvato_il: today,
      versione_approvata: (frontMatter.versione as FieldValue) ?? null,
      ...(gate.name && { gate: gate.name }),
      evidenza_approvazione: evidence || `commit ${input.lastCommitId.slice(0, 8)}`,
    };
    message = [
      `Approva ${fileName}${gate.name ? ` (${gate.name})` : ""}`,
      ...(gate.checklist.length > 0 ? ["", ...gate.checklist.map((item) => `- [x] ${item}`)] : []),
      ...(evidence ? ["", `Evidenza: ${evidence}`] : []),
    ].join("\n");
  } else {
    if (!reason) throw new DocumentError("incomplete");
    changes = input.step === "revoke" ? clearedApproval(frontMatter) : { stato: "In corso" };
    message = `${input.step === "revoke" ? "Revoca l'approvazione di" : "Richiede modifiche a"} ${fileName}\n\n${reason}`;
  }

  return saveDocument(supabase, {
    projectId: input.projectId,
    path: input.path,
    content: withFrontMatter(previous, frontMatterSource, changes),
    lastCommitId: input.lastCommitId,
    message,
    via: input.via,
    userId: input.userId,
  });
}

// Crea un documento nuovo con un commit a nome dell'utente. Il tipo si ricava come nell'indice
// (nome file, template_origine, cartella); serve "edit" su quel tipo.
export async function createDocument(
  supabase: SupabaseClient,
  input: { projectId: string; path: string; content: string; message?: string; via: "app" | "mcp"; userId: string },
) {
  const [{ data: project }, { data: profile }, { data: types }] = await Promise.all([
    loadProject(supabase, input.projectId),
    supabase.from("profiles").select("full_name, email").eq("id", input.userId).single(),
    supabase.from("document_types").select("code, folder"),
  ]);
  if (!project?.gitlab_project_path || !profile) throw new DocumentError("not_found");

  const docsRoot = project.docs_root.replace(/\/?$/, "/");
  if (!input.path.startsWith(docsRoot) || !/\.(md|csv)$/.test(input.path) || input.path.includes("..")) {
    throw new DocumentError("invalid_path");
  }

  const frontMatter = input.path.endsWith(".md") ? splitFrontMatter(input.content).frontMatter : {};
  const documentType = detectType(input.path, docsRoot, frontMatter, types ?? []);
  if (!documentType) throw new DocumentError("unknown_type");

  const level = await documentLevel(supabase, input.projectId, documentType);
  if (level !== "edit" && level !== "approve") throw new DocumentError("forbidden");
  if (level !== "approve" && changesApproval({}, frontMatter)) throw new DocumentError("approval_fields");

  const { data: indexed } = await supabase
    .from("documents")
    .select("path")
    .eq("project_id", input.projectId)
    .eq("path", input.path)
    .maybeSingle();
  if (indexed) throw new DocumentError("exists");

  const fileName = input.path.split("/").pop();
  let commitId: string;
  try {
    commitId = await createFile(
      project.gitlab_project_path,
      project.gitlab_branch,
      { path: input.path, content: input.content },
      {
        message: `${input.message?.trim() || `Crea ${fileName}`}\n\nVia: ${input.via}`,
        authorName: profile.full_name || profile.email,
        authorEmail: profile.email,
      },
    );
  } catch (error) {
    if (error instanceof GitLabError && error.isExisting) throw new DocumentError("exists");
    throw error;
  }

  // Indice aggiornato subito (in locale il webhook non arriva); se fallisce lo ripara il webhook.
  const { error } = await supabase.from("documents").insert({
    project_id: input.projectId,
    path: input.path,
    document_type: documentType,
    front_matter: frontMatter,
    last_commit_id: commitId,
    indexed_at: new Date().toISOString(),
  });
  if (error) console.error("Indice non aggiornato dopo la creazione", error);

  return { documentType, lastCommitId: commitId };
}

// Progetto del documento, solo se la RLS rende visibile la riga d'indice all'utente.
async function visibleProject(supabase: SupabaseClient, projectId: string, path: string) {
  const { data: indexed } = await supabase
    .from("documents")
    .select("path")
    .eq("project_id", projectId)
    .eq("path", path)
    .maybeSingle();
  if (!indexed) return null;
  const { data: project } = await loadProject(supabase, projectId);
  return project?.gitlab_project_path ? { ...project, gitlab_project_path: project.gitlab_project_path } : null;
}

// Storico del documento: un commit per versione, con il canale da cui arriva (trailer "Via:").
export async function listVersions(supabase: SupabaseClient, projectId: string, path: string) {
  const project = await visibleProject(supabase, projectId, path);
  if (!project) return null;
  const commits = await listFileCommits(project.gitlab_project_path, project.gitlab_branch, path);
  return commits.map((c) => ({
    ...c,
    title: c.message.split("\n")[0],
    via: (/^Via: (app|mcp)$/m.exec(c.message)?.[1] ?? "git") as "app" | "mcp" | "git",
  }));
}

// Contenuto di una versione e diff rispetto alla versione precedente (se c'è).
export async function readVersion(
  supabase: SupabaseClient,
  projectId: string,
  path: string,
  commitId: string,
  previousId: string | null,
) {
  const project = await visibleProject(supabase, projectId, path);
  if (!project) return null;
  const repo = project.gitlab_project_path;
  const [file, diff] = await Promise.all([
    readFile(repo, commitId, path),
    previousId ? compareFile(repo, previousId, commitId, path) : Promise.resolve(null),
  ]);
  return {
    diff,
    ...(path.endsWith(".md") ? splitFrontMatter(file.content) : { frontMatter: {}, frontMatterSource: null, body: null }),
  };
}

// Webhook della repo documenti verso l'URL di produzione dell'app su Vercel. In locale
// (nessun URL pubblico) non fa nulla. Se non riesce torna un avviso: il progetto funziona
// lo stesso, ma dopo i push diretti su GitLab serve "Reindicizza".
export async function ensureProjectWebhook(supabase: SupabaseClient, projectId: string) {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const secret = process.env.GITLAB_WEBHOOK_SECRET;
  if (!host || !secret) return null;

  const { data: project } = await loadProject(supabase, projectId);
  if (!project?.gitlab_project_path) return null;
  try {
    await ensurePushWebhook(project.gitlab_project_path, `https://${host}/api/gitlab/webhook`, secret);
    return null;
  } catch (error) {
    console.error("Webhook GitLab non configurato", error);
    return "Webhook GitLab non configurato: il service account deve essere Maintainer della repo documenti. Fino ad allora usa Reindicizza dopo i push diretti.";
  }
}
