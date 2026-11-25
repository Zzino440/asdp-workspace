"use server";

import { z } from "zod";
import { DocumentError, saveDocument } from "@/lib/documents";
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
};

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
    if (e instanceof DocumentError) return { error: MESSAGES[e.code as keyof typeof MESSAGES], conflict: e.code === "conflict" };
    console.error(e);
    return { error: "Salvataggio non riuscito." };
  }
}
