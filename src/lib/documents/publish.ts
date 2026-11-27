import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DocumentError, documentLevel } from "@/lib/documents";
import { type ExportFormat, FORMATS, exportFileName, exportSource } from "@/lib/documents/export";
import { PHASES } from "@/lib/labels";
import { ensureFolderPath, graphClient, uploadFile } from "@/lib/microsoft";

// Pubblicazione su Teams (milestone 6): copie di un documento Approvato nella cartella collegata al
// progetto, in ASDP/<Fase>/, con nome stabile. Ripubblicare sostituisce i file (stesso link, le
// versioni le tiene SharePoint). La fonte resta GitLab.

export class PublishError extends Error {
  constructor(readonly code: "no_account" | "no_folder") {
    super(code);
  }
}

export type Publication = {
  formats: ExportFormat[];
  items: Partial<Record<ExportFormat, { item_id: string; web_url: string }>>;
  folder_web_url: string;
  commit_id: string;
  version: string | null;
  published_at: string;
};

// Cartella della fase ("Fase 1 - Analisi"); "Altri documenti" per i tipi senza fase.
export function phaseFolderName(phase: number | null | undefined) {
  const found = PHASES.find((p) => p.n === phase);
  return found ? `Fase ${found.n} - ${found.name}` : "Altri documenti";
}

async function phaseOf(supabase: SupabaseClient, documentType: string | null) {
  if (!documentType) return null;
  const { data } = await supabase.from("document_types").select("phase").eq("code", documentType).maybeSingle();
  return (data?.phase as number | null) ?? null;
}

export async function publishDocument(
  supabase: SupabaseClient,
  input: { projectId: string; path: string; formats: ExportFormat[]; locationId?: string },
) {
  const data = await exportSource(supabase, input.projectId, input.path);
  if (!data) throw new DocumentError("not_found");
  if ((await documentLevel(supabase, input.projectId, data.documentType)) !== "approve") throw new DocumentError("forbidden");
  if (data.frontMatter.stato !== "Approvato") throw new DocumentError("invalid_state");

  const locations = supabase.from("project_file_locations").select("id, drive_id, item_id").eq("project_id", input.projectId);
  const { data: location } = await (input.locationId ? locations.eq("id", input.locationId) : locations.order("created_at"))
    .limit(1)
    .maybeSingle();
  if (!location) throw new PublishError("no_folder");
  const graph = await graphClient(supabase);
  if (!graph) throw new PublishError("no_account");

  const folder = await ensureFolderPath(graph, location.drive_id, location.item_id, [
    "ASDP",
    phaseFolderName(await phaseOf(supabase, data.documentType)),
  ]);
  const items: Publication["items"] = {};
  for (const format of input.formats) {
    const spec = FORMATS[format];
    const bytes = await spec.render(data.source);
    const item = await uploadFile(
      graph,
      location.drive_id,
      folder.id,
      exportFileName(data.documentType, data.title, format),
      bytes,
      spec.mime,
    );
    items[format] = { item_id: item.id, web_url: item.webUrl };
  }

  const { data: row, error } = await supabase
    .from("document_publications")
    .upsert({
      project_id: input.projectId,
      path: input.path,
      document_type: data.documentType,
      location_id: location.id,
      commit_id: data.lastCommitId,
      version: data.frontMatter.versione_approvata ? String(data.frontMatter.versione_approvata) : null,
      formats: input.formats,
      items,
      folder_web_url: folder.webUrl,
      published_by: (await supabase.auth.getClaims()).data?.claims.sub,
      published_at: new Date().toISOString(),
    })
    .select("formats, items, folder_web_url, commit_id, version, published_at")
    .single<Publication>();
  if (error) throw error;
  return row;
}

// Ultima pubblicazione del documento; outdated se il documento è cambiato dopo.
export async function publicationStatus(supabase: SupabaseClient, projectId: string, path: string, lastCommitId: string) {
  const { data } = await supabase
    .from("document_publications")
    .select("formats, items, folder_web_url, commit_id, version, published_at")
    .eq("project_id", projectId)
    .eq("path", path)
    .maybeSingle<Publication>();
  return data && { ...data, outdated: data.commit_id !== lastCommitId };
}
