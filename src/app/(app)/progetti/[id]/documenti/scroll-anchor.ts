// Punto di lettura del documento: il blocco in cima all'area visibile e dove sta sullo schermo, per
// ritrovarlo fermo nello stesso punto passando da lettura a modifica e ritorno. Lettura ed editor
// hanno gli stessi blocchi di primo livello nello stesso ordine (data-block in lettura, figli di
// .ProseMirror nell'editor); il testo d'inizio conferma il blocco quando l'ordine non basta.

export type Block = { element: HTMLElement; index: number };
// top: posizione sullo schermo; hidden: quanto del blocco era sotto la linea (intestazione e barra).
export type Anchor = { index: number; text: string; top: number; hidden: number };

const textOf = (element: HTMLElement) => (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
const sameText = (a: string, b: string) => a !== "" && b !== "" && (a.startsWith(b) || b.startsWith(a));

export const readBlocks = (container: string): Block[] =>
  [...document.querySelectorAll<HTMLElement>(`#${container} [data-block]`)].map((element) => ({
    element,
    index: Number(element.dataset.block),
  }));

export const editorBlocks = (container: string): Block[] =>
  [...document.querySelectorAll<HTMLElement>(`#${container} .ProseMirror > *`)].map((element, index) => ({
    element,
    index,
  }));

export function anchorOf(block: Block, line: number): Anchor {
  const top = block.element.getBoundingClientRect().top;
  return { index: block.index, text: textOf(block.element), top, hidden: Math.max(line - top, 0) };
}

// Il primo blocco che si vede sotto la linea (bordo inferiore di intestazione e barra dell'editor).
export function captureAnchor(blocks: Block[], line: number): Anchor | null {
  const first = blocks.find((b) => b.element.getBoundingClientRect().bottom > line);
  return first ? anchorOf(first, line) : null;
}

// Scorre finché il blocco torna dov'era. Se era tagliato dalla linea resta tagliato della stessa
// parte; se ora finirebbe sotto la barra dell'editor, va appena sotto.
export function restoreAnchor(blocks: Block[], anchor: Anchor, line: number) {
  const block =
    blocks.find((b) => b.index === anchor.index && sameText(textOf(b.element), anchor.text)) ??
    blocks
      .filter((b) => sameText(textOf(b.element), anchor.text))
      .sort((a, b) => Math.abs(a.index - anchor.index) - Math.abs(b.index - anchor.index))[0] ??
    blocks.find((b) => b.index === anchor.index);
  if (!block) return;
  const top = anchor.hidden > 0 ? line - anchor.hidden : Math.max(anchor.top, line);
  window.scrollBy(0, block.element.getBoundingClientRect().top - top);
}
