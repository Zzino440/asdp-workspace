import { describe, expect, it } from "vitest";
import { changedBlocks, spliceMarkdown } from "./markdown-splice";

// original: sorgente su GitLab; baseline: come lo riscrive l'editor appena aperto; current: al salvataggio.
const original = "# Titolo\n\nTesto con \_escape\_ originale.\n\n| a | b |\n|-|-|\n| 1 | 2 |\n";
const baseline = "# Titolo\n\nTesto con \_escape\_ originale.\n\n| a | b |\n| - | - |\n| 1 | 2 |\n";

describe("spliceMarkdown", () => {
  it("lascia identico il sorgente se non cambia niente", () => {
    expect(spliceMarkdown(original, baseline, baseline)).toBe(original);
  });

  it("cambia solo il blocco modificato", () => {
    const current = baseline.replace("originale", "nuovo");
    expect(spliceMarkdown(original, baseline, current)).toBe(original.replace("originale", "nuovo"));
  });

  it("aggiunge un blocco nuovo in fondo senza toccare la tabella", () => {
    const current = `${baseline}\nParagrafo aggiunto.\n`;
    expect(spliceMarkdown(original, baseline, current)).toBe(`${original}\nParagrafo aggiunto.\n`);
  });

  it("toglie un blocco eliminato", () => {
    const current = "# Titolo\n\n| a | b |\n| - | - |\n| 1 | 2 |\n";
    expect(spliceMarkdown(original, baseline, current)).toBe("# Titolo\n\n| a | b |\n|-|-|\n| 1 | 2 |\n");
  });

  it("restituisce null se sorgente e baseline hanno blocchi diversi", () => {
    expect(spliceMarkdown("Uno.\n\nDue.\n", "Uno.\n", "Uno.\n")).toBeNull();
  });
});

describe("changedBlocks", () => {
  it("elenca solo i blocchi nuovi o cambiati", () => {
    expect(changedBlocks("A.\n\nB.\n", "A.\n\nB2.\n\nC.\n")).toEqual(["B2.", "C."]);
  });
});
