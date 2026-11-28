import { cache } from "react";
import { nextStep, projectSteps } from "@/lib/project-steps";
import { createClient } from "@/lib/supabase/server";
import { type StepTurn, turnOf, workerRoles } from "@/lib/turn";
import { loadProject } from "./project-data";
import { ProjectMap } from "./project-map";

// Percorso del progetto per la mappa e per il pulsante "Passa alla fase" dell'intestazione
// (cache: una sola lettura per richiesta).
export const loadProjectSteps = cache(async (projectId: string) => projectSteps(await createClient(), projectId));

// Mappa del percorso ASDP.
export async function DocumentList({
  projectId,
  project,
  currentPhase,
  isAdmin,
}: {
  projectId: string;
  project: { code: string; nature: string; teams: boolean };
  currentPhase: number;
  isAdmin: boolean;
}) {
  const { mapTypes, otherFiles, features, open } = await loadProjectSteps(projectId);
  const { next, behind } = nextStep(open, currentPhase);

  return (
    <ProjectMap
      projectId={projectId}
      isAdmin={isAdmin}
      project={{ code: project.code, nature: project.nature, teams: project.teams }}
      currentPhase={currentPhase}
      types={mapTypes}
      features={features}
      otherFiles={otherFiles}
      next={next}
      turn={next ? await stepTurn(projectId, next.code) : null}
      behind={behind.length}
    />
  );
}

// A chi tocca il prossimo passo (regola in src/lib/turn.ts).
async function stepTurn(projectId: string, documentType: string): Promise<StepTurn> {
  const supabase = await createClient();
  const [{ members }, { data: claims }, { data: permissions }] = await Promise.all([
    loadProject(projectId),
    supabase.auth.getClaims(),
    supabase.from("role_permissions").select("role, document_type, level").eq("document_type", documentType),
  ]);
  return turnOf(members, workerRoles(permissions ?? [], documentType), claims?.claims.sub);
}
