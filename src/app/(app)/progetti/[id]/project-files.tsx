import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Download,
  ExternalLink,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Presentation,
} from "lucide-react";
import { cn } from "cn";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type DriveItem,
  getItem,
  graphClient,
  listChildren,
  MicrosoftError,
  searchFolder,
} from "@/lib/microsoft";
import { createClient } from "@/lib/supabase/server";
import { disconnectMicrosoft } from "../file-actions";
import { CopyLinkButton } from "./copy-link-button";
import { FileSearch } from "./file-search";
import {
  FileSelection,
  FolderToolbar,
  ItemActions,
  ItemRow,
  RowCheckbox,
  SelectAllCheckbox,
  SelectionBar,
  UploadArea,
} from "./file-manager";

export type FilesParams = {
  file?: string;
  cartella?: string;
  cerca?: string;
  errore?: string;
  ordina?: string;
  verso?: string;
};

type SortKey = "nome" | "modificato" | "dimensione";

// Cartelle sempre prima dei file; dentro ciascun gruppo l'ordine scelto.
function sortRows<T extends { item: DriveItem }>(rows: T[], key: SortKey, desc: boolean) {
  const value = (i: DriveItem) =>
    key === "modificato" ? i.lastModifiedDateTime : key === "dimensione" ? (i.folder?.childCount ?? i.size ?? 0) : i.name;
  return [...rows].sort((a, b) => {
    if (Boolean(a.item.folder) !== Boolean(b.item.folder)) return a.item.folder ? -1 : 1;
    const x = value(a.item);
    const y = value(b.item);
    const order =
      typeof x === "number" && typeof y === "number"
        ? x - y
        : String(x).localeCompare(String(y), "it", { numeric: true, sensitivity: "base" });
    return desc ? -order : order;
  });
}

// Icona per tipo di file, dall'estensione.
export function FileIcon({ item }: { item: DriveItem }) {
  if (item.folder) return <Folder className="size-4 shrink-0 text-muted-foreground" />;
  const ext = item.name.split(".").pop()?.toLowerCase() ?? "";
  const Icon = ["doc", "docx", "pdf", "txt", "md", "rtf"].includes(ext)
    ? FileText
    : ["xls", "xlsx", "csv"].includes(ext)
      ? FileSpreadsheet
      : ["ppt", "pptx"].includes(ext)
        ? Presentation
        : ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)
          ? FileImage
          : File;
  return <Icon className="size-4 shrink-0 text-muted-foreground" />;
}

const formatSize = (bytes = 0) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });

