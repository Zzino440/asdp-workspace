// Allegati dei documenti: file non Markdown scritti dalla skill accanto al documento, con lo
// stesso nome (es. T4.1-BACKLOG.csv accanto a T4.1-BACKLOG.md). Non sono documenti del passo:
// si mostrano dentro la pagina del documento a cui appartengono.

// Percorso del documento Markdown a cui appartiene il file, o null se non è un allegato.
export function attachmentParent(path: string, paths: string[]) {
  if (path.endsWith(".md")) return null;
  const markdown = path.replace(/\.[^./]+$/, ".md");
  return markdown !== path && paths.includes(markdown) ? markdown : null;
}

// CSV del backlog (Schema v1.0): virgole, campi tra doppie virgolette se servono ("" = "),
// nessun campo su più righe. Righe vuote ignorate.
export function parseCsv(text: string) {
  return text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const cells: string[] = [];
      let cell = "";
      let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
          if (c === '"' && line[i + 1] === '"') {
            cell += '"';
            i++;
          } else if (c === '"') quoted = false;
          else cell += c;
        } else if (c === '"') quoted = true;
        else if (c === ",") {
          cells.push(cell);
          cell = "";
        } else cell += c;
      }
      cells.push(cell);
      return cells;
    });
}
