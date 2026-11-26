import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractText, getDocumentProxy } from "unpdf";
import {
  copyItem,
  createFolder,
  deleteItem,
  downloadUrl,
  getItem,
  graphClient,
  listChildren,
  MicrosoftError,
  moveItem,
  searchFolder,
  uploadSmallFile,
  type DriveItem,
} from "@/lib/microsoft";

// File Teams/SharePoint di un progetto per l'MCP: sempre con l'account Microsoft dell'utente e
// solo dentro una cartella collegata al progetto (project_file_locations, RLS). I percorsi sono
// relativi a quella cartella ("Input cliente/Offerta.docx"); ".." non è ammesso.

export type FilesErrorCode =
  | "not_linked"
  | "no_account"
  | "reconnect"
  | "not_found"
  | "forbidden"
  | "exists"
  | "locked"
  | "invalid_path"
  | "unreadable"
  | "too_large"
  | "unavailable";

export class FilesError extends Error {
  constructor(readonly code: FilesErrorCode) {
    super(code);
  }
}

const MAX_READ_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_CHARS = 150_000;
const TEXT = ["txt", "md", "vtt", "srt", "csv", "tsv", "json", "xml", "html", "log"];
// Formati che SharePoint converte in PDF (?format=pdf).
const OFFICE = ["doc", "docx", "rtf", "odt", "ppt", "pptx", "odp", "xls", "xlsx", "ods"];

const extension = (name: string) => name.split(".").pop()!.toLowerCase();

function toFilesError(e: unknown): unknown {
  if (!(e instanceof MicrosoftError)) return e;
  if (e.reconnect) return new FilesError("reconnect");
  if (e.status === 404) return new FilesError("not_found");
  if (e.status === 403) return new FilesError("forbidden");
  if (e.status === 409) return new FilesError("exists");
  if (e.status === 423) return new FilesError("locked");
  return new FilesError("unavailable");
}

async function guard<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (e) {
    throw toFilesError(e);
  }
}

// Parti del percorso; rifiuta "." e "..", che porterebbero fuori dalla cartella collegata.
function parts(path: string) {
  const list = path.split("/").map((p) => p.trim()).filter(Boolean);
  if (list.some((p) => p === "." || p === "..")) throw new FilesError("invalid_path");
  return list;
}

// Cartella e nome di un elemento (non la cartella collegata stessa), con un nome valido per SharePoint.
function split(path: string) {
  const list = parts(path);
  const name = list.pop();
  if (!name || /["*:<>?\\|]/.test(name) || name.endsWith(".")) throw new FilesError("invalid_path");
  return { folder: list.join("/"), name };
}

const join = (folder: string, name: string) => (folder ? `${folder}/${name}` : name);

const entry = (item: DriveItem, path: string) => ({
  path,
  type: item.folder ? "folder" : "file",
  size: item.folder ? undefined : item.size,
  items: item.folder?.childCount,
  modified: item.lastModifiedDateTime,
  modified_by: item.lastModifiedBy?.user?.displayName,
  web_url: item.webUrl,
});

export async function projectFiles(supabase: SupabaseClient, projectId: string, location?: string) {
  const { data } = await supabase
    .from("project_file_locations")
    .select("label, drive_id, item_id")
    .eq("project_id", projectId)
    .order("created_at");
  const linked = location ? data?.find((l) => l.label.toLowerCase() === location.toLowerCase()) : data?.[0];
  if (!linked) throw new FilesError("not_linked");
  const graph = await guard(() => graphClient(supabase));
  if (!graph) throw new FilesError("no_account");
  const drive: string = linked.drive_id;
  const root: string = linked.item_id;

  const item = (path: string) => getItem(graph, drive, root, parts(path).join("/"));
  const folderAt = async (path: string) => {
    const folder = await item(path);
    if (!folder.folder) throw new FilesError("not_found");
    return folder;
  };

  return {
    location: linked.label as string,

    list: (path = "") =>
      guard(async () => {
        const folder = parts(path).join("/");
        const children = await listChildren(graph, drive, root, folder);
        return children.map((c) => entry(c, join(folder, c.name)));
      }),

    search: (query: string) =>
      guard(async () => (await searchFolder(graph, drive, root, query)).map((r) => entry(r.item, join(r.folder, r.item.name)))),

    // Testo del file: i formati di testo così come sono, PDF e Office (convertiti in PDF) estratti.
    readText: (path: string) =>
      guard(async () => {
        const file = await item(path);
        if (!file.file) throw new FilesError("unreadable");
        if ((file.size ?? 0) > MAX_READ_BYTES) throw new FilesError("too_large");
        const ext = extension(file.name);
        const asPdf = ext === "pdf" || OFFICE.includes(ext);
        if (!asPdf && !TEXT.includes(ext)) throw new FilesError("unreadable");
        const url = await downloadUrl(graph, drive, file.id, OFFICE.includes(ext) ? "pdf" : undefined);
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new FilesError("unavailable");
        let text: string;
        let pages: number | undefined;
        if (asPdf) {
          const pdf = await getDocumentProxy(new Uint8Array(await response.arrayBuffer()));
          const extracted = await extractText(pdf, { mergePages: true });
          text = extracted.text;
          pages = extracted.totalPages;
        } else {
          text = await response.text();
        }
        return {
          ...entry(file, parts(path).join("/")),
          pages,
          truncated: text.length > MAX_CHARS,
          text: text.slice(0, MAX_CHARS),
        };
      }),

    createFolder: (path: string) =>
      guard(async () => {
        const { folder, name } = split(path);
        const parent = await folderAt(folder);
        return entry(await createFolder(graph, drive, parent.id, name), join(folder, name));
      }),

    // Solo file di testo scritti da Claude; un nome già presente non viene sovrascritto.
    uploadText: (path: string, content: string) =>
      guard(async () => {
        const { folder, name } = split(path);
        if (!TEXT.includes(extension(name))) throw new FilesError("unreadable");
        if (Buffer.byteLength(content) > MAX_UPLOAD_BYTES) throw new FilesError("too_large");
        const parent = await folderAt(folder);
        return entry(await uploadSmallFile(graph, drive, parent.id, name, content), join(folder, name));
      }),

    // Sposta e/o rinomina: to è il nuovo percorso completo (cartella + nome).
    move: (from: string, to: string) =>
      guard(async () => {
        split(from);
        const { folder, name } = split(to);
        const [source, parent] = await Promise.all([item(from), folderAt(folder)]);
        return entry(await moveItem(graph, drive, source.id, parent.id, name), join(folder, name));
      }),

    copy: (from: string, toFolder: string) =>
      guard(async () => {
        split(from);
        const [source, parent] = await Promise.all([item(from), folderAt(toFolder)]);
        await copyItem(graph, drive, source.id, parent.id);
        return { path: join(parts(toFolder).join("/"), source.name) };
      }),

    // Nel cestino del sito SharePoint.
    remove: (path: string) =>
      guard(async () => {
        split(path);
        const target = await item(path);
        await deleteItem(graph, drive, target.id);
      }),
  };
}
