import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { DocumentWorkspace } from "../document-workspace";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { documentLevel, listDocuments, listVersions, readDocument, readVersion } from "@/lib/documents";
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
  const [document, versions, documents, { data: types }] = await Promise.all([
    readDocument(supabase, id, filePath),
    listVersions(supabase, id, filePath),
    listDocuments(supabase, id),
    supabase.from("document_types").select("code, phase, sort_order"),
  ]);
  if (!document) notFound();
  const level = await documentLevel(supabase, id, document.documentType);

  const baseHref = `/progetti/${id}/documenti/${path.join("/")}`;
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

  // Altri documenti del progetto, nell'ordine del percorso ASDP (fase, poi tipo).
  const typeOrder = new Map((types ?? []).map((t) => [t.code as string, (t.phase ?? 9) * 1000 + t.sort_order]));
  const siblings = [...documents].sort(
    (a, b) => (typeOrder.get(a.document_type) ?? 99999) - (typeOrder.get(b.document_type) ?? 99999) || a.path.localeCompare(b.path),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link href={`/progetti/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← Torna al progetto
        </Link>
        <span className="font-mono text-xs text-muted-foreground">{document.path}</span>
      </div>
      <DocumentWorkspace
        key={document.lastCommitId}
        projectId={id}
        path={document.path}
        title={String(document.frontMatter.titolo || document.path.split("/").pop())}
        frontMatterSource={document.frontMatterSource}
        body={document.body}
        lastCommitId={document.lastCommitId}
        canEdit={document.body !== null && (level === "edit" || level === "approve")}
        readView={
          document.body === null ? (
            <p className="text-sm text-muted-foreground">File non Markdown: anteprima non disponibile.</p>
          ) : (
            <Markdown>{document.body}</Markdown>
          )
        }
        versionView={versionView}
        aside={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Versioni</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                  {(versions ?? []).map((v, i) => (
                    <li key={v.id}>
                      <Link
                        href={`${baseHref}?v=${v.id}`}
                        className={cn(
                          "flex flex-col rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                          i === selectedIndex && "bg-accent",
                        )}
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
              </CardContent>
            </Card>
            {siblings.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Documenti del progetto</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                    {siblings.map((d) => (
                      <li key={d.path}>
                        <Link
                          href={`/progetti/${id}/documenti/${d.path.split("/").map(encodeURIComponent).join("/")}`}
                          className={cn(
                            "flex items-baseline gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                            d.path === document.path && "bg-accent",
                          )}
                        >
                          {d.document_type && (
                            <span className="shrink-0 font-mono text-xs text-muted-foreground">{d.document_type}</span>
                          )}
                          <span className="truncate">{String(d.front_matter?.titolo || d.path.split("/").pop())}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        }
      />
    </div>
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
      <div className="flex flex-wrap items-center gap-3">
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
