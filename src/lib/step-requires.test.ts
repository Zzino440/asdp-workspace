import { describe, expect, it } from "vitest";
import type { MapDoc, MapType, NextStep } from "./project-steps";
import { missingRequires, parallelSteps } from "./step-requires";

const doc = (state: string, feature: string | null = null): MapDoc => ({
  path: `asdp/x-${state}-${feature ?? ""}.md`,
  href: "",
  title: "",
  state,
  version: null,
  typeCode: null,
  feature,
  owner: null,
  deadline: null,
  questions: [],
  changesRequested: null,
  attachments: [],
});

const type = (code: string, phase: number, requires: string[], docs: MapDoc[] = [], perFeature = false): MapType => ({
  code,
  name: code,
  phase,
  skill: `asdp:${code}`,
  perFeature,
  requires,
  docs,
});

const step = (code: string, phase: number, missing: string[] = []): NextStep => ({
  code,
  name: code,
  phase,
  skill: `asdp:${code}`,
  perFeature: false,
  feature: null,
  doc: null,
  missing: missing.map((c) => ({ code: c, name: c, phase: 0 })),
});

describe("missingRequires", () => {
  const types = [
    type("T1.4", 1, [], [doc("Completo")]),
    type("T2.2", 2, ["T1.4"]),
    type("T4.1", 4, ["T1.4"]),
    type("T4.2", 4, ["T4.1", "T2.2"], [doc("In corso", "F01")], true),
    type("T4.3-INDEX", 4, ["T4.2"], [], true),
  ];

  it("considera pronto un tipo Completo o Approvato", () => {
    expect(missingRequires(types, ["T1.4"], null)).toEqual([]);
  });

  it("segnala i tipi senza documenti o non pronti", () => {
    expect(missingRequires(types, ["T4.1", "T2.2"], "F01").map((m) => m.code)).toEqual(["T4.1", "T2.2"]);
  });

  it("valuta un tipo per-feature sulla stessa Feature", () => {
    expect(missingRequires(types, ["T4.2"], "F01").map((m) => m.code)).toEqual(["T4.2"]);
    const ready = [...types.slice(0, 3), type("T4.2", 4, [], [doc("Approvato", "F01"), doc("In corso", "F02")], true)];
    expect(missingRequires(ready, ["T4.2"], "F01")).toEqual([]);
    expect(missingRequires(ready, ["T4.2"], "F02").map((m) => m.code)).toEqual(["T4.2"]);
  });
});

describe("parallelSteps", () => {
  it("propone i passi delle fasi successive con i prerequisiti pronti", () => {
    const next = step("T2.2", 2);
    const open = [next, step("T2.4", 2), step("T3.1", 3, ["T2.2"]), step("T4.1", 4), step("T4.2", 4, ["T4.1", "T2.2"])];
    expect(parallelSteps(open, next).map((s) => s.code)).toEqual(["T4.1"]);
  });

  it("non propone nulla senza prossimo passo", () => {
    expect(parallelSteps([step("T4.1", 4)], null)).toEqual([]);
  });
});
