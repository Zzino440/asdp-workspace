import { describe, expect, it } from "vitest";
import { approverRoles, type Permission, type TeamMember, turnOf, workerRoles } from "./turn";

const permissions: Permission[] = [
  { role: "af", document_type: "T1.4", level: "edit" },
  { role: "tl", document_type: "T1.4", level: "edit" },
  { role: "pm", document_type: "T1.4", level: "approve" },
  { role: "pm", document_type: "T0.1", level: "approve" },
];
const team: TeamMember[] = [
  { user_id: "u-pm", name: "Paola", roles: ["pm"] },
  { user_id: "u-af", name: "Andrea", roles: ["af"] },
  { user_id: "u-dev", name: "Dario", roles: ["developer"] },
];

describe("workerRoles", () => {
  it("dà i ruoli con edit", () => {
    expect([...workerRoles(permissions, "T1.4")].sort()).toEqual(["af", "tl"]);
  });
  it("senza edit ripiega su chi approva", () => {
    expect([...workerRoles(permissions, "T0.1")]).toEqual(["pm"]);
  });
  it("tipo sconosciuto: nessun ruolo", () => {
    expect(workerRoles(permissions, "X").size).toBe(0);
  });
});

describe("turnOf", () => {
  it("riconosce l'utente e nomina le persone con i ruoli", () => {
    const turn = turnOf(team, workerRoles(permissions, "T1.4"), "u-af");
    expect(turn).toEqual({ mine: true, people: ["Andrea (AF)"], roles: ["TL", "AF"] });
  });
  it("non tocca a chi non ha il ruolo", () => {
    expect(turnOf(team, approverRoles(permissions, "T1.4"), "u-dev").mine).toBe(false);
  });
});
