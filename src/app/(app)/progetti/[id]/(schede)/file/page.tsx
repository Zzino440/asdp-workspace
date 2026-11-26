import { Suspense } from "react";
import { notFound } from "next/navigation";
import { microsoftEnabled } from "@/lib/microsoft";
import { loadProject } from "../../project-data";
import { type FilesParams, ProjectFiles } from "../../project-files";

// Scheda File: le cartelle Teams/SharePoint collegate al progetto.
export default function FilePage({ params, searchParams }: PageProps<"/progetti/[id]/file">) {
  return (
    // Suspense propria: Graph è lento e un suo errore non deve bloccare l'intestazione.
    <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento dei file…</p>}>
      <Files params={params} searchParams={searchParams as Promise<FilesParams>} />
    </Suspense>
  );
}

async function Files({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<FilesParams> }) {
  if (!microsoftEnabled()) notFound();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { canManage } = await loadProject(id);
  return <ProjectFiles projectId={id} canManage={canManage} params={query} />;
}
