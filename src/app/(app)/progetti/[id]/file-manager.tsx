"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronRight,
  Download,
  ExternalLink,
  Folder,
  FolderPlus,
  History,
  Link2,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { TableRow } from "@/components/ui/table";
import {
  deleteFile,
  deleteFiles,
  type FileResult,
  listFolders,
  moveFile,
  moveFiles,
  newFolder,
  refreshFiles,
  renameFile,
  startNewVersion,
  startUpload,
} from "../file-actions";
import { VersionsSheet } from "./file-versions";

// Gestione dei file nella card (7b). Agisce come l'utente: se su Teams non può scrivere,
// SharePoint rifiuta e il messaggio compare qui.

type Target = { projectId: string; locationId: string };

// Pezzi multipli di 320 KiB, come chiede Graph per le sessioni di caricamento.
const CHUNK = 320 * 1024 * 10;

// Il file va dal browser direttamente a SharePoint: l'uploadUrl è già autorizzato.
async function sendFile(uploadUrl: string, file: File, onProgress: (sent: number) => void) {
  for (let start = 0; start < file.size || start === 0; start += CHUNK) {
    const end = Math.min(start + CHUNK, file.size);
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Range": `bytes ${start}-${end - 1}/${file.size}` },
      body: file.slice(start, end),
    });
    if (!response.ok) throw new Error(`SharePoint ${response.status}`);
    onProgress(end);
    if (file.size === 0) break;
  }
}

// --- Caricamento: bottone «Carica» e trascinamento dal computer sulla card ---

type Pending = { files: File[]; existing: string[] };

const UploadContext = createContext<{
  pick: () => void;
  busy: boolean;
  status: string | null;
  error: string | null;
} | null>(null);

function useUpload() {
  const context = useContext(UploadContext);
  if (!context) throw new Error("UploadArea mancante");
  return context;
}

// Trascinamento di file dal computer (non di testo o link della pagina).
const hasFiles = (e: DragEvent | React.DragEvent) => e.dataTransfer?.types.includes("Files") ?? false;

const skippedMessage = (names: string[]) =>
  `Cartelle non caricate: ${names.map((n) => `«${n}»`).join(", ")}. Trascina i file che contengono.`;

