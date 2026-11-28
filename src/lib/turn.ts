import { ASDP_ROLES, type AsdpRole, ROLE_LABELS } from "./labels";

// A chi tocca un documento: ai ruoli con "edit" sul tipo (Amministrazione → Permessi); se nessuno
// ce l'ha, a chi approva (che può anche modificare). Lo usano la scheda «Prossimo passo» del
// Percorso e la Dashboard, così dicono la stessa cosa.

export type Permission = { role: string; document_type: string; level: string };
export type TeamMember = { user_id: string; name: string; roles: AsdpRole[] };
// mine: tocca all'utente; people: persone del team con quei ruoli; roles: i ruoli.
export type StepTurn = { mine: boolean; people: string[]; roles: string[] };

const rolesWith = (permissions: Permission[], documentType: string, level: string) =>
  new Set(permissions.filter((p) => p.document_type === documentType && p.level === level).map((p) => p.role as AsdpRole));

export function workerRoles(permissions: Permission[], documentType: string) {
  const editors = rolesWith(permissions, documentType, "edit");
  return editors.size > 0 ? editors : rolesWith(permissions, documentType, "approve");
}

export const approverRoles = (permissions: Permission[], documentType: string) =>
  rolesWith(permissions, documentType, "approve");

export function turnOf(members: TeamMember[], roles: Set<AsdpRole>, userId: string | undefined): StepTurn {
  const people = members.filter((m) => m.roles.some((r) => roles.has(r)));
  return {
    mine: people.some((m) => m.user_id === userId),
    people: people.map((m) => `${m.name} (${m.roles.filter((r) => roles.has(r)).map((r) => ROLE_LABELS[r]).join(", ")})`),
    roles: ASDP_ROLES.filter((r) => roles.has(r)).map((r) => ROLE_LABELS[r]),
  };
}
