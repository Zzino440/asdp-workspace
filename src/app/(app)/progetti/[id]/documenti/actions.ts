"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  answerQuestion,
  changeApproval,
  createDocument,
  deleteDocument,
  DocumentError,
  listVersions,
  moveDocument,
  saveDocument,
} from "@/lib/documents";
import { SUPPORT_FOLDER, validSupportPath } from "@/lib/document-type";
import { EXPORT_FORMATS } from "@/lib/documents/export";
import { type Publication, PublishError, publishDocument } from "@/lib/documents/publish";
import { MicrosoftError } from "@/lib/microsoft";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { error: string | null; conflict?: boolean; lastCommitId?: string };

const saveSchema = z.object({
  projectId: z.guid(),
  path: z.string().min(1),
  content: z.string(),
  lastCommitId: z.string().min(1),
  message: z.string().max(200),
});

const MESSAGES = {
  not_found: "Documento non trovato.",
  forbidden: "Non hai i permessi per modificare questo documento.",
  conflict: "Il documento è stato modificato su GitLab dopo che l'hai aperto.",
  approval_fields: "Solo chi approva il documento può cambiarne lo stato Approvato o i dati di approvazione.",
  invalid_state: "Lo stato del documento è cambiato: ricarica la pagina.",
  incomplete: "Completa la checklist e i campi obbligatori.",
  invalid_front_matter: "Il frontespizio YAML del documento non è valido: correggilo su GitLab e riprova.",
  missing_front_matter: "Il testo salvato non ha più il frontespizio: niente è stato salvato.",
};

const savedAt = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

// Conflitto: dice chi ha salvato l'ultima versione e quando. Se il file è stato spostato o
// cancellato la cronologia non si legge e resta il messaggio generico.
async function conflictError(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string, path: string) {
  try {
    const last = (await listVersions(supabase, projectId, path))?.[0];
    if (last) {
      const via = last.via === "mcp" ? " con Claude" : last.via === "git" ? " da GitLab" : "";
      return `${last.authorName} ha salvato una nuova versione${via} il ${savedAt.format(new Date(last.authoredDate))}, dopo che l'hai aperto.`;
    }
  } catch (e) {
    console.error(e);
  }
  return MESSAGES.conflict;
}

const approvalSchema = z.object({
  projectId: z.guid(),
  path: z.string().min(1),
  lastCommitId: z.string().min(1),
  step: z.enum(["complete", "approve", "request_changes", "revoke"]),
  checked: z.array(z.string()).optional(),
  evidence: z.string().max(500).optional(),
  reason: z.string().max(2000).optional(),
});

export async function changeApprovalAction(input: z.input<typeof approvalSchema>): Promise<SaveResult> {
  const parsed = approvalSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "Sessione scaduta: rifai il login." };
  try {
    const { lastCommitId } = await changeApproval(supabase, { ...parsed.data, via: "app", userId: claims.claims.sub });
    return { error: null, lastCommitId };
  } catch (e) {
    if (e instanceof DocumentError && e.code === "conflict")
      return { error: await conflictError(supabase, parsed.data.projectId, parsed.data.path), conflict: true };
    if (e instanceof DocumentError) return { error: MESSAGES[e.code as keyof typeof MESSAGES] };
    console.error(e);
    return { error: "Salvataggio non riuscito." };
  }
}

export async function saveDocumentAction(input: z.input<typeof saveSchema>): Promise<SaveResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "Sessione scaduta: rifai il login." };
  try {
    const { lastCommitId } = await saveDocument(supabase, { ...parsed.data, via: "app", userId: claims.claims.sub });
    return { error: null, lastCommitId };
  } catch (e) {
    // saveDocument lancia solo i codici di MESSAGES; gli altri sono della creazione.
    if (e instanceof DocumentError && e.code === "conflict")
      return { error: await conflictError(supabase, parsed.data.projectId, parsed.data.path), conflict: true };
    if (e instanceof DocumentError) return { error: MESSAGES[e.code as keyof typeof MESSAGES] };
    console.error(e);
    return { error: "Salvataggio non riuscito." };
  }
}

const answerSchema = z.object({
  projectId: z.guid(),
  path: z.string().min(1),
  lastCommitId: z.string().min(1),
  questionId: z.string().regex(/^D\d+$/),
  option: z.number().int().min(0),
  other: z.string().max(500).optional(),
});

export async function answerQuestionAction(input: z.input<typeof answerSchema>): Promise<SaveResult> {
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "Sessione scaduta: rifai il login." };
  try {
    const { lastCommitId } = await answerQuestion(supabase, { ...parsed.data, via: "app", userId: claims.claims.sub });
    return { error: null, lastCommitId };
  } catch (e) {
    if (e instanceof DocumentError && e.code === "conflict")
      return { error: await conflictError(supabase, parsed.data.projectId, parsed.data.path), conflict: true };
    if (e instanceof DocumentError && e.code === "incomplete")
      return { error: "Scegli un'opzione; per «Altro» scrivi la risposta." };
    if (e instanceof DocumentError) return { error: MESSAGES[e.code as keyof typeof MESSAGES] };
    console.error(e);
    return { error: "Salvataggio non riuscito." };
  }
}

const publishSchema = z.object({
  projectId: z.guid(),
  path: z.string().min(1),
  formats: z.array(z.enum(EXPORT_FORMATS)).min(1),
  locationId: z.guid().optional(),
});

const PUBLISH_MESSAGES = {
  not_found: "Documento non trovato.",
  forbidden: "Solo chi approva il documento può pubblicarlo su Teams.",
  invalid_state: "Si pubblicano solo i documenti Approvati: ricarica la pagina.",
  no_folder: "Il progetto non ha una cartella Teams collegata.",
  no_account: "Collega il tuo account Microsoft dalla scheda File del progetto.",
};

