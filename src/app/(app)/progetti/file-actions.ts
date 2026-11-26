"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import {
  createFolder,
  createUploadSession,
  deleteItem,
  getItem,
  graphClient,
  itemInFolder,
  listChildren,
  MicrosoftError,
  moveItem,
  renameItem,
} from "@/lib/microsoft";
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

// Scollega l'account Microsoft: l'app cancella il refresh token dell'utente (RLS: solo la propria
// riga). Non lo revoca su Microsoft; il consenso si toglie da myapps.microsoft.com o lo toglie l'IT.
export async function disconnectMicrosoft() {
  const supabase = await createClient();
  await supabase.from("microsoft_accounts").delete().not("user_id", "is", null);
  refresh();
}

// --- Gestione dei file (7b) ---
// Si agisce come l'utente: SharePoint decide se può scrivere. L'app limita solo il dove: la
// cartella deve essere collegata a un progetto di cui l'utente è membro (RLS) e ogni elemento
// deve stare dentro quella cartella.

export type FileResult = { error?: string; uploadUrl?: string; folders?: string[] };

// Nomi validi per SharePoint: niente " * : < > ? / \ |, né spazi o punto in fondo.
const nameSchema = z
  .string()
  .trim()
  .min(1, "Scrivi un nome.")
  .max(200, "Nome troppo lungo.")
  .refine(
    (n) => !/["*:<>?/\\|]/.test(n) && !n.endsWith("."),
    'Il nome non può contenere " * : < > ? / \\ | né finire con un punto.',
  );

async function location(projectId: string, locationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_file_locations")
    .select("drive_id, item_id")
    .eq("id", locationId)
    .eq("project_id", projectId)
    .maybeSingle();
  const graph = data && (await graphClient(supabase));
  if (!data || !graph) throw new MicrosoftError(401, "Account Microsoft non collegato", true);
  return { graph, drive: data.drive_id, root: data.item_id };
}

function failure(e: unknown): FileResult {
  if (!(e instanceof MicrosoftError)) throw e;
  if (e.reconnect) return { error: "Il collegamento a Microsoft è scaduto: ricarica la pagina e ricollega l'account." };
  if (e.status === 409) return { error: "Esiste già un elemento con questo nome." };
  if (e.status === 423) return { error: "Il file è aperto o bloccato in SharePoint: riprova tra poco." };
  if (e.isForbidden) return { error: "Non hai i permessi per questa operazione su Teams." };
  return { error: "Microsoft non risponde: riprova tra poco." };
}

// Esegue un'operazione di Graph; ricarica la card se va a buon fine.
async function run(operation: () => Promise<unknown>): Promise<FileResult> {
  try {
    await operation();
  } catch (e) {
    return failure(e);
  }
  refresh();
  return {};
}

export async function newFolder(projectId: string, locationId: string, folder: string, name: string) {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return run(async () => {
    const { graph, drive, root } = await location(projectId, locationId);
    const parent = await getItem(graph, drive, root, folder);
    await createFolder(graph, drive, parent.id, parsed.data);
  });
}

export async function renameFile(projectId: string, locationId: string, itemId: string, name: string) {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return run(async () => {
    const { graph, drive, root } = await location(projectId, locationId);
    await itemInFolder(graph, drive, root, itemId);
    await renameItem(graph, drive, itemId, parsed.data);
  });
}

// target: percorso della cartella di destinazione relativo a quella collegata ("" = la cartella stessa).
export async function moveFile(projectId: string, locationId: string, itemId: string, target: string) {
  return run(async () => {
    const { graph, drive, root } = await location(projectId, locationId);
    const [, destination] = await Promise.all([
      itemInFolder(graph, drive, root, itemId),
      getItem(graph, drive, root, target),
    ]);
    if (!destination.folder) throw new MicrosoftError(404, "La destinazione non è una cartella");
    await moveItem(graph, drive, itemId, destination.id);
  });
}

export async function deleteFile(projectId: string, locationId: string, itemId: string) {
  return run(async () => {
    const { graph, drive, root } = await location(projectId, locationId);
    await itemInFolder(graph, drive, root, itemId);
    await deleteItem(graph, drive, itemId);
  });
}

// Prepara il caricamento: il browser poi manda il file direttamente a SharePoint (uploadUrl).
export async function startUpload(projectId: string, locationId: string, folder: string, fileName: string) {
  const parsed = nameSchema.safeParse(fileName);
  if (!parsed.success) return { error: `«${fileName}»: ${parsed.error.issues[0].message}` };
  try {
    const { graph, drive, root } = await location(projectId, locationId);
    const parent = await getItem(graph, drive, root, folder);
    return { uploadUrl: await createUploadSession(graph, drive, parent.id, parsed.data) };
  } catch (e) {
    return failure(e);
  }
}

// Sottocartelle di una cartella, per scegliere dove spostare.
export async function listFolders(projectId: string, locationId: string, folder: string): Promise<FileResult> {
  try {
    const { graph, drive, root } = await location(projectId, locationId);
    const children = await listChildren(graph, drive, root, folder);
    return { folders: children.filter((c) => c.folder).map((c) => c.name) };
  } catch (e) {
    return failure(e);
  }
}

// Dopo un caricamento (fatto dal browser) la card si ricarica.
export async function refreshFiles() {
  refresh();
}