// Scheda "File": le cartelle Teams/SharePoint collegate al progetto, lette con l'account
// Microsoft dell'utente. Mostra solo quelle cartelle (non tutto Teams). Un errore di Microsoft
// resta nella card e non blocca la pagina del progetto.
export async function ProjectFiles({
  projectId,
  canManage,
  params,
}: {
  projectId: string;
  canManage: boolean;
  params: FilesParams;
}) {
  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("project_file_locations")
    .select("id, label, drive_id, item_id, web_url")
    .eq("project_id", projectId)
    .order("created_at");

  const base = `/progetti/${projectId}/file`;
  const href = (query: Record<string, string | undefined>) => {
    const search = new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => Boolean(e[1])));
    return `${base}?${search}`;
  };
  const linkHref = `${base}/collega`;
  const connect = (label: string) => (
    // <a> e non <Link>: la route imposta un cookie e reindirizza, non va precaricata.
    <a href={`/api/microsoft/login?next=${encodeURIComponent(base)}`} className={buttonVariants({ className: "w-fit" })}>
      {label}
    </a>
  );
  const message = (text: string, action?: React.ReactNode) => (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );

  if (!locations?.length) {
    return message(
      "Nessuna cartella di Teams collegata a questo progetto.",
      canManage && (
        <Link href={linkHref} className={buttonVariants({ variant: "outline" })}>
          Collega una cartella di Teams
        </Link>
      ),
    );
  }

  const location = locations.find((l) => l.id === params.file) ?? locations[0];
  const folder = params.cartella ?? "";
  const query = params.cerca?.trim() ?? "";

  // Dati da Graph; gli errori diventano un messaggio nella card.
  let data:
    | { kind: "folder"; current: DriveItem; items: DriveItem[] }
    | { kind: "search"; results: { item: DriveItem; folder: string }[] };
  let error: string | null = null;
  let account: string | null = null;
  try {
    const graph = await graphClient(supabase);
    if (!graph) {
      return message(
        "Per vedere i file di Teams collega il tuo account Microsoft: vedrai solo i file a cui hai già accesso.",
        connect("Collega account Microsoft"),
      );
    }
    // Nome dell'account in parallelo ai file: serve alla riga "Microsoft: … · Scollega".
    const me = graph<{ displayName: string }>("/me?$select=displayName");
    if (query) {
      const [results, { displayName }] = await Promise.all([
        searchFolder(graph, location.drive_id, location.item_id, query),
        me,
      ]);
      data = { kind: "search", results };
      account = displayName;
    } else {
      const [current, items, { displayName }] = await Promise.all([
        getItem(graph, location.drive_id, location.item_id, folder),
        listChildren(graph, location.drive_id, location.item_id, folder),
        me,
      ]);
      data = { kind: "folder", current, items };
      account = displayName;
    }
  } catch (e) {
    if (!(e instanceof MicrosoftError)) throw e;
    if (e.reconnect) return message("Il collegamento a Microsoft è scaduto.", connect("Ricollega account Microsoft"));
    data = { kind: "search", results: [] };
    error = e.isForbidden
      ? "Non hai accesso a questa cartella su Teams, oppure è stata spostata. Chiedi al PM di aggiungerti al Team o di ricollegarla."
      : "Microsoft non risponde: riprova tra poco.";
  }

  const segments = folder.split("/").filter(Boolean);
  const openUrl = data.kind === "folder" ? data.current.webUrl : location.web_url;

  // Senza ordinamento scelto: per nome, nessuna colonna evidenziata.
  const sortKey: SortKey | null =
    params.ordina === "nome" || params.ordina === "modificato" || params.ordina === "dimensione" ? params.ordina : null;
  const desc = sortKey !== null && params.verso === "desc";
  const rows = sortRows(
    data.kind === "folder" ? data.items.map((item) => ({ item, folder })) : data.results,
    sortKey ?? "nome",
    desc,
  );
  // Intestazione ordinabile, a tre stati: crescente → decrescente → nessun ordinamento.
  const sortHead = (key: SortKey, label: string, className?: string) => {
    const active = sortKey === key;
    const reset = active && desc;
    const Icon = !active ? ArrowUpDown : desc ? ArrowDown : ArrowUp;
    return (
      <TableHead className={className} aria-sort={active ? (desc ? "descending" : "ascending") : undefined}>
        <Link
          href={href({
            file: location.id,
            cartella: folder || undefined,
            cerca: query || undefined,
            ordina: reset ? undefined : key,
            verso: active && !desc ? "desc" : undefined,
          })}
          scroll={false}
          title={reset ? "Togli ordinamento" : active ? "Ordina decrescente" : "Ordina crescente"}
          className={cn(
            "inline-flex items-center gap-1 hover:text-foreground",
            !active && "text-muted-foreground",
          )}
        >
          {label}
          <Icon className={cn("size-3.5", !active && "opacity-50")} />
        </Link>
      </TableHead>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {params.errore && (
        <Alert variant="destructive">
          <AlertDescription>{params.errore}</AlertDescription>
        </Alert>
      )}

      {/* Cartelle collegate */}
      <div className="flex flex-wrap items-center gap-1 border-b pb-3">
        {locations.map((l) => (
          <Link
            key={l.id}
            href={href({ file: l.id })}
            scroll={false}
            aria-current={l.id === location.id ? "page" : undefined}
            className={buttonVariants({ variant: l.id === location.id ? "secondary" : "ghost", size: "sm" })}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Percorso, ricerca, apertura in SharePoint */}
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Percorso" className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm">
          <Link href={href({ file: location.id })} scroll={false} className="font-medium hover:underline">
            {location.label}
          </Link>
          {segments.map((name, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="size-3.5 text-muted-foreground" />
              <Link
                href={href({ file: location.id, cartella: segments.slice(0, i + 1).join("/") })}
                scroll={false}
                className="hover:underline"
              >
                {name}
              </Link>
            </span>
          ))}
          {query && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <ChevronRight className="size-3.5" />
              Risultati per «{query}»
            </span>
          )}
        </nav>
        <FileSearch base={base} locationId={location.id} query={query} />
        <a href={openUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
          <ExternalLink /> Apri in SharePoint
        </a>
      </div>

      {error ? (
        message(error)
      ) : (
        <FileSelection
          key={`${location.id}/${folder}/${query}`}
          items={rows.map(({ item }) => ({ id: item.id, name: item.name, folder: Boolean(item.folder) }))}
        >
        <UploadArea
          projectId={projectId}
          locationId={location.id}
          folder={folder}
          folderLabel={segments.at(-1) ?? location.label}
          fileNames={rows.filter(({ item }) => !item.folder).map(({ item }) => item.name)}
          enabled={data.kind === "folder"}
        >
        <SelectionBar projectId={projectId} locationId={location.id}>
          {data.kind === "folder" && <FolderToolbar projectId={projectId} locationId={location.id} folder={folder} />}
        </SelectionBar>
        {/* Altezza massima pari allo spazio sotto l'intestazione: la tabella scorre al suo interno. */}
        <div className="[&>[data-slot=table-container]]:max-h-[max(16rem,calc(100dvh-var(--project-header-h)-18rem))] [&>[data-slot=table-container]]:overflow-y-auto">
        {/* Layout fisso: le colonne hanno larghezze fisse, Nome prende il resto e i testi lunghi
            si troncano, così le azioni restano visibili senza scorrere in orizzontale. Sugli
            schermi stretti si nascondono le colonne meno importanti. */}
        <Table className="table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_var(--border)]">
            <TableRow>
              <TableHead className="w-8">
                <SelectAllCheckbox />
              </TableHead>
              {sortHead("nome", "Nome")}
              {data.kind === "search" && <TableHead className="hidden w-48 md:table-cell">Cartella</TableHead>}
              <TableHead className="hidden w-44 lg:table-cell">Modificato da</TableHead>
              {sortHead("modificato", "Modificato", "hidden w-32 sm:table-cell")}
              {sortHead("dimensione", "Dimensione", "hidden w-28 text-right md:table-cell")}
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(
              ({ item, folder: parent }) => (
                <ItemRow
                  key={item.id}
                  projectId={projectId}
                  locationId={location.id}
                  item={{
                    id: item.id,
                    name: item.name,
                    folder: Boolean(item.folder),
                    driveId: location.drive_id,
                    webUrl: item.webUrl,
                  }}
                  openHref={
                    item.folder
                      ? href({ file: location.id, cartella: parent ? `${parent}/${item.name}` : item.name })
                      : undefined
                  }
                  className="has-data-checked:bg-muted/50"
                >
                  <TableCell className="w-8">
                    <RowCheckbox id={item.id} name={item.name} />
                  </TableCell>
                  <TableCell>
                    {item.folder ? (
                      <Link
                        href={href({ file: location.id, cartella: parent ? `${parent}/${item.name}` : item.name })}
                        scroll={false}
                        title={item.name}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <FileIcon item={item} />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    ) : (
                      <a
                        href={item.webUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={item.name}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <FileIcon item={item} />
                        <span className="truncate">{item.name}</span>
                      </a>
                    )}
                  </TableCell>
                  {data.kind === "search" && (
                    <TableCell className="hidden truncate md:table-cell">
                      <Link
                        href={href({ file: location.id, cartella: parent })}
                        scroll={false}
                        title={parent || location.label}
                        className="text-muted-foreground hover:underline"
                      >
                        {parent || location.label}
                      </Link>
                    </TableCell>
                  )}
                  <TableCell className="hidden truncate text-muted-foreground lg:table-cell">
                    {item.lastModifiedBy?.user?.displayName ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {formatDate(item.lastModifiedDateTime)}
                  </TableCell>
                  <TableCell className="hidden text-right text-muted-foreground md:table-cell">
                    {item.folder ? `${item.folder.childCount} elementi` : formatSize(item.size)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      <div className={cn("flex gap-0.5", item.folder && "invisible")}>
                        <a
                        href={`/api/microsoft/download?drive=${location.drive_id}&item=${item.id}`}
                        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                        aria-label="Scarica"
                        title="Scarica"
                      >
                        <Download />
                      </a>
                        <CopyLinkButton url={item.webUrl} />
                      </div>
                      <ItemActions />
                    </div>
                  </TableCell>
                </ItemRow>
              ),
            )}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  {query ? "Nessun file trovato in questa cartella." : "Cartella vuota."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
        </UploadArea>
        </FileSelection>
      )}

      {/* Account Microsoft: visibile anche con un errore, quando serve poterlo scollegare. */}
      <form action={disconnectMicrosoft} className="flex items-center gap-1 text-xs text-muted-foreground">
        Microsoft: {account ?? "account collegato"} ·
        <Button
          type="submit"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground"
          title="L'app dimentica il tuo accesso a Microsoft; i file su Teams non cambiano"
        >
          Scollega
        </Button>
      </form>
    </div>
  );
}
