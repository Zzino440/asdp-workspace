import "server-only";
import type { Document, Element } from "@xmldom/xmldom";
import { all, child, children, insertAfter, OfficeError, type Parts, readXml, removeNode, writeXml } from "./package";

// Word (.docx) a blocchi: i figli del corpo (paragrafi e tabelle) numerati b0, b1, … nell'ordine del
// documento. Le modifiche toccano solo i run di testo dei blocchi indicati: stili, numerazione,
// immagini, campi, intestazioni e piè di pagina restano come sono.

export type WordOperation =
  | { op: "replace_block"; block: string; text: string }
  | { op: "insert_after"; block: string; paragraphs: { text: string; style?: string }[] }
  | { op: "delete_block"; block: string }
  | { op: "set_cell"; block: string; row: number; col: number; text: string }
  | { op: "find_replace"; find: string; replace: string; block?: string };

const DOCUMENT = "word/document.xml";
const STYLES = "word/styles.xml";
// Contenuto di un run che si può riscrivere senza perdere niente (niente immagini, campi, oggetti).
const TEXT_PARTS = new Set(["w:rPr", "w:t", "w:delText", "w:tab", "w:br", "w:cr", "w:lastRenderedPageBreak", "w:softHyphen", "w:noBreakHyphen"]);

type Styles = { names: Map<string, string>; ids: Map<string, string> };

function readStyles(parts: Parts): Styles {
  const names = new Map<string, string>();
  const ids = new Map<string, string>();
  if (!parts[STYLES]) return { names, ids };
  for (const style of all(readXml(parts, STYLES), "w:style")) {
    if (style.getAttribute("w:type") !== "paragraph") continue;
    const id = style.getAttribute("w:styleId") ?? "";
    const name = child(style, "w:name")?.getAttribute("w:val") ?? id;
    names.set(id, name);
    ids.set(name.toLowerCase(), id);
    ids.set(id.toLowerCase(), id);
  }
  return { names, ids };
}

const closest = (node: Element, name: string) => {
  for (let n = node.parentNode as Element | null; n; n = n.parentNode as Element | null) if (n.tagName === name) return n;
  return null;
};

// Run del paragrafo (non quelli di paragrafi annidati, es. caselle di testo), esclusi i testi già cancellati con revisione.
const runsOf = (p: Element) => all(p, "w:r").filter((r) => closest(r, "w:p") === p && !closest(r, "w:del"));
const isPureText = (r: Element) => children(r).every((c) => TEXT_PARTS.has(c.tagName));

function runText(r: Element) {
  return children(r)
    .map((c) => (c.tagName === "w:t" ? c.textContent ?? "" : c.tagName === "w:tab" ? "\t" : c.tagName === "w:br" || c.tagName === "w:cr" ? "\n" : ""))
    .join("");
}

const paragraphText = (p: Element) => runsOf(p).map(runText).join("");

function headingLevel(p: Element, styles: Styles) {
  const pPr = child(p, "w:pPr");
  const id = pPr && child(pPr, "w:pStyle")?.getAttribute("w:val");
  const name = (id && styles.names.get(id)) || "";
  if (/^title$/i.test(name)) return 1;
  const match = /^heading (\d)$/i.exec(name);
  if (match) return Number(match[1]);
  const outline = pPr && child(pPr, "w:outlineLvl")?.getAttribute("w:val");
  return outline != null && Number(outline) < 9 ? Number(outline) + 1 : 0;
}

const styleName = (p: Element, styles: Styles) => {
  const pPr = child(p, "w:pPr");
  const id = pPr && child(pPr, "w:pStyle")?.getAttribute("w:val");
  return id ? styles.names.get(id) ?? id : null;
};

const bodyOf = (doc: Document) => {
  const body = all(doc, "w:body")[0];
  if (!body) throw new OfficeError("Documento Word senza corpo.");
  return body;
};
const blocksOf = (doc: Document) => children(bodyOf(doc)).filter((b) => b.tagName !== "w:sectPr");

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

