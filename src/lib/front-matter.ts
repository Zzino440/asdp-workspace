import { parse, parseDocument, stringify } from "yaml";

export type FieldValue = string | number | boolean | null | FieldValue[];

// Sostituisce nel YAML del frontespizio solo il testo dei valori indicati: commenti, allineamenti
// e tutto il resto restano identici. Le chiavi che mancano si aggiungono in fondo.
export function setFrontMatterFields(source: string, changes: Record<string, FieldValue>) {
  const doc = parseDocument(source);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const missing: string[] = [];
  const edits = Object.entries(changes).flatMap(([key, value]) => {
    // Campo svuotato: null, come nei template GUIDA-FRONT.
    const text = stringify(value, { collectionStyle: "flow", flowCollectionPadding: false }).trimEnd();
    const range = (doc.get(key, true) as { range?: [number, number, number] } | undefined)?.range;
    if (!range) {
      missing.push(`${key}: ${text}`);
      return [];
    }
    return [{ start: range[0], end: range[1], text }];
  });
  let out = source;
  for (const { start, end, text } of edits.sort((a, b) => b.start - a.start)) {
    // Valore vuoto ("gate:" o "gate:   # commento"): spazio dopo i due punti e prima del commento.
    const prefix = start === end && out[start - 1] === ":" ? " " : "";
    const suffix = start === end && out[end] === "#" ? " " : "";
    out = out.slice(0, start) + prefix + text + suffix + out.slice(end);
  }
  return missing.length > 0 ? `${out.replace(/\s*$/, "")}${newline}${missing.join(newline)}` : out;
}

// Frontespizio GUIDA-FRONT: blocco YAML tra due righe "---" in testa al file.
export function splitFrontMatter(content: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (!match) return { frontMatter: {} as Record<string, unknown>, frontMatterSource: null, body: content };
  const parsed: unknown = parse(match[1]);
  return {
    frontMatter: (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>,
    frontMatterSource: match[1],
    body: content.slice(match[0].length),
  };
}
