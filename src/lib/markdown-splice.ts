import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

// Salvataggio senza riformattare: l'editor visuale riscrive il Markdown a modo suo (escape,
// tabelle allineate, "***" al posto di "---"). Qui si confrontano i blocchi di primo livello del
// testo dell'editor appena aperto (baseline) con quelli al salvataggio (current): i blocchi non
// toccati tornano identici al sorgente originale, solo quelli cambiati prendono il testo
// dell'editor. Tutti i testi vanno passati con fine riga "\n".

const parser = unified().use(remarkParse).use(remarkGfm);

function blocks(markdown: string) {
  return parser.parse(markdown).children.map((node) => {
    const start = node.position!.start.offset!;
    const end = node.position!.end.offset!;
    return { start, end, text: markdown.slice(start, end) };
  });
}

// Sottosequenza comune più lunga tra due liste di blocchi.
function lcsTable(b: { text: string }[], c: { text: string }[]) {
  const lcs = Array.from({ length: b.length + 1 }, () => new Int32Array(c.length + 1));
  for (let i = b.length - 1; i >= 0; i--)
    for (let j = c.length - 1; j >= 0; j--)
      lcs[i][j] = b[i].text === c[j].text ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  return lcs;
}

// Blocchi di "after" che non c'erano in "before": le parti cambiate o aggiunte.
export function changedBlocks(before: string, after: string) {
  const b = blocks(before);
  const c = blocks(after);
  const lcs = lcsTable(b, c);
  const changed: string[] = [];
  let i = 0;
  let j = 0;
  while (j < c.length) {
    if (i < b.length && b[i].text === c[j].text) {
      i++;
      j++;
    } else if (i < b.length && lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else changed.push(c[j++].text);
  }
  return changed;
}

// null se i blocchi del sorgente e della baseline non si corrispondono uno a uno.
export function spliceMarkdown(original: string, baseline: string, current: string): string | null {
  const o = blocks(original);
  const b = blocks(baseline);
  const c = blocks(current);
  if (o.length !== b.length) return null;

  const n = b.length;
  const m = c.length;
  const lcs = lcsTable(b, c);

  // orig: indice del blocco originale di cui il pezzo prende il posto (null = blocco nuovo).
  const pieces: { orig: number | null; text: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && b[i].text === c[j].text) {
      pieces.push({ orig: i, text: original.slice(o[i].start, o[i].end) });
      i++;
      j++;
    } else if (i < n && j < m && lcs[i + 1][j + 1] === lcs[i][j]) {
      pieces.push({ orig: i, text: c[j].text }); // blocco modificato sul posto
      i++;
      j++;
    } else if (j < m && (i >= n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      pieces.push({ orig: null, text: c[j].text });
      j++;
    } else {
      i++; // blocco eliminato
    }
  }
  if (pieces.length === 0) return "";

  // Separatori e testo prima/dopo i blocchi presi dal sorgente quando i vicini sono gli stessi.
  let out = original.slice(0, pieces[0].orig === 0 ? o[0].start : 0);
  pieces.forEach((piece, k) => {
    const prev = pieces[k - 1];
    if (prev)
      out +=
        prev.orig !== null && piece.orig === prev.orig + 1 ? original.slice(o[prev.orig].end, o[piece.orig].start) : "\n\n";
    out += piece.text;
  });
  const last = pieces[pieces.length - 1];
  return out + (last.orig === n - 1 ? original.slice(o[n - 1].end) : "\n");
}
