"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { getItem, graphClient } from "@/lib/microsoft";
import { createClient } from "@/lib/supabase/server";

const linkSchema = z.object({
  drive: z.string().min(1),
  item: z.string().min(1),
  path: z.string(),
  label: z.string().trim().min(1).max(60),
});

// Collega al progetto la cartella scelta (PM o admin, via RLS). Id e link li rilegge Graph con
// l'account dell'utente: si collega solo una cartella che lui vede davvero.
export async function linkFolder(projectId: string, formData: FormData) {
  const parsed = linkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/progetti/${projectId}/file/collega?errore=${encodeURIComponent("Scrivi un nome per la cartella.")}`);
  const { drive, item, path, label } = parsed.data;

  const supabase = await createClient();
  const graph = await graphClient(supabase);
  if (!graph) redirect(`/progetti/${projectId}/file/collega`);
  const folder = await getItem(graph, drive, item, path);

  const { data, error } = await supabase
    .from("project_file_locations")
    .insert({
      project_id: projectId,
      label,
      drive_id: folder.parentReference.driveId,
      item_id: folder.id,
      web_url: folder.webUrl,
    })
    .select("id")
    .single();
  if (error) {
    const message = error.code === "23505" ? "Questa cartella è già collegata." : "Solo il PM può collegare cartelle.";
    redirect(`/progetti/${projectId}/file/collega?errore=${encodeURIComponent(message)}`);
  }
  redirect(`/progetti/${projectId}?file=${data.id}`);
}

// Scollega una cartella dal progetto: su Teams non cambia niente.
export async function unlinkFolder(projectId: string, locationId: string) {
  const supabase = await createClient();
  await supabase.from("project_file_locations").delete().eq("id", locationId).eq("project_id", projectId);
  refresh();
}
