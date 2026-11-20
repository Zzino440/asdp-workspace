import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listVersions, readVersion } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

export default function VersioniPage({ params, searchParams }: PageProps<"/progetti/[id]/versioni/[...path]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
      <VersionsView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const VIA_LABELS = { app: "App", mcp: "MCP", git: "Git" };

async function VersionsView({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id, path }, query] = await Promise.all([params, searchParams]);
  const filePath = path.map(decodeURIComponent).join("/");
  const supabase = await createClient();
  const versions = await listVersions(supabase, id, filePath);
  if (!versions || versions.length === 0) notFound();

  const index = Math.max(0, versions.findIndex((v) => v.id === query.v));
  const selected = versions[index];
  const previous = versions[index + 1] ?? null;
  const showText = query.vista === "testo";
  const version = await readVersion(supabase, id, filePath, selected.id, previous?.id ?? null);
  if (!version) notFound();

  const baseHref = `/progetti/${id}/versioni/${path.join("/")}`;
  const hrefFor = (v: string, text: boolean) => `${baseHref}?v=${v}${text ? "&vista=testo" : ""}`;
  const dateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={`/progetti/${id}/documenti/${path.join("/")}`} className="text-sm text-muted-foreground hover:underline">
          ← Torna al documento
        </Link>
        <h1 className="text-2xl font-semibold">Versioni</h1>
        <span className="font-mono text-xs text-muted-foreground">{filePath}</span>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commit</TableHead>
                <TableHead>Messaggio</TableHead>
                <TableHead>Autore</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Canale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((v, i) => (
                <TableRow key={v.id} className={cn(i === index && "bg-accent")}>
                  <TableCell>
                    <Link href={hrefFor(v.id, showText)} className="font-mono text-xs hover:underline">
                      {v.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={hrefFor(v.id, showText)} className="hover:underline">
                      {v.title}
                    </Link>
                    {i === 0 && <span className="ml-2 text-xs text-muted-foreground">(attuale)</span>}
                  </TableCell>
                  <TableCell>{v.authorName}</TableCell>
                  <TableCell>{dateFormat.format(new Date(v.authoredDate))}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{VIA_LABELS[v.via]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-3">
          <CardTitle>
            {selected.id.slice(0, 8)} · {selected.title}
          </CardTitle>
          <div className="ml-auto flex gap-2">
            <Link
              href={hrefFor(selected.id, false)}
              className={buttonVariants({ variant: showText ? "ghost" : "secondary", size: "sm" })}
            >
              Modifiche
            </Link>
            <Link
              href={hrefFor(selected.id, true)}
              className={buttonVariants({ variant: showText ? "secondary" : "ghost", size: "sm" })}
            >
              Testo completo
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {showText ? (
            version.body === null ? (
              <p className="text-sm text-muted-foreground">File non Markdown: anteprima non disponibile.</p>
            ) : (
              <Markdown>{version.body}</Markdown>
            )
          ) : version.diff === null || !previous ? (
            <p className="text-sm text-muted-foreground">Prima versione del documento: nessuna versione precedente.</p>
          ) : (
            <DiffView diff={version.diff} from={previous.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Diff unificato di GitLab: righe aggiunte in verde, rimosse in rosso (token esistenti).
function DiffView({ diff, from }: { diff: string; from: string }) {
  if (diff === "") return <p className="text-sm text-muted-foreground">Nessuna modifica al file in questo commit.</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">Rispetto alla versione {from.slice(0, 8)}</p>
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
    </div>
  );
}
