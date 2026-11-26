import Link from "next/link";
import Form from "next/form";
import {
  ChevronRight,
  Download,
  ExternalLink,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Presentation,
  Search,
} from "lucide-react";
import { cn } from "cn";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { unlinkFolder } from "../file-actions";
import { CopyLinkButton } from "./copy-link-button";

export type FilesParams = { file?: string; cartella?: string; cerca?: string; errore?: string };

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

// Card "File di progetto": le cartelle Teams/SharePoint collegate al progetto, lette con l'account
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

  const base = `/progetti/${projectId}`;
  const href = (query: Record<string, string | undefined>) => {
    const search = new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => Boolean(e[1])));
    return `${base}?${search}`;
  };
  const linkHref = `${base}/file/collega`;
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
  try {
    const graph = await graphClient(supabase);
    if (!graph) {
      return message(
        "Per vedere i file di Teams collega il tuo account Microsoft: vedrai solo i file a cui hai già accesso.",
        connect("Collega account Microsoft"),
      );
    }
    if (query) {
      data = { kind: "search", results: await searchFolder(graph, location.drive_id, location.item_id, query) };
    } else {
      const [current, items] = await Promise.all([
        getItem(graph, location.drive_id, location.item_id, folder),
        listChildren(graph, location.drive_id, location.item_id, folder),
      ]);
      data = { kind: "folder", current, items };
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
        {canManage && (
          <div className="ml-auto flex gap-1">
            <Link href={linkHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Collega cartella
            </Link>
            <form action={unlinkFolder.bind(null, projectId, location.id)}>
              <Button type="submit" variant="ghost" size="sm" title="Scollega dal progetto (su Teams non cambia niente)">
                Scollega «{location.label}»
              </Button>
            </form>
          </div>
        )}
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
        <Form action={base} scroll={false} className="flex items-center gap-1">
          <input type="hidden" name="file" value={location.id} />
          <Input name="cerca" defaultValue={query} placeholder="Cerca in questa cartella" className="h-8 w-56" />
          <Button type="submit" variant="outline" size="icon" aria-label="Cerca">
            <Search />
          </Button>
        </Form>
        <a href={openUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
          <ExternalLink /> Apri in SharePoint
        </a>
      </div>

      {error ? (
        message(error)
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              {data.kind === "search" && <TableHead>Cartella</TableHead>}
              <TableHead>Modificato da</TableHead>
              <TableHead>Modificato</TableHead>
              <TableHead className="text-right">Dimensione</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.kind === "folder" ? data.items.map((item) => ({ item, folder })) : data.results).map(
              ({ item, folder: parent }) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-96">
                    {item.folder ? (
                      <Link
                        href={href({ file: location.id, cartella: parent ? `${parent}/${item.name}` : item.name })}
                        scroll={false}
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
                        className="flex items-center gap-2 hover:underline"
                      >
                        <FileIcon item={item} />
                        <span className="truncate">{item.name}</span>
                      </a>
                    )}
                  </TableCell>
                  {data.kind === "search" && (
                    <TableCell>
                      <Link
                        href={href({ file: location.id, cartella: parent })}
                        scroll={false}
                        className="text-muted-foreground hover:underline"
                      >
                        {parent || location.label}
                      </Link>
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">
                    {item.lastModifiedBy?.user?.displayName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(item.lastModifiedDateTime)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.folder ? `${item.folder.childCount} elementi` : formatSize(item.size)}
                  </TableCell>
                  <TableCell>
                    <div className={cn("flex justify-end gap-0.5", item.folder && "invisible")}>
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
                  </TableCell>
                </TableRow>
              ),
            )}
            {(data.kind === "folder" ? data.items : data.results).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  {query ? "Nessun file trovato in questa cartella." : "Cartella vuota."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
