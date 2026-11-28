// Tipo di un documento ASDP dal percorso e dal frontespizio, contro il catalogo document_types.
// Lo usano l'indice (src/lib/documents/) e la creazione dei documenti.

export type DocumentType = { code: string; folder: string };

// Tipo del documento: prefisso del nome file (es. "T4.3-INDEX-…"), poi template_origine del
// frontespizio, infine la cartella se un solo tipo la usa.
export function detectType(
  path: string,
  docsRoot: string,
  frontMatter: Record<string, unknown>,
  types: DocumentType[],
) {
  const byLength = [...types].sort((a, b) => b.code.length - a.code.length);
  const fileName = path.split("/").pop()!.toUpperCase();
  const fromName = byLength.find((t) => fileName.startsWith(t.code.toUpperCase()));
  if (fromName) return fromName.code;
  // Task + Scaffold di una User Story: "T4.3-F02-US01.md" (non comincia con "T4.3-part").
  if (/^T4\.3-F\d+-US\d+/.test(fileName) && types.some((t) => t.code === "T4.3-part")) return "T4.3-part";

  const origin = String(frontMatter.template_origine ?? "").split(" ")[0];
  const fromOrigin = types.find((t) => t.code === origin);
  if (fromOrigin) return fromOrigin.code;

  // Le cartelle del catalogo sono scritte con la radice predefinita "asdp/".
  const relative = path.slice(docsRoot.length);
  const inFolder = types.filter((t) => relative.startsWith(`${t.folder.replace(/^asdp\//, "")}/`));
  return inFolder.length === 1 ? inFolder[0].code : null;
}
