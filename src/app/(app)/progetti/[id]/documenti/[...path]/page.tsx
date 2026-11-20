import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { DocumentStateBadge } from "@/components/document-state-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readDocument } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

export default function DocumentoPage({ params }: PageProps<"/progetti/[id]/documenti/[...path]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
      <DocumentView params={params} />
    </Suspense>
  );
}

// Stili del Markdown con i token del tema (niente plugin typography).
const markdown: Components = {
  h1: (props) => <h1 className="mt-6 mb-3 text-2xl font-semibold first:mt-0" {...props} />,
  h2: (props) => <h2 className="mt-6 mb-3 text-xl font-semibold" {...props} />,
  h3: (props) => <h3 className="mt-4 mb-2 text-lg font-semibold" {...props} />,
  p: (props) => <p className="my-3 leading-relaxed" {...props} />,
  ul: (props) => <ul className="my-3 list-disc pl-6" {...props} />,
  ol: (props) => <ol className="my-3 list-decimal pl-6" {...props} />,
  blockquote: (props) => <blockquote className="my-3 border-l-2 pl-4 text-muted-foreground" {...props} />,
  a: (props) => <a className="text-primary underline-offset-4 hover:underline" {...props} />,
  code: (props) => <code className="rounded bg-muted px-1 font-mono text-sm" {...props} />,
  hr: () => <hr className="my-6 border-border" />,
  table: (props) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => <th className="border border-border bg-muted px-2 py-1 text-left font-medium" {...props} />,
  td: (props) => <td className="border border-border px-2 py-1 align-top" {...props} />,
};

async function DocumentView({ params }: { params: Promise<{ id: string; path: string[] }> }) {
  const { id, path } = await params;
  const supabase = await createClient();
  const document = await readDocument(supabase, id, path.map(decodeURIComponent).join("/"));
  if (!document) notFound();

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
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdown}>
              {document.body}
            </ReactMarkdown>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
