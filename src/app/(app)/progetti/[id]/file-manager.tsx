"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { ChevronRight, Folder, FolderPlus, MoreHorizontal, MoveRight, Pencil, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
  startUpload,
} from "../file-actions";

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

export function FolderToolbar({ projectId, locationId, folder }: Target & { folder: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList) {
    setUploading(true);
    setError(null);
    const failed: string[] = [];
    for (const [i, file] of [...files].entries()) {
      const label = files.length > 1 ? `${i + 1}/${files.length} ` : "";
      setStatus(`Caricamento ${label}«${file.name}»…`);
      const result = await startUpload(projectId, locationId, folder, file.name);
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
    setError(failed.length ? failed.join(" ") : null);
    setUploading(false);
    if (input.current) input.current.value = "";
    await refreshFiles();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => e.currentTarget.files?.length && upload(e.currentTarget.files)}
      />
      <Button variant="outline" size="sm" disabled={uploading} onClick={() => input.current?.click()}>
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

export function ItemActions({
  projectId,
  locationId,
  item,
}: Target & { item: { id: string; name: string; folder: boolean } }) {
  const [dialog, setDialog] = useState<"rename" | "move" | "delete" | null>(null);
  const close = () => setDialog(null);
  const kind = item.folder ? "la cartella" : "il file";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Altre azioni" title="Altre azioni" />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setDialog("rename")}>
            <Pencil /> Rinomina
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("move")}>
            <MoveRight /> Sposta
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDialog("delete")}>
            <Trash2 /> Elimina
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
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
