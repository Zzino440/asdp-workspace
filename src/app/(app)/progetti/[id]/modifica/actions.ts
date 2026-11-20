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
};

export async function saveDocumentAction(input: z.input<typeof saveSchema>): Promise<SaveResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi." };

  const supabase = await createClient();
  try {
    const { lastCommitId } = await saveDocument(supabase, { ...parsed.data, via: "app" });
    return { error: null, lastCommitId };
  } catch (e) {
    if (e instanceof DocumentError) return { error: MESSAGES[e.code], conflict: e.code === "conflict" };
    console.error(e);
    return { error: "Salvataggio non riuscito." };
  }
}
