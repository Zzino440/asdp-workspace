import "server-only";
import { strToU8, zipSync } from "fflate";
import type { Graph } from "@/lib/microsoft";
import { OfficeError } from "./package";

// Excel con l'API Workbook di Graph: lettura e modifica sul file in SharePoint, senza scaricarlo
// (formattazione, grafici e co-authoring restano di Excel). La creazione genera un .xlsx minimo.

export type Cell = string | number | boolean | null;

export type ExcelOperation =
  | { op: "set_range"; sheet: string; address: string; values?: Cell[][]; formulas?: Cell[][] }
  | { op: "clear_range"; sheet: string; address: string }
  | { op: "add_sheet"; name: string }
  | { op: "rename_sheet"; sheet: string; name: string }
  | { op: "delete_sheet"; sheet: string }
  | { op: "append_table_rows"; table: string; values: Cell[][] };

const MAX_CELLS = 20_000;

const workbook = (driveId: string, itemId: string) => `/drives/${driveId}/items/${itemId}/workbook`;
const sheetPath = (sheet: string) => `/worksheets/${encodeURIComponent(sheet)}`;
const rangePath = (address: string) => `/range(address='${encodeURIComponent(address)}')`;

export const columnName = (index: number) => {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
};
const columnIndex = (name: string) => [...name].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

type Range = { address: string; values: Cell[][]; formulas: Cell[][] };

// Testo di un intervallo: intestazione con le colonne, poi una riga per riga del foglio con il suo
// numero; per le celle con formula si mostra la formula.
function renderRange(range: Range, budget: number) {
  const start = /!?\$?([A-Z]+)\$?(\d+)/.exec(range.address.split("!").pop() ?? "A1") ?? ["", "A", "1"];
  const [col, row] = [columnIndex(start[1]), Number(start[2])];
  const width = range.values[0]?.length ?? 0;
  const lines = [`    ${Array.from({ length: width }, (_, i) => columnName(col + i)).join(" | ")}`];
  let cells = 0;
  for (const [i, values] of range.values.entries()) {
    if (cells + values.length > budget) return { text: lines.join("\n"), cells, truncated: true };
    cells += values.length;
    const shown = values.map((v, j) => {
      const formula = range.formulas?.[i]?.[j];
      return typeof formula === "string" && formula.startsWith("=") ? formula : String(v ?? "");
    });
    lines.push(`${row + i}: ${shown.join(" | ")}`);
  }
  return { text: lines.join("\n"), cells, truncated: false };
}

export async function readExcel(graph: Graph, driveId: string, itemId: string, options: { sheet?: string; range?: string }) {
  const base = workbook(driveId, itemId);
  const [{ value: sheets }, { value: tables }] = await Promise.all([
    graph<{ value: { name: string; visibility: string }[] }>(`${base}/worksheets?$select=name,visibility`),
    graph<{ value: { name: string }[] }>(`${base}/tables?$select=name`),
  ]);
  const wanted = options.sheet ? sheets.filter((s) => s.name.toLowerCase() === options.sheet!.toLowerCase()) : sheets;
  if (options.sheet && !wanted.length) throw new OfficeError(`Foglio "${options.sheet}" inesistente. Fogli: ${sheets.map((s) => s.name).join(", ")}`);
  const parts = [`Fogli: ${sheets.map((s) => `${s.name}${s.visibility === "Visible" ? "" : " (nascosto)"}`).join(", ")}`];
  if (tables.length) parts.push(`Tabelle: ${tables.map((t) => t.name).join(", ")}`);
  let budget = MAX_CELLS;
  let truncated = false;
  for (const sheet of wanted) {
    const target = options.range ? rangePath(options.range) : "/usedRange(valuesOnly=true)";
    const range = await graph<Range>(`${base}${sheetPath(sheet.name)}${target}?$select=address,values,formulas`);
    const rendered = renderRange(range, budget);
    parts.push(`## ${sheet.name} (${range.address.split("!").pop()})\n${rendered.text}`);
    budget -= rendered.cells;
    if (rendered.truncated || budget <= 0) {
      truncated = true;
      break;
    }
  }
  return { text: parts.join("\n\n"), truncated };
}

