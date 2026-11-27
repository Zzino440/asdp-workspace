import "server-only";
import { DOMParser, XMLSerializer, type Document, type Element } from "@xmldom/xmldom";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

// Pacchetto Office (docx, pptx, xlsx = zip di parti XML): si apre, si modificano le parti come DOM
// e si richiude lasciando invariato tutto il resto (stili, immagini, intestazioni).

export class OfficeError extends Error {}

export type Parts = Record<string, Uint8Array>;

export function openPackage(bytes: Uint8Array): Parts {
  try {
    return unzipSync(bytes);
  } catch {
    throw new OfficeError("Il file non è un documento Office valido (docx, pptx o xlsx).");
  }
}

export const savePackage = (parts: Parts) => zipSync(parts);

export function readXml(parts: Parts, name: string): Document {
  const part = parts[name];
  if (!part) throw new OfficeError(`Parte mancante nel file: ${name}`);
  return new DOMParser().parseFromString(strFromU8(part), "text/xml");
}

export function writeXml(parts: Parts, name: string, doc: Document) {
  parts[name] = strToU8(new XMLSerializer().serializeToString(doc));
}

export const writeText = (parts: Parts, name: string, text: string) => {
  parts[name] = strToU8(text);
};

// Figli elemento con quel nome qualificato ("w:p"); i discendenti con all.
export const children = (node: Element, name?: string) =>
  Array.from(node.childNodes).filter(
    (n): n is Element => n.nodeType === 1 && (!name || (n as Element).tagName === name),
  );
export const child = (node: Element, name: string) => children(node, name)[0];
export const all = (node: Element | Document, name: string) => Array.from(node.getElementsByTagName(name));

export const removeNode = (node: Element) => node.parentNode?.removeChild(node);
export const insertAfter = (node: Element, reference: Element) =>
  reference.parentNode!.insertBefore(node, reference.nextSibling);

// Relazioni di una parte ("ppt/slides/slide1.xml" → "ppt/slides/_rels/slide1.xml.rels").
export const relsName = (part: string) => {
  const slash = part.lastIndexOf("/");
  return `${part.slice(0, slash)}/_rels/${part.slice(slash + 1)}.rels`;
};

// Destinazione di una relazione risolta rispetto alla cartella della parte.
export function resolveTarget(part: string, target: string) {
  if (target.startsWith("/")) return target.slice(1);
  const segments = part.split("/").slice(0, -1);
  for (const piece of target.split("/")) {
    if (piece === "..") segments.pop();
    else if (piece !== ".") segments.push(piece);
  }
  return segments.join("/");
}
