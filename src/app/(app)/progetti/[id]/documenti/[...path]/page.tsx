import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, CircleHelp } from "lucide-react";
import { cn } from "cn";
import { DocumentWorkspace } from "../document-workspace";
import { ExportMenu } from "../publish-actions";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { documentLevel, listDocuments, listToApprove, listVersions, readDocument, readVersion } from "@/lib/documents";
import { phaseFolderName, publicationStatus } from "@/lib/documents/publish";
import { SUPPORT_FOLDER, SUPPORT_TYPE } from "@/lib/document-type";
import { gateFor } from "@/lib/gates";
import { guidaHrefForType } from "@/lib/guida";
import { PHASES } from "@/lib/labels";
import { microsoftEnabled } from "@/lib/microsoft";
import { answersPrompt } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";

export default function DocumentoPage({ params, searchParams }: PageProps<"/progetti/[id]/documenti/[...path]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
      <DocumentView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const VIA_LABELS = { app: "App", mcp: "MCP", git: "Git" };
const dateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" });

// Pallino di stato nell'albero (token --state-* di DESIGN.md).
const STATE_DOT: Record<string, string> = {
  "Da fare": "bg-(--state-todo-border)",
  "In corso": "bg-(--state-progress-border)",
  Completo: "bg-(--state-complete-border)",
  Approvato: "bg-(--state-approved-border)",
};

type DocType = {
  code: string;
  name: string;
  phase: number | null;
  sort_order: number;
  per_feature: boolean;
  skill_name: string | null;
};

async function DocumentView({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id, path }, query] = await Promise.all([params, searchParams]);
  const filePath = path.map(decodeURIComponent).join("/");
  const supabase = await createClient();
  const [document, versions, documents, { data: typeRows }, { data: project }] = await Promise.all([
    readDocument(supabase, id, filePath),
    listVersions(supabase, id, filePath),
    listDocuments(supabase, id),
    supabase.from("document_types").select("code, name, phase, sort_order, per_feature, skill_name").order("sort_order"),
    supabase.from("projects").select("name, code").eq("id", id).maybeSingle(),
  ]);
  if (!document) notFound();
  const [level, publication, { data: locations }] = await Promise.all([
    documentLevel(supabase, id, document.documentType),
    publicationStatus(supabase, id, document.path, document.lastCommitId),
    supabase.from("project_file_locations").select("id, label").eq("project_id", id).order("created_at"),
  ]);
  // Dopo Approva o Richiedi modifiche (?esito=…): il prossimo documento della coda.
  const esito = query.esito === "approvato" || query.esito === "modifiche" ? query.esito : null;
  const next = esito
    ? (await listToApprove(supabase)).find((d) => !(d.project_id === id && d.path === document.path))
    : undefined;
  const types = (typeRows ?? []) as DocType[];
  const type = types.find((t) => t.code === document.documentType) ?? null;

  const hrefOf = (p: string) => `/progetti/${id}/documenti/${p.split("/").map(encodeURIComponent).join("/")}`;
  const baseHref = hrefOf(document.path);
  const selectedIndex = versions?.findIndex((v) => v.id === query.v) ?? -1;
  const versionView =
    versions && selectedIndex >= 0 ? (
      <VersionView
        projectId={id}
        filePath={filePath}
        versions={versions}
        index={selectedIndex}
        showText={query.vista === "testo"}
        baseHref={baseHref}
      />
    ) : null;

  // Titolo: frontespizio, poi il primo titolo del testo, poi il nome del tipo o del file.
  const firstHeading = /^# +(.+?)\s*$/m.exec((document.body ?? "").trimStart().split("\n")[0] ?? "")?.[1] ?? null;
  const title = String(document.frontMatter.titolo || firstHeading || type?.name || document.path.split("/").pop());
  const latest = versions?.[0];

  // Pubblica su Teams: documento Approvato, livello approve, funzione Microsoft attiva e cartella collegata.
  // Flusso ASDP (stato, approvazione, gate, D[N]) solo per i tipi con una skill: allegati, file di
  // supporto e file non riconosciuti si leggono e si modificano e basta.
  const inFlow = Boolean(type?.skill_name);
  const support = document.documentType === SUPPORT_TYPE;
  // Cartella del file dentro supporto/ ("note/riunioni"), per tornare lì dalla scheda File.
  const supportFolder = support
    ? document.path.slice(document.path.indexOf(SUPPORT_FOLDER) + SUPPORT_FOLDER.length, document.path.lastIndexOf("/") + 1).replace(/\/$/, "")
    : "";
  const canPublish =
    inFlow && microsoftEnabled() && level === "approve" && document.frontMatter.stato === "Approvato" && (locations ?? []).length > 0;
  const isMarkdown = document.body !== null;
  const canEdit = document.body !== null && !document.frontMatterError && (level === "edit" || level === "approve");

  const docTitle = (d: (typeof documents)[number]) =>
    String(d.front_matter?.titolo || (types.find((t) => t.code === d.document_type && !t.per_feature)?.name ?? d.path.split("/").pop()));

  return (
    <DocumentWorkspace
      key={document.lastCommitId}
      projectId={id}
      path={document.path}
      title={title}
      hideFirstHeading={firstHeading !== null && title.startsWith(firstHeading)}
      frontMatterSource={document.frontMatterSource}
      frontMatterError={document.frontMatterError}
      body={document.body}
      lastCommitId={document.lastCommitId}
      canEdit={canEdit}
      canApprove={inFlow && level === "approve"}
      inFlow={inFlow}
      gate={gateFor(document.documentType)}
      outcome={
        esito && {
          esito,
          next: next
            ? {
                title: String(next.front_matter?.titolo || next.path.split("/").pop()),
                project: (next.projects as unknown as { name: string } | null)?.name ?? "",
                href: `/progetti/${next.project_id}/documenti/${next.path.split("/").map(encodeURIComponent).join("/")}`,
              }
            : null,
        }
      }
      readView={
        document.body === null ? (
          <p className="text-sm text-muted-foreground">File non Markdown: anteprima non disponibile.</p>
        ) : (
          <Markdown
            answersPrompt={
              project && type?.skill_name
                ? answersPrompt(project, { name: type.name, skill: type.skill_name, docPath: document.path })
                : undefined
            }
            // Nell'Analisi Funzionale le D[N] sono copiate dal consolidato: si risponde lì.
            answerable={inFlow && canEdit && document.documentType !== "T1.4"}
          >
            {document.body}
          </Markdown>
        )
      }
      versionView={versionView}
      updated={latest ? `Aggiornato il ${dateFormat.format(new Date(latest.authoredDate))} da ${latest.authorName}` : null}
      breadcrumb={
        <nav aria-label="Percorso" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href={`/progetti/${id}`}
            aria-label={`Torna al progetto ${project?.name ?? ""}`.trim()}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 font-medium text-foreground")}
          >
            <ArrowLeft />
            {project?.name ?? "Progetto"}
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          {support ? (
            <Link
              href={`/progetti/${id}/file?fonte=supporto${supportFolder ? `&supporto=${encodeURIComponent(supportFolder)}` : ""}`}
              className="hover:text-foreground hover:underline"
            >
              File di supporto
            </Link>
          ) : (
            <span>{type?.phase != null ? `Fase ${type.phase} · ${PHASES[type.phase]?.name}` : "Altri file"}</span>
          )}
          {type && !support && (
            <>
              <ChevronRight className="size-3.5" aria-hidden />
              <span aria-current="page" className="text-foreground">
                {type.code} {type.name}
              </span>
              {guidaHrefForType(type.code) && (
                <Link
                  href={guidaHrefForType(type.code)!}
                  className="ml-2 inline-flex items-center gap-1 hover:text-foreground hover:underline"
                >
                  <CircleHelp className="size-3.5" aria-hidden />
                  Cos&apos;è questo documento
                </Link>
              )}
            </>
          )}
        </nav>
      }
      tree={
        <div className="flex flex-col gap-4 text-sm">
          {PHASES.map((phase) => (
            <div key={phase.n} className="flex flex-col gap-0.5">
              <span className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                {phase.n} · {phase.name}
              </span>
              {types
                .filter((t) => t.phase === phase.n)
                .flatMap((t) => {
                  const docs = documents.filter((d) => d.document_type === t.code);
                  if (docs.length === 0)
                    return t.per_feature
                      ? []
                      : [
                          <span key={t.code} className="flex items-center gap-2 px-2 py-1 text-muted-foreground/60">
                            <span className="size-2 shrink-0 rounded-full border border-current" />
                            <span className="truncate">{t.name}</span>
                          </span>,
                        ];
                  return docs.map((d) => (
                    <Link
                      key={d.path}
                      href={hrefOf(d.path)}
                      aria-current={d.path === document.path ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted",
                        d.path === document.path && "bg-accent font-medium",
                      )}
                    >
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          STATE_DOT[String(d.front_matter?.stato)] ?? "border border-muted-foreground",
                        )}
                      />
                      <span className="truncate">{docTitle(d)}</span>
                    </Link>
                  ));
                })}
            </div>
          ))}
          {documents.some((d) => !types.some((t) => t.code === d.document_type)) && (
            <div className="flex flex-col gap-0.5">
              <span className="px-2 pb-1 text-xs font-medium text-muted-foreground">Altri file</span>
              {documents
                .filter((d) => !types.some((t) => t.code === d.document_type))
                .map((d) => (
                  <Link
                    key={d.path}
                    href={hrefOf(d.path)}
                    className={cn("truncate rounded-md px-2 py-1 hover:bg-muted", d.path === document.path && "bg-accent font-medium")}
                  >
                    {docTitle(d)}
                  </Link>
                ))}
            </div>
          )}
        </div>
      }
      exportMenu={
        isMarkdown ? (
          <ExportMenu
            projectId={id}
            path={document.path}
            publish={canPublish ? { locations: locations ?? [] } : null}
            publication={publication}
            phaseFolder={phaseFolderName(type?.phase)}
          />
        ) : null
      }
      history={
        <ol className="flex flex-col gap-1">
          {(versions ?? []).map((v, i) => (
            <li key={v.id}>
              <Link
                href={`${baseHref}?v=${v.id}`}
                className={cn("flex flex-col rounded-md px-2 py-1.5 text-sm hover:bg-muted", i === selectedIndex && "bg-accent")}
              >
                <span className="truncate">
                  {v.title}
                  {i === 0 && <span className="text-muted-foreground"> · attuale</span>}
                </span>
                <span className="text-xs text-muted-foreground">
                  {v.authorName} · {dateFormat.format(new Date(v.authoredDate))} · {VIA_LABELS[v.via]}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      }
    />
  );
}


async function VersionView(props: {
  projectId: string;
  filePath: string;
  versions: NonNullable<Awaited<ReturnType<typeof listVersions>>>;
  index: number;
  showText: boolean;
  baseHref: string;
}) {
  const selected = props.versions[props.index];
  const previous = props.versions[props.index + 1] ?? null;
  const supabase = await createClient();
  const version = await readVersion(supabase, props.projectId, props.filePath, selected.id, previous?.id ?? null);
  if (!version) notFound();
  const hrefFor = (text: boolean) => `${props.baseHref}?v=${selected.id}${text ? "&vista=testo" : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-(--doc-header-h) z-10 flex flex-wrap items-center gap-3 border-b bg-card py-2">
        <span className="font-medium">{selected.title}</span>
        <Badge variant="secondary">{VIA_LABELS[selected.via]}</Badge>
        <div className="ml-auto flex gap-2">
          <Link href={hrefFor(false)} className={buttonVariants({ variant: props.showText ? "ghost" : "secondary", size: "sm" })}>
            Modifiche
          </Link>
          <Link href={hrefFor(true)} className={buttonVariants({ variant: props.showText ? "secondary" : "ghost", size: "sm" })}>
            Testo completo
          </Link>
          <Link href={props.baseHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Torna al testo attuale
          </Link>
        </div>
      </div>
      {props.showText ? (
        version.body === null ? (
          <p className="text-sm text-muted-foreground">File non Markdown: anteprima non disponibile.</p>
        ) : (
          <Markdown>{version.body}</Markdown>
        )
      ) : version.diff === null || !previous ? (
        <p className="text-sm text-muted-foreground">Prima versione del documento: nessuna versione precedente.</p>
      ) : (
        <DiffView diff={version.diff} />
      )}
    </div>
  );
}

// Diff unificato di GitLab: righe aggiunte in verde, rimosse in rosso (token esistenti).
function DiffView({ diff }: { diff: string }) {
  if (diff === "") return <p className="text-sm text-muted-foreground">Nessuna modifica al file in questo commit.</p>;
  return (
    <pre className="overflow-x-auto rounded-md border font-mono text-xs leading-relaxed">
      {diff
        .replace(/\n$/, "")
        .split("\n")
        .map((line, i) => (
          <div
            key={i}
            className={cn(
              "px-3 whitespace-pre-wrap",
              line.startsWith("+") && "bg-(--state-approved) text-(--state-approved-foreground)",
              line.startsWith("-") && "bg-destructive/10 text-destructive",
              (line.startsWith("@@") || line.startsWith("\\")) && "bg-muted text-muted-foreground",
            )}
          >
            {line || " "}
          </div>
        ))}
    </pre>
  );
}
