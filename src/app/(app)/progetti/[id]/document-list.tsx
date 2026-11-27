import { cache } from "react";
import { ASDP_ROLES, type AsdpRole, ROLE_LABELS } from "@/lib/labels";
import { nextStep, projectSteps } from "@/lib/project-steps";
import { createClient } from "@/lib/supabase/server";
import { loadProject } from "./project-data";
import { ProjectMap, type StepTurn } from "./project-map";

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
  const { next, behind, parallel } = nextStep(open, currentPhase);

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
      parallel={parallel}
      turn={next ? await stepTurn(projectId, next.code) : null}
      behind={behind.length}
    />
  );
}

// A chi tocca un passo: ai ruoli con permesso di modifica sul tipo di documento (Amministrazione →
// Permessi); se nessuno ce l'ha, a chi approva (che può anche modificare).
async function stepTurn(projectId: string, documentType: string): Promise<StepTurn> {
  const supabase = await createClient();
  const [{ members }, { data: claims }, { data: permissions }] = await Promise.all([
    loadProject(projectId),
    supabase.auth.getClaims(),
    supabase.from("role_permissions").select("role, level").eq("document_type", documentType).in("level", ["edit", "approve"]),
  ]);
  const editors = (permissions ?? []).filter((p) => p.level === "edit");
  const roles = new Set((editors.length > 0 ? editors : (permissions ?? [])).map((p) => p.role as AsdpRole));
  const people = members.filter((m) => m.roles.some((r) => roles.has(r)));
  return {
    mine: people.some((m) => m.user_id === claims?.claims.sub),
    people: people.map((m) => `${m.name} (${m.roles.filter((r) => roles.has(r)).map((r) => ROLE_LABELS[r]).join(", ")})`),
    roles: ASDP_ROLES.filter((r) => roles.has(r)).map((r) => ROLE_LABELS[r]),
  };
}
