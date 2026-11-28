import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { microsoftEnabled } from "@/lib/microsoft";
import { loadProject } from "../../project-data";
import { type FilesParams, ProjectFiles } from "../../project-files";
import { type SupportParams, SupportFiles } from "../../support-files";

type Params = FilesParams & SupportParams & { fonte?: string };

// Scheda File: le cartelle Teams/SharePoint collegate al progetto e i file di supporto della repo
// documenti su GitLab. Senza Microsoft resta solo la seconda.
export default function FilePage({ params, searchParams }: PageProps<"/progetti/[id]/file">) {
  return (
    // Suspense propria: Graph è lento e un suo errore non deve bloccare l'intestazione.
    <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento dei file…</p>}>
      <Files params={params} searchParams={searchParams as Promise<Params>} />
    </Suspense>
  );
}

async function Files({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { project, canManage } = await loadProject(id);
  const teams = microsoftEnabled();
  const gitlab = Boolean(project.gitlab_project_path);
  if (!teams && !gitlab) notFound();
  // Fonte scelta: Teams se c'è (come prima), i file di supporto con ?fonte=supporto, dal link di
  // ritorno di un file di supporto (?supporto=…) o se Microsoft non è attivo.
  const support = gitlab && (!teams || query.fonte === "supporto" || query.supporto !== undefined);
  const base = `/progetti/${id}/file`;

  return (
    <div className="flex flex-col gap-4">
      {teams && gitlab && (
        <div className="flex items-center gap-1">
          <Link
            href={base}
            scroll={false}
            aria-current={!support ? "page" : undefined}
            className={buttonVariants({ variant: support ? "ghost" : "secondary", size: "sm" })}
          >
            Teams
          </Link>
          <Link
            href={`${base}?fonte=supporto`}
            scroll={false}
            aria-current={support ? "page" : undefined}
            className={buttonVariants({ variant: support ? "secondary" : "ghost", size: "sm" })}
          >
            File di supporto
          </Link>
        </div>
      )}
      {support ? (
        <SupportFiles
          projectId={id}
          docsRoot={project.docs_root}
          gitlabPath={project.gitlab_project_path!}
          gitlabBranch={project.gitlab_branch}
          params={query}
          base={teams ? `${base}?fonte=supporto` : base}
        />
      ) : (
        <ProjectFiles projectId={id} canManage={canManage} params={query} />
      )}
    </div>
  );
}
