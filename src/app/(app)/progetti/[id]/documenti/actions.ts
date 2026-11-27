"use server";

import { z } from "zod";
import { changeApproval, DocumentError, listVersions, saveDocument } from "@/lib/documents";
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
