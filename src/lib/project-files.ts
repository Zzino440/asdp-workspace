import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { extractText, getDocumentProxy } from "unpdf";
import { markdownDocx } from "@/lib/documents/export/docx";
import { type ExcelOperation, editExcel, type NewSheet, newWorkbook, readExcel } from "@/lib/office/excel";
import { OfficeError, openPackage, type Parts, savePackage } from "@/lib/office/package";
import { editPowerPoint, type OutlineSlide, outlinePowerPoint, type PowerPointOperation, readPowerPoint } from "@/lib/office/powerpoint";
import { editWord, readWord, type WordOperation } from "@/lib/office/word";
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
  replaceContent,
  searchFolder,
  uploadSmallFile,
  waitForItem,
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
  | "conflict"
  | "invalid_op"
  | "unavailable";

// detail: cosa correggere (operazione Office non valida, messaggio di Graph).
export class FilesError extends Error {
  constructor(
    readonly code: FilesErrorCode,
    readonly detail?: string,
  ) {
    super(detail ?? code);
  }
}

const MAX_READ_BYTES = 10 * 1024 * 1024;
// docx e pptx si aprono in memoria senza conversione: le presentazioni con immagini sono grandi.
const MAX_OFFICE_BYTES = 50 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_CHARS = 150_000;
const TEXT = ["txt", "md", "vtt", "srt", "csv", "tsv", "json", "xml", "html", "log"];
// Formati che SharePoint converte in PDF (?format=pdf).
const OFFICE = ["doc", "docx", "rtf", "odt", "ppt", "pptx", "odp", "xls", "xlsx", "ods"];
const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
type OfficeKind = keyof typeof MIME;

// Contenuto di un file Office nuovo: Markdown (Word), fogli (Excel) o scaletta di slide (PowerPoint).
export type OfficeContent = { markdown?: string; sheets?: NewSheet[]; slides?: OutlineSlide[] };

const extension = (name: string) => name.split(".").pop()!.toLowerCase();

