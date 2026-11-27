import { describe, expect, it } from "vitest";
import { questionsOf } from "./questions";

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
