import "server-only";
import type { Document, Element } from "@xmldom/xmldom";
import PptxGenJS from "pptxgenjs";
import {
  all,
  child,
  children,
  insertAfter,
  OfficeError,
  type Parts,
  readXml,
  relsName,
  removeNode,
  resolveTarget,
  writeXml,
} from "./package";

// PowerPoint (.pptx) slide per slide: le slide in ordine di presentazione (1, 2, …) e, in ognuna,
// le forme con testo per id. Si cambiano i testi e l'ordine/numero delle slide; grafica, layout e
// immagini restano quelli del file.

export type PowerPointOperation =
  | { op: "set_text"; slide: number; shape: number; paragraphs: string[] }
  | { op: "set_notes"; slide: number; text: string }
  | { op: "duplicate_slide"; slide: number; after?: number }
  | { op: "delete_slide"; slide: number }
  | { op: "move_slide"; slide: number; after: number };

const PRESENTATION = "ppt/presentation.xml";
const PRESENTATION_RELS = "ppt/_rels/presentation.xml.rels";
const CONTENT_TYPES = "[Content_Types].xml";
const NOTES_TYPE = "/notesSlide";

type Deck = {
  parts: Parts;
  presentation: Document;
  rels: Document;
  types: Document;
  list: Element; // p:sldIdLst
  slides: { sldId: Element; rel: Element; part: string }[];
};

function openDeck(parts: Parts): Deck {
  const presentation = readXml(parts, PRESENTATION);
  const rels = readXml(parts, PRESENTATION_RELS);
  const list = all(presentation, "p:sldIdLst")[0];
  const byId = new Map(all(rels, "Relationship").map((r) => [r.getAttribute("Id"), r]));
  const slides = (list ? children(list, "p:sldId") : []).map((sldId) => {
    const rel = byId.get(sldId.getAttribute("r:id"))!;
    return { sldId, rel, part: resolveTarget(PRESENTATION, rel.getAttribute("Target")!) };
  });
  return { parts, presentation, rels, types: readXml(parts, CONTENT_TYPES), list, slides };
}

const relationsOf = (parts: Parts, part: string) => (parts[relsName(part)] ? all(readXml(parts, relsName(part)), "Relationship") : []);

function notesPart(parts: Parts, slidePart: string) {
  const rel = relationsOf(parts, slidePart).find((r) => r.getAttribute("Type")?.endsWith(NOTES_TYPE));
  return rel ? resolveTarget(slidePart, rel.getAttribute("Target")!) : null;
}

const shapeId = (sp: Element) => Number(all(sp, "p:cNvPr")[0]?.getAttribute("id"));
const placeholder = (sp: Element) => {
  const ph = all(sp, "p:ph")[0];
  return ph ? ph.getAttribute("type") || "body" : null;
};
const textShapes = (doc: Document) => all(doc, "p:sp").filter((sp) => child(sp, "p:txBody"));

function paragraphText(p: Element) {
  return children(p)
    .map((c) => (c.tagName === "a:r" || c.tagName === "a:fld" ? all(c, "a:t").map((t) => t.textContent).join("") : c.tagName === "a:br" ? "\n" : ""))
    .join("");
}

const level = (p: Element) => Number(child(p, "a:pPr")?.getAttribute("lvl") ?? 0);

function notesText(parts: Parts, slidePart: string) {
  const part = notesPart(parts, slidePart);
  if (!part || !parts[part]) return null;
  const body = textShapes(readXml(parts, part)).find((sp) => placeholder(sp) === "body");
  return body ? children(child(body, "p:txBody"), "a:p").map(paragraphText).join("\n").trim() : "";
}