// Avvolge barra e tabella della cartella aperta: con enabled (cartella, non risultati di ricerca)
// i file trascinati sulla card si caricano lì. Mentre si trascina nella finestra la card mostra
// dove rilasciare; fuori dalla card il rilascio è bloccato (il browser aprirebbe il file).
// fileNames: i file (non le cartelle) già presenti, per chiedere se sostituirli.
export function UploadArea({
  projectId,
  locationId,
  folder,
  folderLabel,
  fileNames,
  enabled,
  children,
}: Target & { folder: string; folderLabel: string; fileNames: string[]; enabled: boolean; children: React.ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // File scelti con nomi già presenti: in attesa di Sostituisci / Mantieni entrambi.
  const [pending, setPending] = useState<Pending | null>(null);
  // dragenter/dragleave scattano anche passando sui figli: contatori invece di booleani.
  const windowDepth = useRef(0);
  const areaDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState(false);
  const busy = uploading || pending !== null;

  useEffect(() => {
    if (!enabled) return;
    const reset = () => {
      windowDepth.current = 0;
      areaDepth.current = 0;
      setDragging(false);
      setOver(false);
    };
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      windowDepth.current += 1;
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      windowDepth.current -= 1;
      if (windowDepth.current <= 0) reset();
    };
    // Fuori dalla card: niente rilascio, così il browser non apre il file al posto dell'app.
    const block = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.type === "dragover" && e.dataTransfer) e.dataTransfer.dropEffect = "none";
      if (e.type === "drop") reset();
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, [enabled]);

  // SharePoint non distingue maiuscole e minuscole nei nomi.
  function choose(files: File[], skipped: string[] = []) {
    setError(skipped.length ? skippedMessage(skipped) : null);
    if (!files.length) return;
    const names = new Set(fileNames.map((n) => n.toLowerCase()));
    const existing = files.filter((f) => names.has(f.name.toLowerCase())).map((f) => f.name);
    if (existing.length) setPending({ files, existing });
    else upload(files, false);
  }

  async function upload(files: File[], replace: boolean) {
    setPending(null);
    setUploading(true);
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      const label = files.length > 1 ? `${i + 1}/${files.length} ` : "";
      setStatus(`Caricamento ${label}«${file.name}»…`);
      const result = await startUpload(projectId, locationId, folder, file.name, replace);
      if (result.error || !result.uploadUrl) {
        failed.push(result.error ?? file.name);
        continue;
      }
      try {
        await sendFile(result.uploadUrl, file, (sent) =>
          setStatus(`Caricamento ${label}«${file.name}» ${Math.round((sent / Math.max(file.size, 1)) * 100)}%`),
        );
      } catch {
        failed.push(`«${file.name}»: caricamento interrotto, riprova.`);
      }
    }
    setStatus(null);
    // Un avviso sulle cartelle saltate resta visibile se non ci sono altri errori.
    if (failed.length) setError(failed.join(" "));
    setUploading(false);
    await refreshFiles();
  }

  function drop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    windowDepth.current = 0;
    areaDepth.current = 0;
    setDragging(false);
    setOver(false);
    if (busy) return;
    // Le cartelle arrivano come voci senza contenuto: si riconoscono dall'entry.
    const files: File[] = [];
    const skipped: string[] = [];
    for (const item of [...e.dataTransfer.items]) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (item.webkitGetAsEntry()?.isDirectory) skipped.push(file?.name ?? "cartella");
      else if (file) files.push(file);
    }
    choose(files, skipped);
  }

  const area = enabled
    ? {
        onDragEnter: (e: React.DragEvent) => {
          if (!hasFiles(e)) return;
          areaDepth.current += 1;
          setOver(true);
        },
        onDragLeave: (e: React.DragEvent) => {
          if (!hasFiles(e)) return;
          areaDepth.current -= 1;
          if (areaDepth.current <= 0) setOver(false);
        },
        onDragOver: (e: React.DragEvent) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = busy ? "none" : "copy";
        },
        onDrop: drop,
      }
    : {};
  const ready = over && !busy;

  return (
    <UploadContext.Provider value={{ pick: () => input.current?.click(), busy, status, error }}>
      <div className="relative flex flex-col gap-4" {...area}>
        {children}
        {enabled && dragging && (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute -inset-2 z-20 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-center backdrop-blur-[2px] transition-colors",
              ready ? "border-primary bg-primary/15" : "border-border bg-background/70",
            )}
          >
            <Upload className={cn("size-8", ready ? "text-primary" : "text-muted-foreground")} />
            <p className="font-medium">
              {busy ? "Attendi la fine del caricamento in corso" : over ? "Rilascia per caricare" : "Trascina qui per caricare"}
            </p>
            {!busy && <p className="text-sm text-muted-foreground">in «{folderLabel}»</p>}
          </div>
        )}
      </div>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.currentTarget.files ?? [])];
          e.currentTarget.value = "";
          if (files.length) choose(files);
        }}
      />
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pending?.existing.length === 1
                ? `«${pending.existing[0]}» esiste già`
                : `${pending?.existing.length} file esistono già`}
            </DialogTitle>
          </DialogHeader>
          {pending && pending.existing.length > 1 && (
            <p className="text-sm">{pending.existing.map((n) => `«${n}»`).join(", ")}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Sostituisci carica una nuova versione: nome e link restano, SharePoint tiene la versione precedente.
            Mantieni entrambi crea una copia con un numero nel nome.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Annulla
            </Button>
            <Button variant="outline" onClick={() => pending && upload(pending.files, false)}>
              Mantieni entrambi
            </Button>
            <Button onClick={() => pending && upload(pending.files, true)}>Sostituisci</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UploadContext.Provider>
  );
}