// Operazioni in una sessione persistente: chi ha il file aperto in Excel vede le modifiche dal vivo.
export async function editExcel(graph: Graph, driveId: string, itemId: string, operations: ExcelOperation[]) {
  const base = workbook(driveId, itemId);
  const json = (method: string, body: unknown, session?: string): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json", ...(session && { "workbook-session-id": session }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const { id: session } = await graph<{ id: string }>(`${base}/createSession`, json("POST", { persistChanges: true }));
  try {
    for (const operation of operations) {
      switch (operation.op) {
        case "set_range": {
          const data = operation.formulas ? { formulas: operation.formulas } : operation.values ? { values: operation.values } : null;
          if (!data) throw new OfficeError("set_range richiede values o formulas.");
          await graph(`${base}${sheetPath(operation.sheet)}${rangePath(operation.address)}`, json("PATCH", data, session));
          break;
        }
        case "clear_range":
          await graph(`${base}${sheetPath(operation.sheet)}${rangePath(operation.address)}/clear`, json("POST", { applyTo: "Contents" }, session));
          break;
        case "add_sheet":
          await graph(`${base}/worksheets/add`, json("POST", { name: operation.name }, session));
          break;
        case "rename_sheet":
          await graph(`${base}${sheetPath(operation.sheet)}`, json("PATCH", { name: operation.name }, session));
          break;
        case "delete_sheet":
          await graph(`${base}${sheetPath(operation.sheet)}`, { ...json("DELETE", undefined, session) });
          break;
        case "append_table_rows":
          await graph(`${base}/tables/${encodeURIComponent(operation.table)}/rows/add`, json("POST", { values: operation.values }, session));
          break;
      }
    }
  } finally {
    await graph(`${base}/closeSession`, json("POST", undefined, session)).catch(() => undefined);
  }
  return { operations: operations.length };
}

// --- Creazione: .xlsx minimo con i fogli e i dati indicati ---

export type NewSheet = { name: string; rows?: Cell[][]; header?: boolean };

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function cellXml(value: Cell, ref: string, bold: boolean) {
  const style = bold ? ' s="1"' : "";
  if (value === null || value === "") return "";
  if (typeof value === "number") return `<c r="${ref}"${style}><v>${value}</v></c>`;
  if (typeof value === "boolean") return `<c r="${ref}"${style} t="b"><v>${value ? 1 : 0}</v></c>`;
  if (value.startsWith("=")) return `<c r="${ref}"${style}><f>${escape(value.slice(1))}</f></c>`;
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`;
}

export function newWorkbook(sheets: NewSheet[]) {
  if (!sheets.length) throw new OfficeError("Serve almeno un foglio.");
  for (const { name } of sheets)
    if (!name || name.length > 31 || /[[\]:*?/\\]/.test(name)) throw new OfficeError(`Nome di foglio non valido: "${name}" (max 31 caratteri, senza [ ] : * ? / \\).`);
  const sheetXml = ({ rows = [], header }: NewSheet) =>
    `${XML}<worksheet xmlns="${MAIN}"><sheetData>${rows
      .map((row, r) => `<row r="${r + 1}">${row.map((v, c) => cellXml(v, `${columnName(c)}${r + 1}`, Boolean(header) && r === 0)).join("")}</row>`)
      .join("")}</sheetData></worksheet>`;
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        sheets
          .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
          .join("") +
        "</Types>",
    ),
    "_rels/.rels": strToU8(
      `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    "xl/workbook.xml": strToU8(
      `${XML}<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets>${sheets
        .map((s, i) => `<sheet name="${escape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join("")}</sheets><calcPr fullCalcOnLoad="1"/></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join("")}<Relationship Id="rId${sheets.length + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    ),
    "xl/styles.xml": strToU8(
      `${XML}<styleSheet xmlns="${MAIN}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    ),
  };
  sheets.forEach((s, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s))));
  return zipSync(files);
}