// Testo del documento a blocchi, in Markdown con l'id di ogni blocco.
export function readWord(parts: Parts) {
  const styles = readStyles(parts);
  const lines = blocksOf(readXml(parts, DOCUMENT)).map((block, i) => {
    const id = `[b${i}]`;
    if (block.tagName === "w:p") {
      const text = paragraphText(block);
      const level = headingLevel(block, styles);
      if (level) return `${id} ${"#".repeat(Math.min(level, 6))} ${text}`;
      const style = styleName(block, styles);
      const list = child(block, "w:pPr") && child(child(block, "w:pPr"), "w:numPr") ? "- " : "";
      const tag = style && !/^normal$/i.test(style) ? ` {${style}}` : "";
      const deleted = all(child(block, "w:pPr") ?? block, "w:del").some((d) => d.parentNode?.parentNode === child(block, "w:pPr"));
      return `${id}${tag} ${list}${text || (deleted ? "(eliminato con revisione)" : "(vuoto)")}`;
    }
    if (block.tagName === "w:tbl") {
      const rows = children(block, "w:tr").map((tr) =>
        children(tr, "w:tc").map((tc) => children(tc, "w:p").map(paragraphText).join(" / ")),
      );
      const cols = Math.max(0, ...rows.map((r) => r.length));
      const table = rows.map((r) => `| ${r.map(cell).join(" | ")} |`);
      if (table.length) table.splice(1, 0, `|${" --- |".repeat(Math.max(cols, 1))}`);
      return [`${id} (tabella ${rows.length}×${cols}: righe 0–${rows.length - 1}, colonne 0–${cols - 1})`, ...table].join("\n");
    }
    return `${id} (${block.tagName}) ${all(block, "w:t").map((t) => t.textContent).join("")}`;
  });
  return lines.join("\n");
}

type Context = { doc: Document; styles: Styles; track: boolean; author: string; date: string; nextId: number };

const el = (ctx: Context, name: string) => ctx.doc.createElement(name);

// Marcatore di revisione (w:ins / w:del) con autore e data.
function revision(ctx: Context, name: "w:ins" | "w:del") {
  const mark = el(ctx, name);
  mark.setAttribute("w:id", String(ctx.nextId++));
  mark.setAttribute("w:author", ctx.author);
  mark.setAttribute("w:date", ctx.date);
  return mark;
}

// Riscrive il testo di un run tenendo la formattazione (w:rPr); \t e \n diventano tabulazione e a capo.
function setRunText(ctx: Context, r: Element, text: string, deleted = false) {
  for (const c of children(r)) if (c.tagName !== "w:rPr") r.removeChild(c);
  for (const piece of text.split(/(\t|\n)/)) {
    if (!piece) continue;
    if (piece === "\t") r.appendChild(el(ctx, "w:tab"));
    else if (piece === "\n") r.appendChild(el(ctx, "w:br"));
    else {
      const t = el(ctx, deleted ? "w:delText" : "w:t");
      t.setAttribute("xml:space", "preserve");
      t.appendChild(ctx.doc.createTextNode(piece));
      r.appendChild(t);
    }
  }
}

function newRun(ctx: Context, rPr: Element | null | undefined, text: string) {
  const r = el(ctx, "w:r");
  if (rPr) r.appendChild(rPr.cloneNode(true));
  setRunText(ctx, r, text);
  if (!ctx.track) return r;
  const ins = revision(ctx, "w:ins");
  ins.appendChild(r);
  return ins;
}

// Toglie un run: con le revisioni resta come testo cancellato.
function dropRun(ctx: Context, r: Element) {
  if (!ctx.track) return removeNode(r);
  setRunText(ctx, r, runText(r), true);
  const del = revision(ctx, "w:del");
  r.parentNode!.insertBefore(del, r);
  del.appendChild(r);
}

// Segna come inserito/cancellato il segno di paragrafo (w:pPr/w:rPr/w:ins|w:del).
function markParagraph(ctx: Context, p: Element, name: "w:ins" | "w:del") {
  let pPr = child(p, "w:pPr");
  if (!pPr) p.insertBefore((pPr = el(ctx, "w:pPr")), p.firstChild);
  let rPr = child(pPr, "w:rPr");
  if (!rPr) pPr.appendChild((rPr = el(ctx, "w:rPr")));
  rPr.appendChild(revision(ctx, name));
}

