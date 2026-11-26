// Domande aperte D[N] di un documento ASDP (formato delle skill: "#### D3 · Titolo" seguito dalle
// opzioni "- [ ]"). Una domanda ha risposta se è spuntata una sola opzione valida: non "Da decidere
// in fase di analisi" e non "Altro:" senza testo. La risposta va poi applicata rilanciando la skill,
// che toglie il blocco: finché il blocco c'è, la domanda resta nell'elenco.

export type Question = { id: string; title: string; answered: boolean };

const HEADING = /^#{1,6}\s/;
const QUESTION = /^#{2,6}\s+(D\d+)\s*·\s*(.+?)\s*$/;
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
    .map(({ id, title, checked }) => ({
      id,
      title,
      answered:
        checked.length === 1 &&
        !/^da decidere/i.test(checked[0]) &&
        !(/^altro:/i.test(checked[0]) && !checked[0].replace(/^altro:/i, "").replace(/[_\s]/g, "")),
    }));
}
