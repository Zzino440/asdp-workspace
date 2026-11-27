import { describe, expect, it } from "vitest";
import { setFrontMatterFields, splitFrontMatter } from "./front-matter";

describe("splitFrontMatter", () => {
  it("separa frontespizio e corpo", () => {
    const r = splitFrontMatter("---\nstato: In corso\nversione: 1\n---\n# Titolo\n");
    expect(r.frontMatter).toEqual({ stato: "In corso", versione: 1 });
    expect(r.frontMatterSource).toBe("stato: In corso\nversione: 1");
    expect(r.body).toBe("# Titolo\n");
  });

  it("accetta i fine riga CRLF", () => {
    const r = splitFrontMatter("---\r\nstato: Completo\r\n---\r\nCorpo");
    expect(r.frontMatter).toEqual({ stato: "Completo" });
    expect(r.body).toBe("Corpo");
  });

  it("senza frontespizio restituisce tutto come corpo", () => {
    expect(splitFrontMatter("# Solo corpo\n")).toEqual({ frontMatter: {}, frontMatterSource: null, body: "# Solo corpo\n" });
  });
});

describe("setFrontMatterFields", () => {
  it("cambia solo il valore e lascia i commenti", () => {
    const source = "stato: In corso   # Da fare | In corso\nversione: 1";
    expect(setFrontMatterFields(source, { stato: "Completo" })).toBe("stato: Completo   # Da fare | In corso\nversione: 1");
  });

  it("riempie un campo vuoto con commento", () => {
    expect(setFrontMatterFields("gate:   # nome del gate", { gate: "G1" })).toBe("gate:   G1 # nome del gate");
  });

  it("aggiunge in fondo le chiavi che mancano", () => {
    expect(setFrontMatterFields("stato: Approvato\n", { approvato_da: "Mario" })).toBe("stato: Approvato\napprovato_da: Mario");
  });

  it("svuota un campo con null", () => {
    expect(setFrontMatterFields("approvato_da: Mario", { approvato_da: null })).toBe("approvato_da: null");
  });
});