function toFilesError(e: unknown): unknown {
  if (e instanceof OfficeError) return new FilesError("invalid_op", e.message);
  if (!(e instanceof MicrosoftError)) return e;
  if (e.reconnect) return new FilesError("reconnect");
  if (e.status === 404) return new FilesError("not_found");
  if (e.status === 403) return new FilesError("forbidden");
  if (e.status === 409) return new FilesError("exists");
  if (e.status === 412) return new FilesError("conflict");
  if (e.status === 423) return new FilesError("locked");
  if (e.status === 400) return new FilesError("invalid_op", e.message);
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
// Percorso normalizzato restituito all'MCP.
const normalized = (path: string) => parts(path).join("/");

const entry = (item: DriveItem, path: string) => ({
  path,
  type: item.folder ? "folder" : "file",
  size: item.folder ? undefined : item.size,
  items: item.folder?.childCount,
  modified: item.lastModifiedDateTime,
  modified_by: item.lastModifiedBy?.user?.displayName,
  etag: item.folder ? undefined : item.eTag,
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
  const bytesOf = async (file: DriveItem) => {
    const response = await fetch(await downloadUrl(graph, drive, file.id), { cache: "no-store" });
    if (!response.ok) throw new FilesError("unavailable");
    return new Uint8Array(await response.arrayBuffer());
  };
  // File Office esistente del tipo atteso.
  const officeFile = async (path: string, kind: OfficeKind) => {
    const file = await item(path);
    if (!file.file || extension(file.name) !== kind) throw new FilesError("invalid_op", `Serve un file .${kind}.`);
    return file;
  };
  // Scarica, modifica e ricarica come nuova versione, solo se il file è ancora quello letto (etag).
  const rewrite = async <R extends object>(path: string, kind: "docx" | "pptx", etag: string, change: (pkg: Parts) => R) => {
    const file = await officeFile(path, kind);
    if (file.eTag !== etag) throw new FilesError("conflict");
    if ((file.size ?? 0) > MAX_OFFICE_BYTES) throw new FilesError("too_large");
    const pkg = openPackage(await bytesOf(file));
    const result = change(pkg);
    const saved = await replaceContent(graph, drive, file.id, savePackage(pkg), MIME[kind], etag);
    return { ...entry(saved, normalized(path)), ...result };
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

    // Testo del file: Word a blocchi, Excel per foglio, PowerPoint per slide; i formati di testo così
    // come sono; PDF e gli altri Office (convertiti in PDF) come testo estratto.
    readText: (path: string, options: { sheet?: string; range?: string } = {}) =>
      guard(async () => {
        const file = await item(path);
        if (!file.file) throw new FilesError("unreadable");
        const ext = extension(file.name);
        if (ext === "xlsx") {
          const { text, truncated } = await readExcel(graph, drive, file.id, options);
          return { ...entry(file, normalized(path)), format: "excel", truncated, text };
        }
        if (ext === "docx" || ext === "pptx") {
          if ((file.size ?? 0) > MAX_OFFICE_BYTES) throw new FilesError("too_large");
          const pkg = openPackage(await bytesOf(file));
          const text = ext === "docx" ? readWord(pkg) : readPowerPoint(pkg);
          return {
            ...entry(file, normalized(path)),
            format: ext === "docx" ? "word" : "powerpoint",
            truncated: text.length > MAX_CHARS,
            text: text.slice(0, MAX_CHARS),
          };
        }
        if ((file.size ?? 0) > MAX_READ_BYTES) throw new FilesError("too_large");
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

    // newName: copia con un altro nome ("nuovo file basato su"); si attende che SharePoint la completi.
    copy: (from: string, toFolder: string, newName?: string) =>
      guard(async () => {
        split(from);
        const name = newName ? split(newName).name : undefined;
        const [source, parent] = await Promise.all([item(from), folderAt(toFolder)]);
        // Un elemento con lo stesso nome farebbe fallire la copia e l'attesa troverebbe quello vecchio.
        const existing = await getItem(graph, drive, parent.id, name ?? source.name).catch((e) => {
          if (e instanceof MicrosoftError && e.status === 404) return null;
          throw e;
        });
        if (existing) throw new FilesError("exists");
        await copyItem(graph, drive, source.id, parent.id, name);
        const copy = await waitForItem(graph, drive, parent.id, name ?? source.name);
        return entry(copy, join(normalized(toFolder), copy.name));
      }),

    // File Office nuovo; un nome già presente non viene sovrascritto.
    createOffice: (path: string, content: OfficeContent) =>
      guard(async () => {
        const { folder, name } = split(path);
        const kind = extension(name);
        const title = name.replace(/\.[^.]+$/, "");
        let bytes: Uint8Array;
        if (kind === "docx" && content.markdown !== undefined) {
          bytes = await markdownDocx(unified().use(remarkParse).use(remarkGfm).parse(content.markdown) as Root, title);
        } else if (kind === "xlsx" && content.sheets) {
          bytes = newWorkbook(content.sheets);
        } else if (kind === "pptx" && content.slides?.length) {
          bytes = await outlinePowerPoint(content.slides, title);
        } else {
          throw new FilesError("invalid_op", "Serve un nome .docx con markdown, .xlsx con sheets o .pptx con slides.");
        }
        if (bytes.length > MAX_UPLOAD_BYTES) throw new FilesError("too_large");
        const parent = await folderAt(folder);
        return entry(await uploadSmallFile(graph, drive, parent.id, name, bytes, MIME[kind as OfficeKind]), join(folder, name));
      }),

    editWord: (path: string, etag: string, operations: WordOperation[], track: boolean) =>
      guard(async () => {
        const author = track
          ? ((await graph<{ displayName?: string }>("/me?$select=displayName")).displayName ?? "ASDP Workspace")
          : "";
        return rewrite(path, "docx", etag, (pkg) => editWord(pkg, operations, { track, author }));
      }),

    editPowerPoint: (path: string, etag: string, operations: PowerPointOperation[]) =>
      guard(() => rewrite(path, "pptx", etag, (pkg) => editPowerPoint(pkg, operations))),

    // Excel si modifica sul posto con l'API Workbook (niente etag: Excel gestisce le modifiche concorrenti).
    editExcel: (path: string, operations: ExcelOperation[]) =>
      guard(async () => {
        const file = await officeFile(path, "xlsx");
        const result = await editExcel(graph, drive, file.id, operations);
        return { ...entry(await item(path), normalized(path)), ...result };
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