export async function publishDocumentAction(
  input: z.input<typeof publishSchema>,
): Promise<{ error: string | null; publication?: Publication }> {
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi." };
  try {
    return { error: null, publication: await publishDocument(await createClient(), parsed.data) };
  } catch (e) {
    if (e instanceof DocumentError || e instanceof PublishError)
      return { error: PUBLISH_MESSAGES[e.code as keyof typeof PUBLISH_MESSAGES] ?? "Pubblicazione non riuscita." };
    if (e instanceof MicrosoftError)
      return {
        error: e.reconnect
          ? "L'accesso a Microsoft è scaduto: ricollega l'account dalla scheda File."
          : e.isForbidden
            ? "Non hai accesso in scrittura alla cartella Teams del progetto."
            : "SharePoint non ha accettato i file: riprova.",
      };
    console.error(e);
    return { error: "Pubblicazione non riuscita." };
  }
}

// File di supporto (asdp/supporto/): creazione, rinomina o spostamento ed eliminazione dalla scheda
// File. I percorsi arrivano relativi a supporto/ ("note/riunione.md").
export type SupportResult = { error: string | null; href?: string };

const SUPPORT_MESSAGES = {
  ...MESSAGES,
  exists: "Esiste già un file con questo nome in questa cartella.",
  invalid_path: "Nome non valido: usa lettere, numeri, spazi o trattini; le cartelle si separano con «/».",
  not_supported: "Si possono spostare o eliminare solo i file di supporto.",
  unknown_type: "Il file non è nella cartella dei file di supporto.",
};

const relativePath = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .transform((p) => p.replace(/^\/+|\/+$/g, "").replace(/\s*\/\s*/g, "/"))
  .transform((p) => (/\.md$/i.test(p) ? p : `${p}.md`));

async function supportContext(projectId: string) {
  const supabase = await createClient();
  const [{ data: claims }, { data: project }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("projects").select("docs_root").eq("id", projectId).maybeSingle(),
  ]);
  if (!claims || !project) return null;
  const root = `${project.docs_root.replace(/\/?$/, "/")}${SUPPORT_FOLDER}`;
  return { supabase, userId: claims.claims.sub, root, docsRoot: project.docs_root as string };
}

const documentHref = (projectId: string, path: string) =>
  `/progetti/${projectId}/documenti/${path.split("/").map(encodeURIComponent).join("/")}`;

function supportError(e: unknown, fallback: string): SupportResult {
  if (e instanceof DocumentError && e.code === "conflict")
    return { error: "Il file è cambiato dopo che hai aperto la pagina: aggiornala e riprova." };
  if (e instanceof DocumentError)
    return { error: SUPPORT_MESSAGES[e.code as keyof typeof SUPPORT_MESSAGES] ?? fallback };
  console.error(e);
  return { error: fallback };
}

const createSupportSchema = z.object({ projectId: z.guid(), path: relativePath });

export async function createSupportFileAction(input: z.input<typeof createSupportSchema>): Promise<SupportResult> {
  const parsed = createSupportSchema.safeParse(input);
  if (!parsed.success) return { error: SUPPORT_MESSAGES.invalid_path };
  const context = await supportContext(parsed.data.projectId);
  if (!context) return { error: "Sessione scaduta: rifai il login." };
  const path = `${context.root}${parsed.data.path}`;
  if (!validSupportPath(path, context.docsRoot)) return { error: SUPPORT_MESSAGES.invalid_path };
  const title = parsed.data.path.split("/").pop()!.replace(/\.md$/i, "");
  try {
    await createDocument(context.supabase, {
      projectId: parsed.data.projectId,
      path,
      content: `# ${title}\n`,
      via: "app",
      userId: context.userId,
    });
  } catch (e) {
    return supportError(e, "Creazione non riuscita.");
  }
  revalidatePath(`/progetti/${parsed.data.projectId}/file`);
  return { error: null, href: documentHref(parsed.data.projectId, path) };
}

const moveSupportSchema = z.object({
  projectId: z.guid(),
  path: z.string().min(1),
  lastCommitId: z.string().min(1),
  to: relativePath,
});

export async function moveSupportFileAction(input: z.input<typeof moveSupportSchema>): Promise<SupportResult> {
  const parsed = moveSupportSchema.safeParse(input);
  if (!parsed.success) return { error: SUPPORT_MESSAGES.invalid_path };
  const context = await supportContext(parsed.data.projectId);
  if (!context) return { error: "Sessione scaduta: rifai il login." };
  try {
    await moveDocument(context.supabase, {
      projectId: parsed.data.projectId,
      from: parsed.data.path,
      to: `${context.root}${parsed.data.to}`,
      lastCommitId: parsed.data.lastCommitId,
      via: "app",
      userId: context.userId,
    });
  } catch (e) {
    return supportError(e, "Spostamento non riuscito.");
  }
  revalidatePath(`/progetti/${parsed.data.projectId}/file`);
  return { error: null };
}

const deleteSupportSchema = z.object({ projectId: z.guid(), path: z.string().min(1), lastCommitId: z.string().min(1) });

export async function deleteSupportFileAction(input: z.input<typeof deleteSupportSchema>): Promise<SupportResult> {
  const parsed = deleteSupportSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi." };
  const context = await supportContext(parsed.data.projectId);
  if (!context) return { error: "Sessione scaduta: rifai il login." };
  try {
    await deleteDocument(context.supabase, { ...parsed.data, via: "app", userId: context.userId });
  } catch (e) {
    return supportError(e, "Eliminazione non riuscita.");
  }
  revalidatePath(`/progetti/${parsed.data.projectId}/file`);
  return { error: null };
}
