import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { List, PhrasingContent, RootContent, TableRow as MdTableRow } from "mdast";
import type { ExportSource } from "./index";

// Markdown (mdast) → Word: titoli, paragrafi, elenchi, tabelle, codice, citazioni, link.
// I commenti HTML del testo (istruzioni dei template) non vengono esportati.

type Inline = TextRun | ExternalHyperlink;
type Marks = { bold?: boolean; italics?: boolean; strike?: boolean; code?: boolean };

const HEADINGS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];
const MONO = "Consolas";
const GREY = "F2F2F2";
const LINE = "C8C8C8";

const run = (text: string, marks: Marks) =>
  new TextRun({
    text,
    bold: marks.bold,
    italics: marks.italics,
    strike: marks.strike,
    font: marks.code ? MONO : undefined,
    shading: marks.code ? { type: ShadingType.CLEAR, fill: GREY, color: "auto" } : undefined,
  });

function inline(nodes: PhrasingContent[], marks: Marks = {}): Inline[] {
  return nodes.flatMap((node): Inline[] => {
    switch (node.type) {
      case "text":
        return [run(node.value, marks)];
      case "inlineCode":
        return [run(node.value, { ...marks, code: true })];
      case "strong":
        return inline(node.children, { ...marks, bold: true });
      case "emphasis":
        return inline(node.children, { ...marks, italics: true });
      case "delete":
        return inline(node.children, { ...marks, strike: true });
      case "break":
        return [new TextRun({ break: 1 })];
      case "link":
        return [
          new ExternalHyperlink({
            link: node.url,
            children: inline(node.children, marks).filter((r): r is TextRun => r instanceof TextRun),
          }),
        ];
      case "image":
        return [run(node.alt ? `[${node.alt}]` : "", marks)];
      default:
        return [];
    }
  });
}

const cellText = (row: MdTableRow, header: boolean) =>
  row.children.map(
    (cell) =>
      new TableCell({
        shading: header ? { type: ShadingType.CLEAR, fill: GREY, color: "auto" } : undefined,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({ children: inline(cell.children, { bold: header }) })],
      }),
  );

function list(node: List, level: number): (Paragraph | Table)[] {
  return node.children.flatMap((item) =>
    item.children.flatMap((child, i) => {
      if (child.type === "list") return list(child, level + 1);
      if (child.type !== "paragraph") return blocks([child], level);
      const box = i === 0 && item.checked != null ? [new TextRun(item.checked ? "☑ " : "☐ ")] : [];
      const children = [...box, ...inline(child.children)];
      // Le righe successive dello stesso punto restano rientrate, senza un nuovo pallino.
      if (i > 0) return [new Paragraph({ children, indent: { left: 720 * (level + 1) } })];
      return [
        node.ordered
          ? new Paragraph({ children, numbering: { reference: "ordered", level: Math.min(level, 5) } })
          : new Paragraph({ children, bullet: { level: Math.min(level, 5) } }),
      ];
    }),
  );
}

function blocks(nodes: RootContent[], level = 0): (Paragraph | Table)[] {
  return nodes.flatMap((node): (Paragraph | Table)[] => {
    switch (node.type) {
      case "heading":
        return [new Paragraph({ heading: HEADINGS[node.depth - 1], children: inline(node.children) })];
      case "paragraph":
        return [new Paragraph({ children: inline(node.children), spacing: { after: 120 } })];
      case "list":
        return list(node, level);
      case "code":
        return node.value.split("\n").map(
          (line) =>
            new Paragraph({
              children: [new TextRun({ text: line || " ", font: MONO, size: 18 })],
              shading: { type: ShadingType.CLEAR, fill: GREY, color: "auto" },
              spacing: { after: 0 },
            }),
        );
      case "blockquote":
        return node.children.flatMap((child) =>
          child.type === "paragraph"
            ? [
                new Paragraph({
                  children: inline(child.children, { italics: true }),
                  indent: { left: 360 },
                  border: { left: { style: BorderStyle.SINGLE, size: 12, color: LINE, space: 8 } },
                }),
              ]
            : blocks([child], level),
        );
      case "table": {
        const [head, ...rows] = node.children;
        return [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              ...(head ? [new TableRow({ tableHeader: true, children: cellText(head, true) })] : []),
              ...rows.map((row) => new TableRow({ children: cellText(row, false) })),
            ],
          }),
          new Paragraph({ children: [] }),
        ];
      }
      case "thematicBreak":
        return [new Paragraph({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LINE, space: 1 } } })];
      default:
        return [];
    }
  });
}

export async function documentDocx({ cover, tree }: ExportSource) {
  const header = [
    ...(cover.draft ? [new Paragraph({ children: [new TextRun({ text: "Bozza – non approvato", bold: true, color: "B00020" })] })] : []),
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(cover.title)] }),
    ...cover.rows.map(
      ([label, value]) =>
        new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: `${label}: `, color: "555555" }), new TextRun(value)] }),
    ),
    new Paragraph({
      children: [new TextRun({ text: cover.note, italics: true, color: "555555", size: 18 })],
      spacing: { before: 120, after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "1A1A1A", space: 6 } },
    }),
  ];

  const document = new Document({
    creator: "ASDP Workspace",
    title: cover.title,
    styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
    numbering: {
      config: [
        {
          reference: "ordered",
          levels: [0, 1, 2, 3, 4, 5].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [{ children: [...header, ...blocks(tree.children)] }],
  });
  return new Uint8Array(await Packer.toBuffer(document));
}
