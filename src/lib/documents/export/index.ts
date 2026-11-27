import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { readDocument } from "@/lib/documents";
import { documentDocx } from "./docx";
import { htmlToPdf } from "./pdf";

// Esportazione di un documento ASDP in un file: un solo motore (Markdown → documento) usato dal
// download e dalla pubblicazione su Teams. Un formato nuovo = una voce in FORMATS.

export type Cover = {
  title: string;
  rows: [string, string][];
  draft: boolean;
  note: string;
};

export type ExportSource = { cover: Cover; tree: Root; markdown: string };

type Format = {
  label: string;
  extension: string;
  mime: string;
  render: (source: ExportSource) => Promise<Uint8Array>;
};

export const FORMATS = {
  pdf: { label: "PDF", extension: "pdf", mime: "application/pdf", render: (s) => htmlToPdf(documentHtml(s)) },
  docx: {
    label: "Word",
    extension: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    render: documentDocx,
  },
  md: {
    label: "Markdown",
    extension: "md",
    mime: "text/markdown; charset=utf-8",
    render: async (s) => new TextEncoder().encode(s.markdown),
  },
} satisfies Record<string, Format>;

export type ExportFormat = keyof typeof FORMATS;
export const EXPORT_FORMATS = Object.keys(FORMATS) as ExportFormat[];

const text = (value: unknown) => (value == null ? "" : String(value).trim());
const dateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "long" });

// Dati del documento pronti per l'esportazione; null se l'utente non lo vede (RLS) o non è Markdown.
export async function exportSource(supabase: SupabaseClient, projectId: string, path: string) {
  const [document, { data: project }] = await Promise.all([
    readDocument(supabase, projectId, path),
    supabase.from("projects").select("name, client").eq("id", projectId).maybeSingle(),
  ]);
  if (!document || document.body === null) return null;

  const front = document.frontMatter;
  const tree = unified().use(remarkParse).use(remarkGfm).parse(document.body) as Root;
  // Titolo come nella pagina del documento: frontespizio, primo titolo, nome del file.
  const first = tree.children[0];
  const heading = first?.type === "heading" && first.depth === 1 ? first.children.map((c) => ("value" in c ? c.value : "")).join("") : null;
  const title = text(front.titolo) || heading || path.split("/").pop()!.replace(/\.md$/, "");
  if (heading && heading === title) tree.children.shift();

  const approved = front.stato === "Approvato";
  const rows: [string, string][] = [
    ["Progetto", text(project?.name)],
    ["Cliente", text(front.cliente) || text(project?.client)],
    ["Documento", [document.documentType, text(front.id)].filter(Boolean).join(" · ")],
    ["Versione", text(front.versione)],
    ["Stato", text(front.stato)],
    ["Approvato da", text(front.approvato_da)],
    ["Approvato il", text(front.approvato_il)],
    ["Versione approvata", text(front.versione_approvata)],
  ];

  const cover: Cover = {
    title,
    rows: rows.filter(([, value]) => value),
    draft: !approved,
    note: `Copia esportata dalla workspace ASDP il ${dateFormat.format(new Date())}: la fonte è l'app.`,
  };
  return {
    source: { cover, tree, markdown: document.content } satisfies ExportSource,
    documentType: document.documentType,
    lastCommitId: document.lastCommitId,
    frontMatter: front,
    title,
  };
}

// Nome del file: "<tipo> – <titolo>.<ext>", senza caratteri vietati da SharePoint e Windows.
export function exportFileName(documentType: string | null, title: string, format: ExportFormat) {
  const base = [documentType, title].filter(Boolean).join(" – ").replace(/[\\/:*?"<>|#%]+/g, " ").replace(/\s+/g, " ").trim();
  return `${base.slice(0, 120)}.${FORMATS[format].extension}`;
}

export async function exportDocument(supabase: SupabaseClient, projectId: string, path: string, format: ExportFormat) {
  const data = await exportSource(supabase, projectId, path);
  if (!data) return null;
  const spec = FORMATS[format];
  return {
    bytes: await spec.render(data.source),
    fileName: exportFileName(data.documentType, data.title, format),
    mime: spec.mime,
  };
}

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// HTML di stampa (base del PDF). Colori neutri da documento stampato: non è UI dell'app.
function documentHtml({ cover, tree }: ExportSource) {
  const processor = unified().use(remarkRehype).use(rehypeStringify);
  const body = processor.stringify(processor.runSync(tree));
  const rows = cover.rows.map(([k, v]) => `<tr><th>${escape(k)}</th><td>${escape(v)}</td></tr>`).join("");
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${escape(cover.title)}</title><style>
  @page { size: A4; margin: 18mm 16mm 20mm; }
  body { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1a1a1a; }
  h1 { font-size: 20pt; margin: 0 0 8pt; } h2 { font-size: 15pt; margin: 18pt 0 6pt; } h3 { font-size: 12.5pt; margin: 14pt 0 4pt; }
  h4, h5, h6 { font-size: 11pt; margin: 12pt 0 4pt; } h2, h3, h4 { break-after: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 9.5pt; } tr { break-inside: avoid; }
  th, td { border: 1px solid #c8c8c8; padding: 4pt 6pt; text-align: left; vertical-align: top; } th { background: #f2f2f2; }
  code { font-family: Consolas, "JetBrains Mono", monospace; font-size: 9pt; background: #f2f2f2; padding: 0 2pt; }
  pre { background: #f2f2f2; padding: 8pt; white-space: pre-wrap; } pre code { padding: 0; }
  blockquote { border-left: 3px solid #c8c8c8; margin: 8pt 0; padding: 0 10pt; color: #555; }
  a { color: #1a4fa0; } hr { border: 0; border-top: 1px solid #c8c8c8; }
  .cover { border-bottom: 2px solid #1a1a1a; padding-bottom: 10pt; margin-bottom: 14pt; }
  .cover table { width: auto; font-size: 9.5pt; } .cover th, .cover td { border: 0; background: none; padding: 1pt 12pt 1pt 0; }
  .cover th { color: #555; font-weight: normal; }
  .draft { display: inline-block; border: 1px solid #b00020; color: #b00020; padding: 1pt 6pt; font-size: 9pt; margin-bottom: 6pt; }
  .note { color: #555; font-size: 8.5pt; margin-top: 6pt; }
</style></head><body>
<header class="cover">${cover.draft ? `<div class="draft">Bozza – non approvato</div>` : ""}<h1>${escape(cover.title)}</h1>
<table>${rows}</table><p class="note">${escape(cover.note)}</p></header>
${body}</body></html>`;
}