export function FolderToolbar({ projectId, locationId, folder }: Target & { folder: string }) {
  const { pick, busy, status, error } = useUpload();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={pick} title="Oppure trascina i file sulla tabella">
        <Upload /> Carica
      </Button>
      <NameDialog
        title="Nuova cartella"
        submitLabel="Crea"
        trigger={
          <>
            <FolderPlus /> Nuova cartella
          </>
        }
        onSubmit={(name) => newFolder(projectId, locationId, folder, name)}
      />
      {status && <span className="text-sm text-muted-foreground">{status}</span>}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

type RowItem = { id: string; name: string; folder: boolean; driveId: string; webUrl: string };
type Action = "versions" | "version" | "rename" | "move" | "delete";

// Il ⋯ della riga apre le stesse azioni del tasto destro: le legge da ItemRow.
const ItemContext = createContext<{ item: RowItem; open: (action: Action) => void } | null>(null);

type MenuItemProps = { onClick: () => void; variant?: "default" | "destructive"; children: React.ReactNode };

// Voci comuni a ⋯ e tasto destro, con i componenti del menu che le mostra.
function ActionItems({
  item,
  open,
  Item,
  Separator,
}: {
  item: RowItem;
  open: (action: Action) => void;
  Item: React.ComponentType<MenuItemProps>;
  Separator: React.ComponentType;
}) {
  return (
    <>
      {!item.folder && (
        <>
          <Item onClick={() => open("versions")}>
            <History /> Cronologia versioni
          </Item>
          <Item onClick={() => open("version")}>
            <Upload /> Carica nuova versione
          </Item>
        </>
      )}
      <Item onClick={() => open("rename")}>
        <Pencil /> Rinomina
      </Item>
      <Item onClick={() => open("move")}>
        <MoveRight /> Sposta
      </Item>
      <Separator />
      <Item variant="destructive" onClick={() => open("delete")}>
        <Trash2 /> Elimina
      </Item>
    </>
  );
}

export function ItemActions() {
  const context = useContext(ItemContext);
  if (!context) throw new Error("ItemRow mancante");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Altre azioni" title="Altre azioni" />}>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <ActionItems {...context} Item={DropdownMenuItem} Separator={DropdownMenuSeparator} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Riga di un file o di una cartella: tasto destro come su SharePoint (Apri, Scarica, Copia link
// e le azioni del ⋯). openHref: la cartella nella card; i file si aprono in Office web.
export function ItemRow({
  projectId,
  locationId,
  item,
  openHref,
  className,
  children,
}: Target & { item: RowItem; openHref?: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Action | null>(null);
  const close = () => setDialog(null);
  const kind = item.folder ? "la cartella" : "il file";
  const download = `/api/microsoft/download?drive=${encodeURIComponent(item.driveId)}&item=${encodeURIComponent(item.id)}`;

  return (
    <ItemContext.Provider value={{ item, open: setDialog }}>
      {/* I dialoghi stanno fuori dal trigger: il tasto destro dentro un dialogo non riapre il menu. */}
      <ContextMenu>
        <ContextMenuTrigger render={<TableRow />} className={cn("data-popup-open:bg-muted", className)}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem
            onClick={() =>
              item.folder && openHref ? router.push(openHref, { scroll: false }) : window.open(item.webUrl, "_blank", "noreferrer")
            }
          >
            {item.folder ? <Folder /> : <ExternalLink />} Apri
          </ContextMenuItem>
          {!item.folder && (
            <>
              <ContextMenuItem onClick={() => window.open(download, "_self")}>
                <Download /> Scarica
              </ContextMenuItem>
              <ContextMenuItem onClick={() => navigator.clipboard.writeText(item.webUrl)}>
                <Link2 /> Copia link
              </ContextMenuItem>
            </>
          )}
          <ContextMenuSeparator />
          <ActionItems item={item} open={setDialog} Item={ContextMenuItem} Separator={ContextMenuSeparator} />
        </ContextMenuContent>
      </ContextMenu>

      {dialog === "versions" && (
        <VersionsSheet projectId={projectId} locationId={locationId} item={item} onClose={close} />
      )}
      {dialog === "version" && (
        <NewVersionDialog projectId={projectId} locationId={locationId} item={item} onClose={close} />
      )}
      <NameDialog
        open={dialog === "rename"}
        onOpenChange={(open) => !open && close()}
        title={`Rinomina ${kind}`}
        submitLabel="Rinomina"
        defaultValue={item.name}
        onSubmit={(name) => renameFile(projectId, locationId, item.id, name)}
      />
      {dialog === "move" && (
        <MoveDialog
          projectId={projectId}
          locationId={locationId}
          title={`Sposta «${item.name}»`}
          onMove={(target) => moveFile(projectId, locationId, item.id, target)}
          onClose={close}
        />
      )}
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={close}
        title={`Eliminare ${kind} «${item.name}»?`}
        description={`Va nel cestino del sito SharePoint del Team, da dove si può recuperare.${item.folder ? " Con la cartella si eliminano anche i file che contiene." : ""}`}
        onConfirm={() => deleteFile(projectId, locationId, item.id)}
      />
    </ItemContext.Provider>
  );
}

// Nuova versione di un file: il file scelto ne sostituisce il contenuto, nome e link restano.
// Stessa estensione obbligatoria, altrimenti per esempio un PDF finirebbe in un .docx.
function NewVersionDialog({
  projectId,
  locationId,
  item,
  onClose,
}: Target & { item: { id: string; name: string }; onClose: () => void }) {
  const dot = item.name.lastIndexOf(".");
  const extension = dot > 0 ? item.name.slice(dot).toLowerCase() : "";
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload() {
    if (!file) return;
    if (extension && !file.name.toLowerCase().endsWith(extension)) {
      return setError(`Scegli un file ${extension}: il nome resta «${item.name}».`);
    }
    setUploading(true);
    setError(null);
    const result = await startNewVersion(projectId, locationId, item.id);
    try {
      if (result.error || !result.uploadUrl) throw new Error(result.error ?? "Caricamento non riuscito.");
      await sendFile(result.uploadUrl, file, (sent) =>
        setStatus(`Caricamento ${Math.round((sent / Math.max(file.size, 1)) * 100)}%`),
      );
    } catch {
      setStatus(null);
      setUploading(false);
      return setError(result.error ?? "Caricamento interrotto, riprova.");
    }
    await refreshFiles();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(value) => !value && !uploading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova versione di «{item.name}»</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Il file scelto sostituisce il contenuto: nome e link restano, SharePoint tiene la versione precedente nella
          cronologia delle versioni.
        </p>
        <Input
          type="file"
          accept={extension || undefined}
          aria-label="File"
          disabled={uploading}
          onChange={(e) => {
            setError(null);
            setFile(e.currentTarget.files?.[0] ?? null);
          }}
        />
        {status && <p className="text-sm text-muted-foreground">{status}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" disabled={uploading} onClick={onClose}>
            Annulla
          </Button>
          <Button disabled={!file || uploading} onClick={upload}>
            {uploading ? "Attendi…" : "Carica"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Selezione multipla: checkbox sulle righe, barra con le azioni di gruppo ---

type SelectableItem = { id: string; name: string; folder: boolean };

const SelectionContext = createContext<{
  items: SelectableItem[];
  selected: SelectableItem[];
  isSelected: (id: string) => boolean;
  toggle: (id: string, checked: boolean, range: boolean) => void;
  setAll: (checked: boolean) => void;
  clear: () => void;
} | null>(null);

function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) throw new Error("FileSelection mancante");
  return context;
}

// Va rimontato (key) quando cambia cartella o ricerca: la selezione non segue la navigazione.
export function FileSelection({ items, children }: { items: SelectableItem[]; children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const anchor = useRef<string | null>(null);
  // Dopo un ricaricamento restano selezionati solo gli elementi ancora presenti.
  const selected = items.filter((i) => ids.has(i.id));

  const toggle = (id: string, checked: boolean, range: boolean) => {
    const from = items.findIndex((i) => i.id === anchor.current);
    const to = items.findIndex((i) => i.id === id);
    // Maiuscolo+clic: stessa scelta su tutte le righe tra l'ultima cliccata e questa.
    const affected = range && from >= 0 ? items.slice(Math.min(from, to), Math.max(from, to) + 1).map((i) => i.id) : [id];
    setIds((current) => {
      const next = new Set(current);
      for (const a of affected) {
        if (checked) next.add(a);
        else next.delete(a);
      }
      return next;
    });
    anchor.current = id;
  };

  return (
    <SelectionContext.Provider
      value={{
        items,
        selected,
        isSelected: (id) => ids.has(id),
        toggle,
        setAll: (checked) => setIds(new Set(checked ? items.map((i) => i.id) : [])),
        clear: () => setIds(new Set()),
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function SelectAllCheckbox() {
  const { items, selected, setAll } = useSelection();
  const all = items.length > 0 && selected.length === items.length;
  return (
    <Checkbox
      aria-label="Seleziona tutto"
      disabled={items.length === 0}
      checked={all}
      indeterminate={selected.length > 0 && !all}
      onCheckedChange={(checked) => setAll(checked)}
    />
  );
}

export function RowCheckbox({ id, name }: { id: string; name: string }) {
  const { isSelected, toggle } = useSelection();
  const shift = useRef(false);
  return (
    <Checkbox
      aria-label={`Seleziona «${name}»`}
      checked={isSelected(id)}
      onPointerDown={(e) => (shift.current = e.shiftKey)}
      onKeyDown={() => (shift.current = false)}
      onCheckedChange={(checked) => toggle(id, checked, shift.current)}
    />
  );
}

// Con almeno un elemento selezionato prende il posto della barra (children) sopra la tabella.
export function SelectionBar({ projectId, locationId, children }: Target & { children?: React.ReactNode }) {
  const { selected, clear } = useSelection();
  const [dialog, setDialog] = useState<"move" | "delete" | null>(null);
  const close = () => setDialog(null);
  if (selected.length === 0) return children;

  const ids = selected.map((i) => i.id);
  const label = selected.length === 1 ? `«${selected[0].name}»` : `${selected.length} elementi`;
  const done = (result: FileResult) => {
    if (!result.error) clear();
    return result;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" size="icon-sm" aria-label="Deseleziona" title="Deseleziona" onClick={clear}>
        <X />
      </Button>
      <span className="text-sm font-medium">
        {selected.length === 1 ? "1 elemento selezionato" : `${selected.length} elementi selezionati`}
      </span>
      <Button variant="outline" size="sm" onClick={() => setDialog("move")}>
        <MoveRight /> Sposta
      </Button>
      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDialog("delete")}>
        <Trash2 /> Elimina
      </Button>

      {dialog === "move" && (
        <MoveDialog
          projectId={projectId}
          locationId={locationId}
          title={`Sposta ${label}`}
          onMove={async (target) => done(await moveFiles(projectId, locationId, ids, target))}
          onClose={close}
        />
      )}
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={close}
        title={`Eliminare ${label}?`}
        description={`Va${selected.length === 1 ? "" : "nno"} nel cestino del sito SharePoint del Team, da dove si può recuperare.${selected.some((i) => i.folder) ? " Con le cartelle si eliminano anche i file che contengono." : ""}`}
        onConfirm={async () => done(await deleteFiles(projectId, locationId, ids))}
      />
    </div>
  );
}

// Dialogo con un campo nome: aperto da un trigger o controllato dall'esterno.
function NameDialog({
  title,
  submitLabel,
  defaultValue = "",
  trigger,
  open,
  onOpenChange,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  defaultValue?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (name: string) => Promise<FileResult>;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isOpen = open ?? ownOpen;
  const setOpen = (value: boolean) => {
    setError(null);
    if (onOpenChange) onOpenChange(value);
    else setOwnOpen(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={<Button variant="outline" size="sm" />}>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) =>
            startTransition(async () => {
              const result = await onSubmit(String(formData.get("name")));
              if (result.error) setError(result.error);
              else setOpen(false);
            })
          }
          className="flex flex-col gap-3"
        >
          <Input name="name" defaultValue={defaultValue} required maxLength={200} autoFocus aria-label="Nome" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Attendi…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: () => Promise<FileResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setError(null);
        if (!value) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await onConfirm();
                if (result.error) setError(result.error);
                else onClose();
              })
            }
          >
            {pending ? "Attendi…" : "Elimina"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Scelta della cartella di destinazione, navigando dentro la cartella collegata.
function MoveDialog({
  projectId,
  locationId,
  title,
  onMove,
  onClose,
}: Target & { title: string; onMove: (target: string) => Promise<FileResult>; onClose: () => void }) {
  const [path, setPath] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Spostare una cartella dentro se stessa lo rifiuta SharePoint (messaggio d'errore).
  const open = useCallback(
    (next: string[]) =>
      startTransition(async () => {
        setError(null);
        const result = await listFolders(projectId, locationId, next.join("/"));
        if (result.error) return setError(result.error);
        setPath(next);
        setFolders(result.folders ?? []);
      }),
    [projectId, locationId],
  );

  useEffect(() => open([]), [open]);

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <nav aria-label="Destinazione" className="flex flex-wrap items-center gap-1 text-sm">
          <button type="button" className="font-medium hover:underline" onClick={() => open([])}>
            Cartella del progetto
          </button>
          {path.map((name, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="size-3.5 text-muted-foreground" />
              <button type="button" className="hover:underline" onClick={() => open(path.slice(0, i + 1))}>
                {name}
              </button>
            </span>
          ))}
        </nav>
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {folders?.map((name) => (
            <li key={name}>
              <button
                type="button"
                className="flex items-center gap-2 text-sm hover:underline disabled:opacity-50"
                disabled={pending}
                onClick={() => open([...path, name])}
              >
                <Folder className="size-4 text-muted-foreground" />
                {name}
              </button>
            </li>
          ))}
          {folders?.length === 0 && <li className="text-sm text-muted-foreground">Nessuna sottocartella.</li>}
        </ul>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button
            disabled={pending || folders === null}
            onClick={() =>
              startTransition(async () => {
                const result = await onMove(path.join("/"));
                if (result.error) setError(result.error);
                else onClose();
              })
            }
          >
            Sposta qui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
