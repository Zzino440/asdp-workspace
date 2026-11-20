"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { ensureProjectWebhook, indexProject } from "@/lib/documents";
import { ASDP_ROLES } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error: string | null };

const projectSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1),
  client: z.string().trim().min(1),
  nature: z.enum(["greenfield", "evolutiva"]),
  framework_version: z.string().trim().min(1),
  gitlab_project_path: z.string().trim().transform((v) => v || null),
  gitlab_branch: z.string().trim().min(1),
  docs_root: z.string().trim().min(1),
});

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Compila tutti i campi obbligatori." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").insert(parsed.data).select("id").single();
  if (error?.code === "23505") return { error: "Esiste già un progetto con questo codice." };
  if (error?.code === "42501") return { error: "Solo un amministratore può creare progetti." };
  if (error) return { error: "Impossibile creare il progetto." };

  // Un eventuale problema col webhook non blocca la creazione: lo segnala "Reindicizza".
  await ensureProjectWebhook(supabase, data.id);
  redirect(`/progetti/${data.id}`);
}

const teamSchema = z.array(
  // z.guid(): z.uuid() rifiuta UUID validi per Postgres ma senza versione RFC (es. quelli del seed).
  z.object({ user_id: z.guid(), roles: z.array(z.enum(ASDP_ROLES)) }),
);

// Salva il team intero: chi ha almeno un ruolo viene inserito o aggiornato, chi non ne ha più
// viene rimosso. I permessi (admin o PM del progetto) li applica la RLS.
export async function saveTeam(
  projectId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = teamSchema.safeParse(JSON.parse(String(formData.get("team") ?? "[]")));
  if (!parsed.success) return { error: "Dati del team non validi." };

  const keep = parsed.data.filter((m) => m.roles.length > 0);
  const removed = parsed.data.filter((m) => m.roles.length === 0).map((m) => m.user_id);
  const supabase = await createClient();

  if (keep.length > 0) {
    const { data, error } = await supabase
      .from("project_members")
      .upsert(keep.map((m) => ({ project_id: projectId, ...m })))
      .select("user_id");
    if (error || data.length !== keep.length) {
      return { error: "Non hai i permessi per modificare questo team." };
    }
  }
  if (removed.length > 0) {
    const { data, error } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .in("user_id", removed)
      .select("user_id");
    if (error || data.length !== removed.length) {
      return { error: "Non hai i permessi per modificare questo team." };
    }
  }

  refresh();
  return { error: null };
}

export type ReindexResult = { error: string | null; count?: number; warning?: string | null };

// Ricostruisce l'indice dei documenti e ricrea il webhook GitLab se manca. La RLS su
// documents lo permette solo ad admin e PM.
export async function reindexDocuments(projectId: string): Promise<ReindexResult> {
  const supabase = await createClient();
  try {
    const count = await indexProject(supabase, projectId);
    const warning = await ensureProjectWebhook(supabase, projectId);
    refresh();
    return { error: null, count, warning };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Indicizzazione non riuscita." };
  }
}

const repositorySchema = z.object({
  gitlab_path: z.string().trim().min(1),
  role: z.enum(["be", "fe", "altro"]),
  branch: z.string().trim().min(1),
});

// Repo di codice collegate al progetto (admin o PM, via RLS).
export async function addRepository(
  projectId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = repositorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Indica percorso GitLab, ruolo e branch." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_repositories")
    .insert({ project_id: projectId, ...parsed.data });
  if (error?.code === "23505") return { error: "Repo già collegata." };
  if (error) return { error: "Non hai i permessi per modificare le repo del progetto." };
  refresh();
  return { error: null };
}

export async function removeRepository(id: string): Promise<FormState> {
  const supabase = await createClient();
  const { data } = await supabase.from("project_repositories").delete().eq("id", id).select("id");
  if (!data?.length) return { error: "Non hai i permessi per modificare le repo del progetto." };
  refresh();
  return { error: null };
}
