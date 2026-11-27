import type { Nodes, Root, RootContent } from "mdast";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { QUESTION, QUESTION_STATUS_LABEL, questionsOf, TRACE, traceIds, type QuestionStatus } from "@/lib/questions";

const textOf = (node: Nodes): string =>
  "value" in node ? node.value : "children" in node ? node.children.map(textOf).join("") : "";

// Colori dello stato di una D[N]: etichetta accanto al titolo e bordo del riquadro.
const BADGE: Record<QuestionStatus, string> = {
  aperta: "bg-(--state-complete) text-(--state-complete-foreground)",
  rimandata: "bg-(--state-todo) text-(--state-todo-foreground)",
  da_applicare: "bg-(--state-progress) text-(--state-progress-foreground)",
  da_correggere: "bg-destructive/20 text-destructive",
};
const BORDER: Record<QuestionStatus, string> = {
  aperta: "border-(--state-complete-border)",
  rimandata: "border-(--state-todo-border)",
  da_applicare: "border-(--state-progress-border)",
  da_correggere: "border-destructive",
};

// Domande D[N] in riquadri con il loro stato e note "❓ Da chiarire" evidenziate. Il blocco di una
// D[N] va dal suo titolo al titolo successivo, come in questionsOf.
// answersPrompt: se c'è, l'etichetta "Risposta da applicare" è un pulsante che lo copia (il clic lo
// gestisce la pagina del documento, tramite data-copy-prompt).
function remarkOpenPoints(statuses: Map<string, QuestionStatus>, answersPrompt?: string) {
  return () => (tree: Root) => {
    const out: RootContent[] = [];
    let section: { children: RootContent[] } | null = null;
    for (const [index, node] of tree.children.entries()) {
      // data-block: posizione del blocco nel testo, uguale al blocco n-esimo dell'editor. Serve a
      // tenere fermo il punto di lettura passando da lettura a modifica e ritorno.
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, dataBlock: index } };
      if (node.type === "blockquote" && textOf(node).trimStart().startsWith("❓")) {
        node.data = {
          hProperties: {
            dataBlock: index,
            className: [
              "my-3 rounded-md border border-(--state-complete-border) bg-(--state-complete) px-4 py-1 text-(--state-complete-foreground)",
            ],
          },
        };
      }
      const match = node.type === "heading" ? QUESTION.exec(`${"#".repeat(node.depth)} ${textOf(node)}`) : null;
      if (match && node.type === "heading") {
        const status = statuses.get(match[1]) ?? "aperta";
        node.children.push({ type: "text", value: " " }, {
          type: "text",
          value: "",
          data:
            status === "da_applicare" && answersPrompt
              ? {
                  hName: "button",
                  hProperties: {
                    type: "button",
                    dataCopyPrompt: answersPrompt,
                    title: "Copia il prompt per Claude che applica le risposte",
                    className: [
                      `ml-2 cursor-pointer rounded px-1.5 py-0.5 align-middle text-xs font-medium hover:underline ${BADGE[status]}`,
                    ],
                  },
                  hChildren: [{ type: "text", value: `${QUESTION_STATUS_LABEL[status]} · copia prompt` }],
                }
              : {
                  hName: "span",
                  hProperties: {
                    className: [`ml-2 rounded px-1.5 py-0.5 align-middle text-xs font-medium ${BADGE[status]}`],
                  },
                  hChildren: [{ type: "text", value: QUESTION_STATUS_LABEL[status] }],
                },
        });
        // Il "❓ Da chiarire" subito prima fa parte della domanda: stesso punto di arrivo dei link.
        // Se la domanda precedente non è chiusa da un titolo, la nota è in coda al suo blocco.
        const pool = section?.children ?? out;
        const previous = pool.at(-1);
        const note = previous?.type === "blockquote" && textOf(previous).trimStart().startsWith("❓") ? [pool.pop()!] : [];
        // La nota prende i colori dello stato della domanda (es. blu se la risposta è da applicare).
        for (const n of note) {
          n.data = {
            hProperties: { ...n.data?.hProperties, className: [`my-3 rounded-md border px-4 py-1 ${BORDER[status]} ${BADGE[status]}`] },
          };
        }
        section = { children: [node] };
        const box = {
          type: "questionBox",
          children: section.children,
          data: {
            hName: "div",
            hProperties: {
              className: [`rounded-md border bg-muted/40 px-4 py-1 ${BORDER[status]}`],
            },
          },
        };
        out.push({
          type: "questionBlock",
          children: [...note, box],
          data: {
            hName: "section",
            hProperties: {
              id: match[1].toLowerCase(),
              className: ["my-4 flex scroll-mt-44 flex-col gap-3 rounded-md [&>blockquote]:my-0"],
            },
          },
        } as unknown as RootContent);
        continue;
      }
      if (node.type === "heading") section = null;
      if (section) section.children.push(node);
      else out.push(node);
    }
    tree.children = out;
  };
}

