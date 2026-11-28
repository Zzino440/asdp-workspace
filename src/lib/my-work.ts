import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listToApprove } from "@/lib/documents";
import type { AsdpRole } from "@/lib/labels";
import { isDone, phaseProgress } from "@/lib/phase-progress";
import { type MapDoc, nextStep, type NextStep, projectSteps } from "@/lib/project-steps";
import { approverRoles, type StepTurn, type TeamMember, turnOf, workerRoles } from "@/lib/turn";

// Dashboard «Tocca a me»: panoramica personale sui progetti aperti di cui l'utente fa parte.
// Tutto passa dal client dell'utente (RLS); "a chi tocca" segue src/lib/turn.ts. Le approvazioni
// restano in /approvazioni: qui solo il contatore.

export type WorkProject = { id: string; code: string; name: string };
export type WorkDoc = { project: WorkProject; typeName: string; doc: MapDoc };

const DEADLINE_DAYS = 7;

export async function myWork(supabase: SupabaseClient, userId: string) {
  const { data: memberships } = await supabase
    .from("project_members")
    .select("projects(id, code, name, status, current_phase)")
    .eq("user_id", userId);
  // Relazione molti-a-uno: PostgREST restituisce un oggetto, i tipi non generati un array.
  type Row = WorkProject & { status: string; current_phase: number };
  const projects = (memberships ?? [])
    .map((m) => m.projects as unknown as Row | null)
    .filter((p): p is Row => p !== null && p.status !== "chiuso")
    .sort((a, b) => a.name.localeCompare(b.name));
  const ids = projects.map((p) => p.id);

  const [{ data: team }, { data: permissions }, toApprove, steps] = await Promise.all([
    supabase.from("project_members").select("project_id, user_id, roles, profiles(full_name, email)").in("project_id", ids),
    supabase.from("role_permissions").select("role, document_type, level").in("level", ["edit", "approve"]),
    listToApprove(supabase),
    Promise.all(projects.map((p) => projectSteps(supabase, p.id))),
  ]);
  const membersOf = (projectId: string): TeamMember[] =>
    (team ?? [])
      .filter((m) => m.project_id === projectId)
      .map((m) => {
        const profile = m.profiles as unknown as { full_name: string; email: string } | null;
        return { user_id: m.user_id, roles: m.roles as AsdpRole[], name: profile?.full_name || profile?.email || "" };
      });

  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + DEADLINE_DAYS * 86_400_000).toISOString().slice(0, 10);

  const overview: { project: WorkProject; phase: number; ready: number; expected: number; next: NextStep | null; turn: StepTurn | null }[] = [];
  const changesRequested: WorkDoc[] = [];
  const waiting: (WorkDoc & { approvers: StepTurn })[] = [];
  const deadlines: (WorkDoc & { overdue: boolean })[] = [];

  projects.forEach((p, i) => {
    const { mapTypes, features, open } = steps[i];
    const members = membersOf(p.id);
    const project = { id: p.id, code: p.code, name: p.name };
    const { next } = nextStep(open, p.current_phase);
    const { ready, expected } = phaseProgress(mapTypes, features, p.current_phase);
    overview.push({
      project,
      phase: p.current_phase,
      ready,
      expected,
      next,
      turn: next ? turnOf(members, workerRoles(permissions ?? [], next.code), userId) : null,
    });

    for (const type of mapTypes) {
      if (!turnOf(members, workerRoles(permissions ?? [], type.code), userId).mine) continue;
      for (const doc of type.docs) {
        const item = { project, typeName: type.name, doc };
        if (doc.changesRequested) changesRequested.push(item);
        if (doc.state === "Completo")
          waiting.push({ ...item, approvers: turnOf(members, approverRoles(permissions ?? [], type.code), userId) });
        if (!isDone(doc) && doc.deadline && doc.deadline <= soon) deadlines.push({ ...item, overdue: doc.deadline < today });
      }
    }
  });
  deadlines.sort((a, b) => a.doc.deadline!.localeCompare(b.doc.deadline!));

  return { overview, changesRequested, waiting, deadlines, toApprove: toApprove.length };
}
