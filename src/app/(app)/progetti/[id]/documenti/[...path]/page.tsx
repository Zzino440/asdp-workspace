import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { History, Pencil } from "lucide-react";
import { DocumentStateBadge } from "@/components/document-state-badge";
import { Markdown } from "@/components/markdown";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { documentLevel, readDocument } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

export default function DocumentoPage({ params }: PageProps<"/progetti/[id]/documenti/[...path]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
      <DocumentView params={params} />
    </Suspense>
  );
}

async function DocumentView({ params }: { params: Promise<{ id: string; path: string[] }> }) {
  const { id, path } = await params;
  const supabase = await createClient();
  const document = await readDocument(supabase, id, path.map(decodeURIComponent).join("/"));
  if (!document) notFound();
  const level = await documentLevel(supabase, id, document.documentType);
  const canEdit = document.body !== null && (level === "edit" || level === "approve");

  const front = document.frontMatter;
  const entries = Object.entries(front).filter(([, value]) => value !== null && value !== "");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={`/progetti/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← Torna al progetto
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{String(front.titolo || document.path.split("/").pop())}</h1>
          <DocumentStateBadge state={front.stato ? String(front.stato) : null} />
          <div className="ml-auto flex gap-2">
            <Link
              href={`/progetti/${id}/versioni/${path.join("/")}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <History />
              Versioni
            </Link>
            {canEdit && (
              <Link
                href={`/progetti/${id}/modifica/${path.join("/")}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Pencil />
                Modifica
              </Link>
            )}
          </div>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {document.path} · {document.lastCommitId.slice(0, 8)}
        </span>
      </div>

      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Frontespizio</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-3">
              {entries.map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1">
                  <dt className="text-xs text-muted-foreground">{key}</dt>
                  <dd className="text-sm">{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          {document.body === null ? (
            <p className="text-sm text-muted-foreground">File non Markdown: anteprima non disponibile.</p>
          ) : (
            <Markdown>{document.body}</Markdown>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