const firstRunProps = (p: Element) => runsOf(p).map((r) => child(r, "w:rPr")).find(Boolean);

// Testo nuovo del paragrafo con la formattazione del primo run; restano immagini e campi.
function replaceParagraph(ctx: Context, p: Element, text: string) {
  const rPr = firstRunProps(p);
  const runs = runsOf(p).filter(isPureText);
  const run = newRun(ctx, rPr, text);
  // Il testo nuovo va dove stava quello vecchio: prima del primo run (diretto) o dopo l'ultimo cancellato (revisioni).
  if (!runs.length) p.appendChild(run);
  else if (ctx.track) insertAfter(run, topIn(p, runs.at(-1)!));
  else p.insertBefore(run, topIn(p, runs[0]));
  for (const r of runs) dropRun(ctx, r);
  // Contenitori rimasti vuoti (link, vecchie revisioni) dopo la modifica diretta.
  if (!ctx.track) for (const c of children(p)) if (["w:hyperlink", "w:ins", "w:smartTag"].includes(c.tagName) && !c.firstChild) p.removeChild(c);
}

// Antenato di node figlio diretto di p.
const topIn = (p: Element, node: Element) => {
  let n = node;
  while (n.parentNode && n.parentNode !== p) n = n.parentNode as Element;
  return n;
};

function deleteParagraph(ctx: Context, p: Element) {
  if (!ctx.track) return removeNode(p);
  for (const r of runsOf(p)) if (isPureText(r)) dropRun(ctx, r);
  markParagraph(ctx, p, "w:del");
}

function deleteBlock(ctx: Context, block: Element) {
  if (block.tagName === "w:p") return deleteParagraph(ctx, block);
  if (!ctx.track) return removeNode(block);
  if (block.tagName !== "w:tbl") throw new OfficeError("Con le revisioni si possono eliminare solo paragrafi e tabelle.");
  for (const tr of children(block, "w:tr")) {
    let trPr = child(tr, "w:trPr");
    if (!trPr) tr.insertBefore((trPr = el(ctx, "w:trPr")), children(tr).find((c) => c.tagName === "w:tc") ?? null);
    trPr.appendChild(revision(ctx, "w:del"));
    for (const p of all(tr, "w:p")) for (const r of runsOf(p)) if (isPureText(r)) dropRun(ctx, r);
  }
}

function resolveStyle(ctx: Context, style: string) {
  const key = style.toLowerCase().replace(/^titolo (\d)$/, "heading $1");
  const id = ctx.styles.ids.get(key);
  if (!id) {
    const known = [...new Set(ctx.styles.names.values())].slice(0, 40).join(", ");
    throw new OfficeError(`Stile "${style}" non presente nel documento. Stili di paragrafo: ${known}`);
  }
  return id;
}

function insertParagraphs(ctx: Context, block: Element, paragraphs: { text: string; style?: string }[]) {
  // Senza stile i paragrafi nuovi prendono il formato del blocco di riferimento, se non è un titolo.
  const template = block.tagName === "w:p" && !headingLevel(block, ctx.styles) ? block : null;
  let previous = block;
  for (const { text, style } of paragraphs) {
    const p = el(ctx, "w:p");
    if (style) {
      const pPr = el(ctx, "w:pPr");
      const pStyle = el(ctx, "w:pStyle");
      pStyle.setAttribute("w:val", resolveStyle(ctx, style));
      pPr.appendChild(pStyle);
      p.appendChild(pPr);
    } else if (template && child(template, "w:pPr")) {
      const pPr = child(template, "w:pPr").cloneNode(true) as Element;
      for (const rPr of children(pPr, "w:rPr")) pPr.removeChild(rPr);
      p.appendChild(pPr);
    }
    p.appendChild(newRun(ctx, style ? null : template && firstRunProps(template), text));
    if (ctx.track) markParagraph(ctx, p, "w:ins");
    insertAfter(p, previous);
    previous = p;
  }
}

