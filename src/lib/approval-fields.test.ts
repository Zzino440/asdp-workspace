import { describe, expect, it } from "vitest";
import { changesApproval, withdrawsApproval } from "./approval-fields";

const approved = {
  stato: "Approvato",
  approvato_da: "Paola (PM)",
  approvato_il: "2026-11-20",
  versione_approvata: "1.0",
  evidenza_approvazione: "commit abc",
  gate: "G1",
};
// Come lo lascia una skill in aggiornamento: In corso e campi di approvazione vuoti.
const withdrawn = {
  ...approved,
  stato: "In corso",
  approvato_da: null,
  approvato_il: "",
  versione_approvata: null,
  evidenza_approvazione: null,
};

describe("changesApproval", () => {
  it("lascia passare l'aggiornamento di una skill su un documento Approvato", () => {
    expect(withdrawsApproval(approved, withdrawn, true)).toBe(true);
    expect(changesApproval(approved, withdrawn, true)).toBe(false);
  });

  it("senza cambi al testo il ritiro resta riservato a chi approva", () => {
    expect(changesApproval(approved, withdrawn, false)).toBe(true);
  });

  it("In corso con i dati di approvazione ancora pieni: riservato", () => {
    expect(changesApproval(approved, { ...approved, stato: "In corso" }, true)).toBe(true);
  });

  it("passare a Approvato o cambiare i dati di approvazione: riservato", () => {
    expect(changesApproval({ stato: "Completo" }, { stato: "Approvato" }, true)).toBe(true);
    expect(changesApproval(approved, { ...approved, approvato_da: "Altri" }, true)).toBe(true);
  });

  it("documento non approvato, campi invariati: libero", () => {
    expect(changesApproval({ stato: "In corso" }, { stato: "Completo" }, true)).toBe(false);
  });
});
