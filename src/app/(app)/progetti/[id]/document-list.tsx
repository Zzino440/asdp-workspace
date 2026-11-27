import { cache } from "react";
import { nextStep, projectSteps } from "@/lib/project-steps";
import { createClient } from "@/lib/supabase/server";
import { ProjectMap } from "./project-map";

// Percorso del progetto per la mappa e per il pulsante "Passa alla fase" dell'intestazione
// (cache: una sola lettura per richiesta).
export const loadProjectSteps = cache(async (projectId: string) => projectSteps(await createClient(), projectId));

// Mappa del percorso ASDP.
export async function DocumentList({
  projectId,
  project,
  currentPhase,
}: {
  projectId: string;
  project: { code: string; nature: string; teams: boolean };
  currentPhase: number;
}) {
  const { mapTypes, otherFiles, features, open } = await loadProjectSteps(projectId);
  const { next, behind } = nextStep(open, currentPhase);

  return (
    <ProjectMap
      project={{ code: project.code, nature: project.nature, teams: project.teams }}
      currentPhase={currentPhase}
      types={mapTypes}
      features={features}
      otherFiles={otherFiles}
      next={next}
      behind={behind.length}
    />
  );
}