function setCell(ctx: Context, table: Element, row: number, col: number, text: string) {
  if (table.tagName !== "w:tbl") throw new OfficeError("set_cell vale solo per le tabelle.");
  const tr = children(table, "w:tr")[row];
  const tc = tr && children(tr, "w:tc")[col];
  if (!tc) throw new OfficeError(`Cella r${row}.c${col} inesistente.`);
  const [first, ...rest] = children(tc, "w:p");
  replaceParagraph(ctx, first, text);
  for (const p of rest) deleteParagraph(ctx, p);
}

// Spezza un run puro in due nel punto offset del testo del paragrafo.
function boundary(ctx: Context, p: Element, offset: number) {
  let pos = 0;
  for (const r of runsOf(p)) {
    const text = runText(r);
    if (offset > pos && offset < pos + text.length) {
      if (!isPureText(r)) return false;
      const copy = r.cloneNode(true) as Element;
      setRunText(ctx, r, text.slice(0, offset - pos));
      setRunText(ctx, copy, text.slice(offset - pos));
      insertAfter(copy, r);
      return true;
    }
    pos += text.length;
  }
  return true;
}

function replaceInParagraph(ctx: Context, p: Element, find: string, replace: string) {
  const full = paragraphText(p);
  const starts: number[] = [];
  for (let i = full.indexOf(find); i >= 0; i = full.indexOf(find, i + find.length)) starts.push(i);
  let done = 0;
  // Dall'ultima occorrenza alla prima: gli offset delle precedenti restano validi.
  for (const start of starts.reverse()) {
    const end = start + find.length;
    if (!boundary(ctx, p, start) || !boundary(ctx, p, end)) continue;
    let pos = 0;
    const covered: Element[] = [];
    for (const r of runsOf(p)) {
      const length = runText(r).length;
      if (length && pos >= start && pos + length <= end) covered.push(r);
      pos += length;
    }
    if (!covered.length || !covered.every(isPureText)) continue;
    const rPr = child(covered[0], "w:rPr");
    if (replace) {
      const run = newRun(ctx, rPr, replace);
      const anchor = covered[ctx.track ? covered.length - 1 : 0];
      if (ctx.track) insertAfter(run, anchor);
      else anchor.parentNode!.insertBefore(run, anchor);
    }
    for (const r of covered) dropRun(ctx, r);
    done++;
  }
  return done;
}

// Applica le operazioni (id dei blocchi della lettura, risolti prima di modificare) e restituisce il pacchetto aggiornato.
export function editWord(parts: Parts, operations: WordOperation[], options: { track: boolean; author: string }) {
  const doc = readXml(parts, DOCUMENT);
  const ctx: Context = {
    doc,
    styles: readStyles(parts),
    track: options.track,
    author: options.author,
    date: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    nextId: 100_000_000 + Math.floor(Math.random() * 1_000_000),
  };
  const blocks = blocksOf(doc);
  const blockAt = (id: string) => {
    const block = /^b(\d+)$/.test(id) ? blocks[Number(id.slice(1))] : undefined;
    if (!block) throw new OfficeError(`Blocco ${id} inesistente: usa gli id restituiti da read_project_file.`);
    return block;
  };
  let replacements = 0;
  for (const operation of operations) {
    switch (operation.op) {
      case "replace_block": {
        const block = blockAt(operation.block);
        if (block.tagName !== "w:p") throw new OfficeError(`${operation.block} non è un paragrafo: per le tabelle usa set_cell.`);
        replaceParagraph(ctx, block, operation.text);
        break;
      }
      case "insert_after":
        insertParagraphs(ctx, blockAt(operation.block), operation.paragraphs);
        break;
      case "delete_block":
        deleteBlock(ctx, blockAt(operation.block));
        break;
      case "set_cell":
        setCell(ctx, blockAt(operation.block), operation.row, operation.col, operation.text);
        break;
      case "find_replace": {
        if (!operation.find) throw new OfficeError("find vuoto.");
        const scope = operation.block ? blockAt(operation.block) : bodyOf(doc);
        const paragraphs = scope.tagName === "w:p" ? [scope] : all(scope, "w:p");
        for (const p of paragraphs) replacements += replaceInParagraph(ctx, p, operation.find, operation.replace);
        break;
      }
    }
  }
  writeXml(parts, DOCUMENT, doc);
  return { operations: operations.length, replacements };
}