// Punti risolti da una D[N] o aggiornati su indicazione utente: la traccia "→ risolto da D1" diventa
// un'etichetta verde (lo stato dopo "Risposta da applicare") e il blocco che la contiene prende la
// tinta. Il blocco è il più vicino (paragrafo, anche in un blockquote, o cella); un paragrafo di
// una voce d'elenco evidenzia la voce. data-trace sta sull'etichetta: una per traccia, nell'ordine
// di tracesOf, per il salto dal pannello.
const TRACE_TINT = {
  listItem: "rounded-md bg-(--state-approved)/30 px-1",
  // className sostituisce quello dei components sotto: qui si ripetono le loro classi.
  tableCell: "border border-border bg-(--state-approved)/30 px-2 py-1 align-top",
  paragraph:
    "my-3 rounded-md border border-(--state-approved-border)/60 bg-(--state-approved)/30 px-2 py-1 leading-relaxed",
} as const;

function remarkTraces() {
  const tint = (node: Nodes, kind: keyof typeof TRACE_TINT) => {
    const props = (node.data?.hProperties ?? {}) as Record<string, unknown>;
    if (props.dataTraceBlock) return;
    node.data = { ...node.data, hProperties: { ...props, dataTraceBlock: true, className: [TRACE_TINT[kind]] } };
  };
  const walk = (node: Nodes, ancestors: Nodes[]) => {
    if (!("children" in node)) return;
    const children: RootContent[] = [];
    let found = false;
    for (const child of node.children as RootContent[]) {
      if (child.type !== "text" || !TRACE.test(child.value)) {
        walk(child, [...ancestors, node]);
        children.push(child);
        continue;
      }
      found = true;
      let rest = child.value;
      for (let match = TRACE.exec(rest); match; match = TRACE.exec(rest)) {
        if (match.index) children.push({ type: "text", value: rest.slice(0, match.index).trimEnd() });
        const ids = traceIds(match);
        children.push({
          type: "text",
          value: "",
          data: {
            hName: "span",
            hProperties: {
              dataTrace: true,
              className: [
                "ml-1.5 rounded px-1.5 py-0.5 align-middle text-xs font-medium whitespace-nowrap bg-(--state-approved) text-(--state-approved-foreground)",
              ],
            },
            hChildren: [{ type: "text", value: ids.length ? `Risolta · ${ids.join(", ")}` : "Aggiornato su indicazione utente" }],
          },
        });
        rest = rest.slice(match.index + match[0].length);
      }
      if (rest) children.push({ type: "text", value: rest });
    }
    (node as { children: RootContent[] }).children = children;
    if (!found) return;
    // Blocco più vicino che contiene la traccia (node è il genitore del testo, o un inline dentro).
    const chain = [...ancestors, node];
    const index = chain.findLastIndex((n) => n.type === "paragraph" || n.type === "tableCell" || n.type === "heading");
    const block = chain[index];
    if (!block) return;
    if (block.type === "paragraph" && chain[index - 1]?.type === "listItem") tint(chain[index - 1], "listItem");
    else tint(block, block.type === "tableCell" ? "tableCell" : "paragraph");
  };
  return (tree: Root) => walk(tree, []);
}

// Stili del Markdown con i token del tema (niente plugin typography).
const components: Components = {
  h1: (props) => <h1 className="mt-6 mb-3 text-2xl font-semibold first:mt-0" {...props} />,
  h2: (props) => <h2 className="mt-6 mb-3 text-xl font-semibold" {...props} />,
  h3: (props) => <h3 className="mt-4 mb-2 text-lg font-semibold" {...props} />,
  p: (props) => <p className="my-3 leading-relaxed" {...props} />,
  ul: (props) => <ul className="my-3 list-disc pl-6" {...props} />,
  ol: (props) => <ol className="my-3 list-decimal pl-6" {...props} />,
  blockquote: (props) => <blockquote className="my-3 border-l-2 pl-4 text-muted-foreground" {...props} />,
  a: (props) => <a className="text-primary underline-offset-4 hover:underline" {...props} />,
  code: (props) => <code className="rounded bg-muted px-1 font-mono text-sm" {...props} />,
  pre: (props) => (
    <pre className="my-3 overflow-x-auto rounded-md bg-muted p-3 text-sm [&>code]:bg-transparent [&>code]:p-0" {...props} />
  ),
  hr: () =><hr className="my-6 border-border" />,
  table: (props) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => <th className="border border-border bg-muted px-2 py-1 text-left font-medium" {...props} />,
  td: (props) => <td className="border border-border px-2 py-1 align-top" {...props} />,
};

export function Markdown({ children, answersPrompt }: { children: string; answersPrompt?: string }) {
  const statuses = new Map(questionsOf(children).map((q) => [q.id, q.status ?? "aperta"]));
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkOpenPoints(statuses, answersPrompt), remarkTraces]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
