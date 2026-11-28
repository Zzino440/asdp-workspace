// Domande aperte D[N] di un documento ASDP (formato delle skill: "#### D3 · Titolo" seguito dalle
// opzioni "- [ ]"). Una domanda ha risposta se è spuntata una sola opzione valida: non "Da decidere
// in fase di analisi" e non "Altro:" senza testo. La risposta va poi applicata rilanciando la skill,
// che toglie il blocco: finché il blocco c'è, la domanda resta nell'elenco.

// Stato come lo legge la skill: aperta (nessuna spunta), rimandata ("Da decidere in fase di
// analisi": il blocco resta), da_applicare (una sola opzione valida), da_correggere (più spunte o
// "Altro:" senza testo: la skill si ferma e chiede di correggere).
export type QuestionStatus = "aperta" | "rimandata" | "da_applicare" | "da_correggere";

// answer: l'opzione spuntata, solo se la domanda ha risposta.
export type Question = { id: string; title: string; answered: boolean; answer?: string; status?: QuestionStatus };

export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  aperta: "Aperta",
  rimandata: "Rimandata all'analisi",
  da_applicare: "Risposta da applicare",
  da_correggere: "Da correggere",
};

// Le righe indicizzate prima di status hanno solo answered.
export const statusOf = (q: Question): QuestionStatus => q.status ?? (q.answered ? "da_applicare" : "aperta");

const HEADING = /^#{1,6}\s/;
export const QUESTION = /^#{2,6}\s+(D\d+)\s*·\s*(.+?)\s*$/;
const OPTION = /^\s*[-*]\s+\[([ xX])\]\s*(.*)$/;

// Tracce che la skill lascia applicando una risposta ("→ risolto da D2", anche "D2, D3" o "D2 e D3")
// o una richiesta fatta in chat ("→ aggiornato su indicazione utente"). La stessa D può risolvere
// più punti: una traccia per punto, in ordine di testo.
export const TRACE = /→\s*(?:risolto da\s+(D\d+(?:\s*(?:,|e)\s*D\d+)*)|aggiornato su indicazione utente)/i;
const TRACE_ALL = new RegExp(TRACE.source, "gi");
const FENCE = /^\s*(```|~~~)/;

// text: la riga senza marcatori Markdown e senza la traccia, per il pannello.
export type Trace = { kind: "risolta" | "aggiornato"; ids: string[]; text: string };

export const traceIds = (match: RegExpExecArray) => (match[1] ? match[1].match(/D\d+/g)! : []);

export function tracesOf(body: string): Trace[] {
  const traces: Trace[] = [];
  let fenced = false;
  for (const line of body.split(/\r?\n/)) {
    if (FENCE.test(line)) fenced = !fenced;
    if (fenced) continue;
    const text = line
      .replace(TRACE_ALL, "")
      .replace(/^[\s>|]*(?:[-*+]|\d+\.)?\s*(?:\[[ xX]\]\s*)?/, "")
      .replace(/[*_`]/g, "")
      .replace(/\s*\|\s*/g, " · ")
      .replace(/[\s·]+$/, "")
      .trim();
    for (const match of line.matchAll(TRACE_ALL)) {
      const ids = traceIds(match);
      traces.push({ kind: ids.length ? "risolta" : "aggiornato", ids, text });
    }
  }
  return traces;
}

export function questionsOf(body: string): Question[] {
  const questions: (Question & { checked: string[] })[] = [];
  for (const line of body.split(/\r?\n/)) {
    const match = QUESTION.exec(line);
    if (match) {
      questions.push({ id: match[1], title: match[2], answered: false, checked: [] });
      continue;
    }
    const current = questions.at(-1);
    if (!current) continue;
    if (HEADING.test(line)) {
      questions.push({ id: "", title: "", answered: false, checked: [] }); // fine del blocco
      continue;
    }
    const option = OPTION.exec(line);
    if (option && option[1] !== " ") current.checked.push(option[2].trim());
  }
  return questions
    .filter((q) => q.id)
    .map(({ id, title, checked }): Question => {
      const emptyOther = checked.some((c) => /^altro:/i.test(c) && !c.replace(/^altro:/i, "").replace(/[_\s]/g, ""));
      if (checked.length === 0) return { id, title, answered: false, status: "aperta" };
      if (checked.length > 1 || emptyOther) return { id, title, answered: false, status: "da_correggere" };
      if (/^da decidere/i.test(checked[0])) return { id, title, answered: false, status: "rimandata" };
      return { id, title, answered: true, answer: checked[0], status: "da_applicare" };
    });
}

// Righe della domanda `id` (dal suo titolo al titolo successivo, come in questionsOf), con le
// opzioni "- [ ]" e la loro posizione. null se la domanda non c'è.
function questionBlock(lines: string[], id: string) {
  const start = lines.findIndex((line) => QUESTION.exec(line.replace(/\r$/, ""))?.[1] === id);
  if (start === -1) return null;
  const options: { line: number; text: string }[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    if (HEADING.test(line)) break;
    const option = OPTION.exec(line);
    if (option) options.push({ line: i, text: option[2].trim() });
  }
  return options;
}

// Testo delle opzioni della domanda, nell'ordine del documento (vuoto se la domanda non c'è).
export const optionsOf = (body: string, id: string) => questionBlock(body.split("\n"), id)?.map((o) => o.text) ?? [];

// "Altro: ___" con o senza testo: è l'opzione da completare a mano.
export const isOtherOption = (text: string) => /^altro:/i.test(text);

// Risponde alla domanda `id` come fa l'utente in Modifica testo: spunta solo l'opzione n. `index`
// e toglie la spunta alle altre. Per "Altro:" il testo `other` prende il posto dei trattini. Il
// resto del documento resta identico (anche gli a capo \r\n). null se domanda o opzione non ci
// sono, o se "Altro:" non ha testo.
export function answerQuestion(content: string, id: string, index: number, other?: string) {
  const lines = content.split("\n");
  const options = questionBlock(lines, id);
  const chosen = options?.[index];
  if (!options || !chosen) return null;
  const otherText = other?.replace(/\s+/g, " ").trim();
  if (isOtherOption(chosen.text) && !otherText) return null;
  for (const [i, option] of options.entries()) {
    const line = lines[option.line];
    const cr = line.endsWith("\r") ? "\r" : "";
    let next = line.slice(0, line.length - cr.length).replace(/\[[ xX]\]/, i === index ? "[x]" : "[ ]");
    if (i === index && isOtherOption(option.text)) next = next.replace(/(\[x\]\s*altro:).*$/i, (_, start) => `${start} ${otherText}`);
    lines[option.line] = next + cr;
  }
  return lines.join("\n");
}
