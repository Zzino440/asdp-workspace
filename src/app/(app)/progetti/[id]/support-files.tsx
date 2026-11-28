import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import { FileIcon, SortHead } from "@/components/file-table";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { documentLevel, listDocuments } from "@/lib/documents";
import { SUPPORT_FOLDER, SUPPORT_TYPE } from "@/lib/document-type";
import { createClient } from "@/lib/supabase/server";
import { fullDateTime, modifiedLabel } from "@/lib/time";
import { gitlabHref } from "./project-data";
import { NewSupportFile, SupportFileActions } from "./support-actions";

export type SupportParams = { supporto?: string; ordina?: string; verso?: string };

type Row = {
  name: string;
  folder: boolean;
  // Percorso completo nella repo (file) o relativo a supporto/ (cartella).
  path: string;
  lastCommitId?: string;
  count?: number;
  modifiedAt: string;
  modifiedBy: string | null;
};

// File di supporto del progetto: Markdown liberi nella cartella supporto/ della repo documenti,
// fuori dal flusso ASDP. Elenco dall'indice (nessuna chiamata a GitLab); le cartelle sono quelle
// dei percorsi dei file, come in git.
export async function SupportFiles({
  projectId,
  docsRoot,
  gitlabPath,
  gitlabBranch,
  params,
  base,
}: {
  projectId: string;
  docsRoot: string;
  gitlabPath: string;
  gitlabBranch: string;
  params: SupportParams;
  // URL della scheda con la fonte scelta: i link aggiungono solo cartella e ordinamento.
  base: string;
}) {
  const supabase = await createClient();
  const [documents, level, { data: events }] = await Promise.all([
    listDocuments(supabase, projectId),
    documentLevel(supabase, projectId, SUPPORT_TYPE),
    supabase
      .from("document_events")
      .select("path, author_name, created_at")
      .eq("project_id", projectId)
      .eq("document_type", SUPPORT_TYPE)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const canEdit = level === "edit" || level === "approve";
  const root = `${docsRoot.replace(/\/?$/, "/")}${SUPPORT_FOLDER}`;
  const folder = (params.supporto ?? "").replace(/^\/+|\/+$/g, "");
  const prefix = folder ? `${folder}/` : "";

  // Ultimo salvataggio di ogni file (attività dell'app e push): autore e data.
  const lastEvent = new Map<string, { author: string; at: string }>();
  for (const e of events ?? []) if (!lastEvent.has(e.path)) lastEvent.set(e.path, { author: e.author_name, at: e.created_at });

  const files = documents
    .filter((d) => d.document_type === SUPPORT_TYPE && d.path.startsWith(root))
    .map((d) => {
      const event = lastEvent.get(d.path);
      return {
        path: d.path,
        relative: d.path.slice(root.length),
        lastCommitId: d.last_commit_id,
        modifiedAt: event?.at ?? d.indexed_at,
        modifiedBy: event?.author ?? null,
      };
    });

  // Contenuto della cartella corrente: i file diretti e una riga per sottocartella.
  const folders = new Map<string, Row>();
  const rows: Row[] = [];
  for (const f of files.filter((f) => f.relative.startsWith(prefix))) {
    const rest = f.relative.slice(prefix.length);
    const slash = rest.indexOf("/");
    if (slash < 0) {
      rows.push({ name: rest, folder: false, path: f.path, lastCommitId: f.lastCommitId, modifiedAt: f.modifiedAt, modifiedBy: f.modifiedBy });
      continue;
    }
    const name = rest.slice(0, slash);
    const current = folders.get(name);
    if (!current) {
      folders.set(name, { name, folder: true, path: `${prefix}${name}`, count: 1, modifiedAt: f.modifiedAt, modifiedBy: f.modifiedBy });
    } else {
      current.count! += 1;
      if (f.modifiedAt > current.modifiedAt) Object.assign(current, { modifiedAt: f.modifiedAt, modifiedBy: f.modifiedBy });
    }
  }
  rows.push(...folders.values());

  const sortKey = params.ordina === "nome" || params.ordina === "modificato" ? params.ordina : null;
  const desc = sortKey !== null && params.verso === "desc";
  rows.sort((a, b) => {
    if (a.folder !== b.folder) return a.folder ? -1 : 1;
    const order =
      sortKey === "modificato"
        ? a.modifiedAt.localeCompare(b.modifiedAt)
        : a.name.localeCompare(b.name, "it", { numeric: true, sensitivity: "base" });
    return desc ? -order : order;
  });

  const href = (query: Record<string, string | undefined>) => {
    const search = new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => Boolean(e[1])));
    const rest = search.toString();
    return rest ? `${base}${base.includes("?") ? "&" : "?"}${rest}` : base;
  };
  const folderHref = (path: string) => href({ supporto: path || undefined });
  const documentHref = (path: string) => `/progetti/${projectId}/documenti/${path.split("/").map(encodeURIComponent).join("/")}`;
  const sortHead = (key: "nome" | "modificato", label: string, className?: string) => (
    <SortHead
      label={label}
      className={className}
      active={sortKey === key}
      desc={desc}
      href={(sort) =>
        href({ supporto: folder || undefined, ordina: sort.reset ? undefined : key, verso: sort.desc ? "desc" : undefined })
      }
    />
  );
  const segments = folder.split("/").filter(Boolean);
  const gitlab = gitlabHref(`${gitlabPath}/-/tree/${gitlabBranch}/${root}${folder}`);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Cartella" className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm">
          <Link href={folderHref("")} scroll={false} className="font-medium hover:underline">
            File di supporto
          </Link>
          {segments.map((name, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="size-3.5 text-muted-foreground" />
              <Link href={folderHref(segments.slice(0, i + 1).join("/"))} scroll={false} className="hover:underline">
                {name}
              </Link>
            </span>
          ))}
        </nav>
        {canEdit && <NewSupportFile projectId={projectId} folder={folder} />}
        {gitlab && (
          <a href={gitlab} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ExternalLink /> Apri in GitLab
          </a>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Note, checklist e appunti in Markdown nella repo documenti ({root}), fuori dal flusso ASDP: niente stato né
        approvazione. Li modifica ogni membro del progetto, anche Claude.
      </p>

      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            {sortHead("nome", "Nome")}
            <TableHead className="hidden w-44 lg:table-cell">Modificato da</TableHead>
            {sortHead("modificato", "Modificato", "hidden w-36 sm:table-cell")}
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.path}>
              <TableCell>
                <Link
                  href={row.folder ? folderHref(row.path) : documentHref(row.path)}
                  scroll={!row.folder}
                  title={row.name}
                  className="flex items-center gap-2 hover:underline"
                >
                  <FileIcon item={row} />
                  <span className="truncate">{row.name}</span>
                  {row.folder && <span className="shrink-0 text-xs text-muted-foreground">{row.count} file</span>}
                </Link>
              </TableCell>
              <TableCell className="hidden truncate text-muted-foreground lg:table-cell">{row.modifiedBy ?? "—"}</TableCell>
              <TableCell className="hidden truncate text-muted-foreground sm:table-cell" title={fullDateTime(row.modifiedAt)}>
                {modifiedLabel(row.modifiedAt)}
              </TableCell>
              <TableCell>
                {!row.folder && canEdit && (
                  <SupportFileActions
                    projectId={projectId}
                    path={row.path}
                    relative={row.path.slice(root.length)}
                    lastCommitId={row.lastCommitId!}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                {folder ? "Cartella vuota." : "Ancora nessun file di supporto."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
