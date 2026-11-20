import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { documentLevel, readDocument } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";
import { DocumentEditor } from "../document-editor";

export default function ModificaDocumentoPage({ params }: PageProps<"/progetti/[id]/modifica/[...path]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
      <EditView params={params} />
    </Suspense>
  );
}

async function EditView({ params }: { params: Promise<{ id: string; path: string[] }> }) {
  const { id, path } = await params;
  const supabase = await createClient();
  const document = await readDocument(supabase, id, path.map(decodeURIComponent).join("/"));
  if (!document) notFound();
  const level = await documentLevel(supabase, id, document.documentType);
  const viewHref = `/progetti/${id}/documenti/${path.join("/")}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={viewHref} className="text-sm text-muted-foreground hover:underline">
          ← Torna al documento
        </Link>
        <h1 className="text-2xl font-semibold">
          Modifica {String(document.frontMatter.titolo || document.path.split("/").pop())}
        </h1>
        <span className="font-mono text-xs text-muted-foreground">{document.path}</span>
      </div>
      {document.body === null ? (
        <p className="text-sm text-muted-foreground">Si possono modificare solo i file Markdown.</p>
      ) : level !== "edit" && level !== "approve" ? (
        <p className="text-sm text-muted-foreground">Non hai i permessi per modificare questo documento.</p>
      ) : (
        <DocumentEditor
          projectId={id}
          path={document.path}
          viewHref={viewHref}
          frontMatterSource={document.frontMatterSource}
          body={document.body}
          lastCommitId={document.lastCommitId}
        />
      )}
    </div>
  );
}
