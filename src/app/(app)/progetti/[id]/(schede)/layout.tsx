import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { NATURE_LABELS, PHASES, PROJECT_STATUS_LABELS } from "@/lib/labels";
import { microsoftEnabled } from "@/lib/microsoft";
import { AdvancePhaseButton } from "../advance-phase";
import { loadProjectSteps } from "../document-list";
import { loadProject } from "../project-data";
import { ProjectTabs } from "../project-tabs";
import { ReindexButton } from "../reindex-button";
import { StickyHeader } from "../sticky-header";

// Intestazione compatta del progetto e schede Percorso · File · Impostazioni; le pagine
// documento stanno fuori da questo gruppo e hanno la loro intestazione.
export default function ProjectLayout({ children, params }: LayoutProps<"/progetti/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
        <Header params={params} />
      </Suspense>
      {children}
    </div>
  );
}

async function Header({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, canManage } = await loadProject(id);

  return (
    <StickyHeader>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <span className="font-mono text-sm text-muted-foreground">{project.code}</span>
            <Badge variant="secondary">{PROJECT_STATUS_LABELS[project.status]}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{project.client}</span>
            <span aria-hidden>·</span>
            <span>{NATURE_LABELS[project.nature]}</span>
            <span aria-hidden>·</span>
            <span>
              Fase {project.current_phase} · {PHASES[project.current_phase]?.name}
            </span>
            <span aria-hidden>·</span>
            <span>asdp {project.framework_version}</span>
            {canManage && project.current_phase < 4 && (
              <Suspense>
                <AdvancePhase projectId={project.id} currentPhase={project.current_phase} />
              </Suspense>
            )}
          </div>
        </div>
        {canManage && <ReindexButton projectId={project.id} />}
      </div>
      <Suspense fallback={null}>
        <ProjectTabs projectId={project.id} files={microsoftEnabled()} settings={canManage} />
      </Suspense>
    </StickyHeader>
  );
}

// "Passa alla Fase N+1" quando la fase corrente ha documenti attesi e nessun passo aperto.
async function AdvancePhase({ projectId, currentPhase }: { projectId: string; currentPhase: number }) {
  const { mapTypes, open } = await loadProjectSteps(projectId);
  const complete =
    mapTypes.some((t) => t.phase === currentPhase) && !open.some((s) => s.phase === currentPhase);
  if (!complete) return null;
  return <AdvancePhaseButton projectId={projectId} nextPhase={currentPhase + 1} />;
}
