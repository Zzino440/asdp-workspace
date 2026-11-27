import { describe, expect, it } from "vitest";
import { attachmentParent, parseCsv } from "./attachments";

describe("attachmentParent", () => {
  const paths = ["asdp/backlog/T4.1-BACKLOG.md", "asdp/backlog/T4.1-BACKLOG.csv", "asdp/allegati/offerta.csv"];

  it("lega il file al Markdown con lo stesso nome", () => {
    expect(attachmentParent("asdp/backlog/T4.1-BACKLOG.csv", paths)).toBe("asdp/backlog/T4.1-BACKLOG.md");
  });

  it("restituisce null per un Markdown o un file senza documento", () => {
    expect(attachmentParent("asdp/backlog/T4.1-BACKLOG.md", paths)).toBeNull();
    expect(attachmentParent("asdp/allegati/offerta.csv", paths)).toBeNull();
  });
});

describe("parseCsv", () => {
  it("gestisce virgolette, virgole nei campi e campi vuoti", () => {
    expect(parseCsv('a,b,c\r\n"x, y","di ""lui""",\n\n')).toEqual([
      ["a", "b", "c"],
      ["x, y", 'di "lui"', ""],
    ]);
  });
});