// Testo della presentazione: per ogni slide le forme con id, segnaposto e paragrafi, poi le note.
export function readPowerPoint(parts: Parts) {
  const deck = openDeck(parts);
  return deck.slides
    .map(({ part }, i) => {
      const doc = readXml(parts, part);
      const lines = [`## Slide ${i + 1}`];
      for (const sp of textShapes(doc)) {
        const paragraphs = children(child(sp, "p:txBody"), "a:p");
        const ph = placeholder(sp);
        lines.push(`[shape ${shapeId(sp)}]${ph ? ` (${ph})` : ""} ${all(sp, "p:cNvPr")[0]?.getAttribute("name") ?? ""}`);
        for (const p of paragraphs) lines.push(`${"  ".repeat(level(p) + 1)}${paragraphText(p)}`);
      }
      for (const table of all(doc, "a:tbl")) {
        lines.push("(tabella, solo lettura)");
        for (const tr of children(table, "a:tr"))
          lines.push(`  | ${children(tr, "a:tc").map((tc) => all(tc, "a:p").map(paragraphText).join(" ")).join(" | ")} |`);
      }
      const notes = notesText(parts, part);
      lines.push(notes === null ? "Note: (nessuna)" : `Note: ${notes || "(vuote)"}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

// a:rPr dal formato del primo run del paragrafo (o del segno di fine paragrafo).
function runProps(doc: Document, p: Element) {
  const rPr = all(p, "a:rPr")[0];
  if (rPr) return rPr.cloneNode(true) as Element;
  const end = child(p, "a:endParaRPr");
  if (!end) return null;
  const copy = doc.createElement("a:rPr");
  for (const attr of Array.from(end.attributes)) copy.setAttribute(attr.name, attr.value);
  for (const c of children(end)) copy.appendChild(c.cloneNode(true));
  return copy;
}

// Sostituisce i paragrafi del corpo di testo; il paragrafo nuovo i prende il formato del vecchio i (o dell'ultimo).
function setParagraphs(doc: Document, txBody: Element, texts: string[]) {
  const old = children(txBody, "a:p");
  const created = texts.map((text, i) => {
    const template = old[Math.min(i, old.length - 1)];
    const p = doc.createElement("a:p");
    const pPr = template && child(template, "a:pPr");
    if (pPr) p.appendChild(pPr.cloneNode(true));
    const rPr = template ? runProps(doc, template) : null;
    text.split("\n").forEach((line, j) => {
      if (j > 0) p.appendChild(doc.createElement("a:br"));
      if (!line) return;
      const r = doc.createElement("a:r");
      if (rPr) r.appendChild(rPr.cloneNode(true));
      const t = doc.createElement("a:t");
      t.appendChild(doc.createTextNode(line));
      r.appendChild(t);
      p.appendChild(r);
    });
    const end = template && child(template, "a:endParaRPr");
    if (end) p.appendChild(end.cloneNode(true));
    return p;
  });
  for (const p of old) removeNode(p);
  for (const p of created) txBody.appendChild(p);
}

function setShapeText(parts: Parts, part: string, shape: number, texts: string[]) {
  const doc = readXml(parts, part);
  const sp = textShapes(doc).find((s) => shapeId(s) === shape);
  if (!sp) throw new OfficeError(`Forma ${shape} senza testo o inesistente nella slide: usa gli id di read_project_file.`);
  setParagraphs(doc, child(sp, "p:txBody"), texts.length ? texts : [""]);
  writeXml(parts, part, doc);
}

// --- Sezioni (p14:sectionLst): ogni slide deve stare in una sezione, nell'ordine delle slide ---

const sectionLists = (deck: Deck) => all(deck.presentation, "p14:section");

function syncSections(deck: Deck, placed: Set<string>) {
  const sections = sectionLists(deck);
  if (!sections.length) return;
  const sectionOf = new Map<string, number>();
  sections.forEach((s, i) => all(s, "p14:sldId").forEach((id) => sectionOf.set(id.getAttribute("id")!, i)));
  const order = children(deck.list, "p:sldId").map((s) => s.getAttribute("id")!);
  // Le slide spostate o nuove prendono la sezione della precedente (della successiva se sono prime);
  // poi le sezioni non tornano mai indietro, così restano contigue.
  const assigned = order.map((id, i) =>
    placed.has(id) || !sectionOf.has(id) ? (sectionOf.get(order[i - 1]) ?? sectionOf.get(order[i + 1]) ?? 0) : sectionOf.get(id)!,
  );
  for (let i = 1; i < assigned.length; i++) assigned[i] = Math.max(assigned[i], assigned[i - 1]);
  sections.forEach((section, i) => {
    let list = all(section, "p14:sldIdLst")[0];
    if (!list) section.appendChild((list = deck.presentation.createElement("p14:sldIdLst")));
    for (const id of children(list)) removeNode(id);
    order.forEach((id, j) => {
      if (assigned[j] !== i) return;
      const entry = deck.presentation.createElement("p14:sldId");
      entry.setAttribute("id", id);
      list.appendChild(entry);
    });
  });
}

// --- Struttura ---

const nextNumber = (values: (string | null)[], pattern: RegExp) =>
  Math.max(0, ...values.map((v) => Number(pattern.exec(v ?? "")?.[1] ?? 0))) + 1;

function override(deck: Deck, part: string) {
  return all(deck.types, "Override").find((o) => o.getAttribute("PartName") === `/${part}`);
}

function removePart(deck: Deck, part: string) {
  delete deck.parts[part];
  delete deck.parts[relsName(part)];
  const entry = override(deck, part);
  if (entry) removeNode(entry);
}

function duplicateSlide(deck: Deck, source: Deck["slides"][number], after: Element | null) {
  const n = nextNumber(Object.keys(deck.parts), /^ppt\/slides\/slide(\d+)\.xml$/);
  const part = `ppt/slides/slide${n}.xml`;
  deck.parts[part] = deck.parts[source.part].slice();
  const rels = deck.parts[relsName(source.part)];
  if (rels) {
    // Le note non si condividono tra due slide: la copia nasce senza.
    const doc = readXml(deck.parts, relsName(source.part));
    for (const r of all(doc, "Relationship")) if (r.getAttribute("Type")?.endsWith(NOTES_TYPE)) removeNode(r);
    writeXml(deck.parts, relsName(part), doc);
  }
  const type = override(deck, source.part);
  if (type) {
    const entry = type.cloneNode(true) as Element;
    entry.setAttribute("PartName", `/${part}`);
    insertAfter(entry, type);
  }
  const rel = source.rel.cloneNode(true) as Element;
  const relId = `rId${nextNumber(all(deck.rels, "Relationship").map((r) => r.getAttribute("Id")), /^rId(\d+)$/)}`;
  rel.setAttribute("Id", relId);
  rel.setAttribute("Target", `slides/slide${n}.xml`);
  deck.rels.documentElement!.appendChild(rel);
  const sldId = deck.presentation.createElement("p:sldId");
  const id = String(Math.max(255, ...children(deck.list, "p:sldId").map((s) => Number(s.getAttribute("id")))) + 1);
  sldId.setAttribute("id", id);
  sldId.setAttribute("r:id", relId);
  if (after) insertAfter(sldId, after);
  else deck.list.insertBefore(sldId, deck.list.firstChild);
  return id;
}

function deleteSlide(deck: Deck, slide: Deck["slides"][number]) {
  const notes = notesPart(deck.parts, slide.part);
  if (notes) removePart(deck, notes);
  removePart(deck, slide.part);
  removeNode(slide.rel);
  removeNode(slide.sldId);
  for (const id of all(deck.presentation, "p14:sldId")) if (id.getAttribute("id") === slide.sldId.getAttribute("id")) removeNode(id);
}

// Applica le operazioni (numeri di slide della lettura, risolti prima di modificare).
export function editPowerPoint(parts: Parts, operations: PowerPointOperation[]) {
  const deck = openDeck(parts);
  const slideAt = (n: number) => {
    const slide = deck.slides[n - 1];
    if (!slide) throw new OfficeError(`Slide ${n} inesistente: la presentazione ne ha ${deck.slides.length}.`);
    return slide;
  };
  // after = 0: in testa; altrimenti dopo la slide indicata.
  const deleted = new Set<number>();
  const anchor = (after: number) => {
    if (deleted.has(after)) throw new OfficeError(`La slide ${after} è già stata eliminata.`);
    return after === 0 ? null : slideAt(after).sldId;
  };
  const placed = new Set<string>();
  for (const operation of operations) {
    if ("slide" in operation && deleted.has(operation.slide)) throw new OfficeError(`La slide ${operation.slide} è già stata eliminata.`);
    switch (operation.op) {
      case "set_text":
        setShapeText(parts, slideAt(operation.slide).part, operation.shape, operation.paragraphs);
        break;
      case "set_notes": {
        const notes = notesPart(parts, slideAt(operation.slide).part);
        const doc = notes && parts[notes] ? readXml(parts, notes) : null;
        const body = doc && textShapes(doc).find((sp) => placeholder(sp) === "body");
        if (!doc || !body) throw new OfficeError(`La slide ${operation.slide} non ha le note: aggiungile da PowerPoint.`);
        setParagraphs(doc, child(body, "p:txBody"), operation.text.split("\n"));
        writeXml(parts, notes!, doc);
        break;
      }
      case "duplicate_slide": {
        const source = slideAt(operation.slide);
        const after = operation.after ?? operation.slide;
        placed.add(duplicateSlide(deck, source, anchor(after)));
        break;
      }
      case "delete_slide":
        deleteSlide(deck, slideAt(operation.slide));
        deleted.add(operation.slide);
        break;
      case "move_slide": {
        const slide = slideAt(operation.slide);
        if (operation.after === operation.slide) break;
        const target = anchor(operation.after);
        removeNode(slide.sldId);
        if (target) insertAfter(slide.sldId, target);
        else deck.list.insertBefore(slide.sldId, deck.list.firstChild);
        placed.add(slide.sldId.getAttribute("id")!);
        break;
      }
    }
  }
  if (!children(deck.list, "p:sldId").length) throw new OfficeError("La presentazione resterebbe senza slide.");
  syncSections(deck, placed);
  writeXml(parts, PRESENTATION, deck.presentation);
  writeXml(parts, PRESENTATION_RELS, deck.rels);
  writeXml(parts, CONTENT_TYPES, deck.types);
  return { operations: operations.length, slides: children(deck.list, "p:sldId").length };
}

export type OutlineSlide = { title: string; bullets?: string[]; notes?: string };

// Presentazione nuova da una scaletta, grafica di base (16:9, titolo e punti).
export async function outlinePowerPoint(slides: OutlineSlide[], title: string) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = title;
  slides.forEach(({ title: heading, bullets, notes }, i) => {
    const slide = pptx.addSlide();
    if (!bullets?.length) {
      slide.addText(heading, { x: 0.8, y: i === 0 ? 2.6 : 0.5, w: 11.7, h: 1.6, fontSize: i === 0 ? 40 : 32, bold: true, align: i === 0 ? "center" : "left" });
    } else {
      slide.addText(heading, { x: 0.6, y: 0.4, w: 12.1, h: 1, fontSize: 30, bold: true });
      slide.addText(
        bullets.map((text) => ({ text, options: { bullet: true, breakLine: true } })),
        { x: 0.6, y: 1.6, w: 12.1, h: 5.4, fontSize: 20, valign: "top" },
      );
    }
    if (notes) slide.addNotes(notes);
  });
  return (await pptx.write({ outputType: "uint8array" })) as Uint8Array;
}
