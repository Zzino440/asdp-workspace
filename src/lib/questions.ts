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
