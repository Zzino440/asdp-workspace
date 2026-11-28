import { describe, expect, it } from "vitest";
import { answerQuestion, optionsOf, questionsOf, tracesOf } from "./questions";

const body = `## Domande aperte

#### D1 · Lingua dell'interfaccia
- [x] Italiano
- [ ] Inglese

#### D2 · Login
- [ ] SSO
- [ ] Email

#### D3 · Export
- [x] PDF
- [x] Word

#### D4 · Hosting
- [x] Da decidere in fase di analisi

#### D5 · Altro caso
- [x] Altro: ___

## Sezione successiva
- [x] non è una domanda
`;

describe("questionsOf", () => {
  it("riconosce i quattro stati", () => {
    expect(questionsOf(body)).toEqual([
      { id: "D1", title: "Lingua dell'interfaccia", answered: true, answer: "Italiano", status: "da_applicare" },
      { id: "D2", title: "Login", answered: false, status: "aperta" },
      { id: "D3", title: "Export", answered: false, status: "da_correggere" },
      { id: "D4", title: "Hosting", answered: false, status: "rimandata" },
      { id: "D5", title: "Altro caso", answered: false, status: "da_correggere" },
    ]);
  });
});

describe("tracesOf", () => {
  const doc = `- **REQ-01 — Ospite esterno**: nome e azienda. → risolto da D1
- REQ-02 — Export → risolto da D2, D3
- REQ-03 — Badge → risolto da D4 e D5
- REQ-04 — Report → risolto da D2
  - voce annidata → aggiornato su indicazione utente

> ⚠️ **Assunzione** — orario 8-18 → risolto da D6

| NFR-01 — Tempo | 2 s → risolto da D7 | Prestazioni |

\`\`\`
→ risolto da D9
\`\`\`

- riga senza traccia
`;

  it("legge le tracce in ordine, fuori dal codice", () => {
    expect(tracesOf(doc)).toEqual([
      { kind: "risolta", ids: ["D1"], text: "REQ-01 — Ospite esterno: nome e azienda." },
      { kind: "risolta", ids: ["D2", "D3"], text: "REQ-02 — Export" },
      { kind: "risolta", ids: ["D4", "D5"], text: "REQ-03 — Badge" },
      { kind: "risolta", ids: ["D2"], text: "REQ-04 — Report" },
      { kind: "aggiornato", ids: [], text: "voce annidata" },
      { kind: "risolta", ids: ["D6"], text: "⚠️ Assunzione — orario 8-18" },
      { kind: "risolta", ids: ["D7"], text: "NFR-01 — Tempo · 2 s · Prestazioni" },
    ]);
  });
});

describe("answerQuestion", () => {
  const doc = [
    "#### D1 · Prima",
    "",
    "- [ ] Sì",
    "- [x] No",
    "- [ ] Altro: ___________",
    "",
    "#### D2 · Seconda",
    "",
    "- [ ] A",
    "- [ ] B",
    "",
    "## Dopo",
    "- [ ] non è un'opzione",
  ].join("\n");

  it("elenca le opzioni di una domanda", () => {
    expect(optionsOf(doc, "D2")).toEqual(["A", "B"]);
    expect(optionsOf(doc, "D9")).toEqual([]);
  });

  it("spunta solo l'opzione scelta e lascia il resto identico", () => {
    const out = answerQuestion(doc, "D1", 0)!;
    expect(out.split("\n").slice(2, 5)).toEqual(["- [x] Sì", "- [ ] No", "- [ ] Altro: ___________"]);
    expect(out.split("\n").slice(5)).toEqual(doc.split("\n").slice(5));
    expect(questionsOf(out)[0]).toMatchObject({ status: "da_applicare", answer: "Sì" });
  });

  it("non tocca le caselle dopo il titolo successivo", () => {
    expect(answerQuestion(doc, "D2", 1)!.split("\n").at(-1)).toBe("- [ ] non è un'opzione");
  });

  it("Altro: scrive il testo e lo richiede", () => {
    expect(answerQuestion(doc, "D1", 2, "  Solo gli Operatori ")!.split("\n")[4]).toBe("- [x] Altro: Solo gli Operatori");
    expect(answerQuestion(doc, "D1", 2, " ")).toBeNull();
  });

  it("domanda o opzione inesistenti: null", () => {
    expect(answerQuestion(doc, "D9", 0)).toBeNull();
    expect(answerQuestion(doc, "D2", 5)).toBeNull();
  });

  it("mantiene gli a capo \\r\\n", () => {
    const crlf = doc.replace(/\n/g, "\r\n");
    expect(answerQuestion(crlf, "D2", 0)).toBe(answerQuestion(doc, "D2", 0)!.replace(/\n/g, "\r\n"));
  });
});
