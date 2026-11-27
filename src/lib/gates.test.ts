import { describe, expect, it } from "vitest";
import { gateFor } from "./gates";

describe("gateFor", () => {
  it("restituisce il gate del tipo censito", () => {
    expect(gateFor("T4.1").name).toBe("G1 Backlog approvato");
  });

  it("per tipi sconosciuti o assenti approva senza checklist", () => {
    expect(gateFor("XYZ")).toEqual({ name: null, approver: "chi ha il permesso Approva", checklist: [] });
    expect(gateFor(null).checklist).toEqual([]);
  });
});
