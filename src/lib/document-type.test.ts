import { describe, expect, it } from "vitest";
import { detectType } from "./document-type";

const types = [
  { code: "T4.2", folder: "asdp/delivery" },
  { code: "T4.3-INDEX", folder: "asdp/delivery" },
  { code: "T4.3-part", folder: "asdp/delivery" },
  { code: "T1.4", folder: "asdp/analisi" },
];
const root = "asdp/";

describe("detectType", () => {
  it("riconosce i file T4.3 per User Story senza template_origine", () => {
    expect(detectType("asdp/delivery/F02/T4.3-F02-US01.md", root, {}, types)).toBe("T4.3-part");
    expect(detectType("asdp/delivery/t4.3-f10-us12.md", root, {}, types)).toBe("T4.3-part");
  });

  it("il prefisso del nome resta la prima regola", () => {
    expect(detectType("asdp/delivery/F02/T4.3-INDEX-F02.md", root, {}, types)).toBe("T4.3-INDEX");
    expect(detectType("asdp/delivery/F02/T4.2-F02.md", root, {}, types)).toBe("T4.2");
  });

  it("poi template_origine, poi la cartella con un solo tipo", () => {
    expect(detectType("asdp/delivery/note.md", root, { template_origine: "T4.2 v1.0" }, types)).toBe("T4.2");
    expect(detectType("asdp/analisi/qualcosa.md", root, {}, types)).toBe("T1.4");
    expect(detectType("asdp/delivery/note.md", root, {}, types)).toBeNull();
  });

  it("senza T4.3-part nel catalogo il nome US non basta", () => {
    expect(detectType("asdp/x/T4.3-F02-US01.md", root, {}, types.filter((t) => t.code !== "T4.3-part"))).toBeNull();
  });
});
