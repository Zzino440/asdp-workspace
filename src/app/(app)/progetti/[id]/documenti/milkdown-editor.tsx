"use client";

import { useEffect, useRef, useState } from "react";
import { Editor, defaultValueCtx, editorViewCtx, remarkStringifyOptionsCtx, rootCtx } from "@milkdown/kit/core";
import type { Ctx } from "@milkdown/kit/ctx";
import { history, redoCommand, undoCommand } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { slashFactory } from "@milkdown/kit/plugin/slash";
import {
  commonmark,
  createCodeBlockCommand,
  insertHrCommand,
  listItemSchema,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleLinkCommand,
  toggleStrongCommand,
  turnIntoTextCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from "@milkdown/kit/preset/commonmark";
import { gfm, insertTableCommand, toggleStrikethroughCommand } from "@milkdown/kit/preset/gfm";
import { DOMSerializer, type Node } from "@milkdown/kit/prose/model";
import { TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $view, callCommand, getMarkdown, replaceAll } from "@milkdown/kit/utils";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table,
  Type,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Editor visuale Markdown. onReady riceve la baseline (Markdown dell'editor appena aperto sul
// testo originale, prima di applicare l'eventuale bozza): serve a spliceMarkdown per lasciare
// identici i blocchi non toccati. focusAt mette il cursore nel punto dello schermo indicato.
export function MilkdownEditor(props: {
  initial: string;
  draft: string | null;
  onReady: (baseline: string, read: () => string, focusAt: (x: number, y: number) => void) => void;
  onChange: (markdown: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const editor = useRef<Editor | null>(null);
  const callbacks = useRef(props);
  useEffect(() => {
    callbacks.current = props;
  });

  // Menu "/": si apre scrivendo "/" a inizio riga o dopo uno spazio; il testo che segue filtra le voci.
  const wrapper = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ query: string; from: number; left: number; top: number } | null>(null);
  const [active, setActive] = useState(0);
  const items = menu ? SLASH_ITEMS.filter((item) => item.search.includes(menu.query.toLowerCase())) : [];
  // Posizione della "/" chiusa con Esc: non si riapre finché non la si cancella.
  const dismissed = useRef(-1);

  const pick = (item: SlashItem) => {
    const created = editor.current;
    if (!menu || !created) return;
    const view = created.ctx.get(editorViewCtx);
    view.dispatch(view.state.tr.delete(menu.from, view.state.selection.from));
    created.action(item.run);
    setMenu(null);
    view.focus();
  };

  const updateSlash = (view: EditorView) => {
    const { empty, $from } = view.state.selection;
    const before =
      empty && $from.parent.type.name === "paragraph"
        ? $from.parent.textBetween(0, $from.parentOffset, undefined, "￼")
        : "";
    const match = /(?:^|\s)\/([\p{L}\d]*)$/u.exec(before);
    if (!match) dismissed.current = -1;
    const from = match ? $from.pos - match[1].length - 1 : -1;
    if (!match || !view.hasFocus() || from === dismissed.current || !wrapper.current) {
      setMenu(null);
      return;
    }
    const box = wrapper.current.getBoundingClientRect();
    const at = view.coordsAtPos(from);
    if (menu?.query !== match[1]) setActive(0);
    setMenu({ query: match[1], from, left: at.left - box.left, top: at.bottom - box.top + 4 });
  };

  const slashKeyDown = (event: KeyboardEvent) => {
    if (!menu || items.length === 0) return false;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      setActive((active + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      pick(items[active]);
    } else if (event.key === "Escape") {
      dismissed.current = menu.from;
      setMenu(null);
    } else return false;
    return true;
  };

  // Menu sulla selezione: compare sopra il testo selezionato, a mouse rilasciato.
  const [bubble, setBubble] = useState<{ left: number; top: number } | null>(null);
  const pointerDown = useRef(false);

  const updateBubble = (view: EditorView) => {
    const { selection } = view.state;
    if (selection.empty || !(selection instanceof TextSelection) || !view.hasFocus() || pointerDown.current || !wrapper.current) {
      setBubble(null);
      return;
    }
    const box = wrapper.current.getBoundingClientRect();
    const start = view.coordsAtPos(selection.from);
    setBubble({ left: start.left - box.left, top: start.top - box.top - 6 });
  };

  // Il plugin è creato una volta sola: legge le funzioni dell'ultimo render da qui.
  const slashHandlers = useRef({ updateSlash, slashKeyDown, updateBubble });
  useEffect(() => {
    slashHandlers.current = { updateSlash, slashKeyDown, updateBubble };
  });

  useEffect(() => {
    const release = () => {
      if (!pointerDown.current) return;
      pointerDown.current = false;
      const created = editor.current;
      if (created) slashHandlers.current.updateBubble(created.ctx.get(editorViewCtx));
    };
    document.addEventListener("mouseup", release);
    return () => document.removeEventListener("mouseup", release);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root.current);
        ctx.set(defaultValueCtx, callbacks.current.initial);
        // Stile dei template ASDP: "-" per elenchi e separatori.
        // "Altro: ___" delle D[N]: una fila di "_" tra spazi non può essere enfasi, niente "\_".
        ctx.update(remarkStringifyOptionsCtx, (options) => ({
          ...options,
          bullet: "-" as const,
          rule: "-" as const,
          handlers: {
            ...options.handlers,
            text: (...args) =>
              options.handlers!.text!(...args).replace(/(?<=\s)(?:\\_){2,}(?=\s|$)/g, (run) => run.replaceAll("\\", "")),
          },
        }));
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => callbacks.current.onChange(markdown));
        ctx.set(slash.key, {
          view: () => ({
            update: (view) => {
              slashHandlers.current.updateSlash(view);
              slashHandlers.current.updateBubble(view);
            },
          }),
          props: {
            handleKeyDown: (_, event) => slashHandlers.current.slashKeyDown(event),
            handleDOMEvents: {
              blur: () => {
                setMenu(null);
                setBubble(null);
              },
              mousedown: () => {
                pointerDown.current = true;
                setBubble(null);
              },
            },
          },
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(taskItemView)
      .use(history)
      .use(listener)
      .use(slash)
      .create()
      .then((created) => {
        if (cancelled) return created.destroy(true);
        editor.current = created;
        const baseline = created.action(getMarkdown());
        if (callbacks.current.draft !== null) created.action(replaceAll(callbacks.current.draft));
        const view = created.ctx.get(editorViewCtx);
        callbacks.current.onReady(
          baseline,
          () => created.action(getMarkdown()),
          (x, y) => {
            const hit = view.posAtCoords({ left: x, top: y });
            if (hit) view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(hit.pos))));
            view.focus();
          },
        );
      });
    return () => {
      cancelled = true;
      editor.current?.destroy(true);
      editor.current = null;
    };
  }, []);

  const tools = [
    { label: "Grassetto", icon: Bold, run: () => callCommand(toggleStrongCommand.key) },
    { label: "Corsivo", icon: Italic, run: () => callCommand(toggleEmphasisCommand.key) },
    { label: "Titolo", icon: Heading2, run: () => callCommand(wrapInHeadingCommand.key, 2) },
    { label: "Sottotitolo", icon: Heading3, run: () => callCommand(wrapInHeadingCommand.key, 3) },
    { label: "Elenco puntato", icon: List, run: () => callCommand(wrapInBulletListCommand.key) },
    { label: "Elenco numerato", icon: ListOrdered, run: () => callCommand(wrapInOrderedListCommand.key) },
    { label: "Annulla", icon: Undo2, run: () => callCommand(undoCommand.key) },
    { label: "Ripeti", icon: Redo2, run: () => callCommand(redoCommand.key) },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div data-editor-toolbar className="sticky top-(--doc-header-h) z-10 flex flex-wrap gap-1 rounded-lg border bg-card p-1">
        {tools.map(({ label, icon: Icon, run }) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="icon-sm"
            title={label}
            aria-label={label}
            // mousedown: il clic non toglie il cursore dall'editor.
            onMouseDown={(e) => {
              e.preventDefault();
              editor.current?.action(run());
            }}
          >
            <Icon />
          </Button>
        ))}
      </div>
      <div ref={wrapper} className="relative">
        <div ref={root} className={EDITOR_STYLES} />
        {bubble && (
          <div
            role="toolbar"
            aria-label="Formato del testo selezionato"
            className="absolute z-20 flex -translate-y-full items-center gap-0.5 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
            style={{ left: bubble.left, top: bubble.top }}
          >
            {BUBBLE_TOOLS.map((group, index) => (
              <div key={index} className="flex gap-0.5 not-first:border-l not-first:pl-0.5">
                {group.map(({ label, icon: Icon, run }) => (
                  <Button
                    key={label}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title={label}
                    aria-label={label}
                    // mousedown: il clic non toglie la selezione dall'editor.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor.current?.action(run);
                    }}
                  >
                    <Icon />
                  </Button>
                ))}
              </div>
            ))}
          </div>
        )}
        {menu && items.length > 0 && (
          <div
            role="listbox"
            aria-label="Inserisci blocco"
            className="absolute z-20 max-h-72 w-64 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
            style={{ left: menu.left, top: menu.top }}
          >
            {items.map((item, index) => (
              <div
                key={item.label}
                role="option"
                aria-selected={index === active}
                ref={index === active ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground"
                onMouseEnter={() => setActive(index)}
                // mousedown: il clic non toglie il cursore dall'editor.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(item);
                }}
              >
                <item.icon />
                <span className="flex-1">{item.label}</span>
                <span className="font-mono text-xs text-muted-foreground">{item.hint}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const slash = slashFactory("asdp");

// Voci del menu "/". search: testo su cui filtra quello che si scrive dopo la "/".
// run legge .key al clic: Milkdown la assegna solo quando l'editor parte.
type SlashItem = { label: string; hint: string; search: string; icon: typeof List; run: (ctx: Ctx) => unknown };
const SLASH_ITEMS: SlashItem[] = [
  { label: "Titolo 2", hint: "##", search: "titolo 2 h2 heading", icon: Heading2, run: (ctx) => callCommand(wrapInHeadingCommand.key, 2)(ctx) },
  { label: "Titolo 3", hint: "###", search: "titolo 3 h3 heading", icon: Heading3, run: (ctx) => callCommand(wrapInHeadingCommand.key, 3)(ctx) },
  { label: "Titolo 4", hint: "####", search: "titolo 4 h4 heading", icon: Heading4, run: (ctx) => callCommand(wrapInHeadingCommand.key, 4)(ctx) },
  { label: "Elenco puntato", hint: "-", search: "elenco puntato lista bullet", icon: List, run: (ctx) => callCommand(wrapInBulletListCommand.key)(ctx) },
  { label: "Elenco numerato", hint: "1.", search: "elenco numerato lista numbered", icon: ListOrdered, run: (ctx) => callCommand(wrapInOrderedListCommand.key)(ctx) },
  {
    label: "Elenco di controllo",
    hint: "[ ]",
    search: "elenco di controllo lista todo to-do checkbox caselle",
    icon: ListTodo,
    // Elenco puntato, poi la voce diventa "- [ ]".
    run: (ctx) => {
      callCommand(wrapInBulletListCommand.key)(ctx);
      const view = ctx.get(editorViewCtx);
      const { $from } = view.state.selection;
      for (let depth = $from.depth; depth > 0; depth--) {
        if ($from.node(depth).type === listItemSchema.type(ctx)) {
          view.dispatch(view.state.tr.setNodeAttribute($from.before(depth), "checked", false));
          return;
        }
      }
    },
  },
  { label: "Citazione", hint: ">", search: "citazione quote blockquote", icon: Quote, run: (ctx) => callCommand(wrapInBlockquoteCommand.key)(ctx) },
  { label: "Blocco di codice", hint: "```", search: "blocco di codice code", icon: Code, run: (ctx) => callCommand(createCodeBlockCommand.key)(ctx) },
  { label: "Tabella", hint: "", search: "tabella table", icon: Table, run: (ctx) => callCommand(insertTableCommand.key)(ctx) },
  { label: "Separatore", hint: "---", search: "separatore linea divider hr", icon: Minus, run: (ctx) => callCommand(insertHrCommand.key)(ctx) },
];

// Menu sulla selezione: a sinistra trasforma il blocco, a destra il formato del testo.
const BUBBLE_TOOLS: { label: string; icon: typeof List; run: (ctx: Ctx) => unknown }[][] = [
  [
    { label: "Testo", icon: Type, run: (ctx) => callCommand(turnIntoTextCommand.key)(ctx) },
    { label: "Titolo 2", icon: Heading2, run: (ctx) => callCommand(wrapInHeadingCommand.key, 2)(ctx) },
    { label: "Titolo 3", icon: Heading3, run: (ctx) => callCommand(wrapInHeadingCommand.key, 3)(ctx) },
    { label: "Titolo 4", icon: Heading4, run: (ctx) => callCommand(wrapInHeadingCommand.key, 4)(ctx) },
    { label: "Elenco puntato", icon: List, run: (ctx) => callCommand(wrapInBulletListCommand.key)(ctx) },
    { label: "Elenco numerato", icon: ListOrdered, run: (ctx) => callCommand(wrapInOrderedListCommand.key)(ctx) },
    { label: "Citazione", icon: Quote, run: (ctx) => callCommand(wrapInBlockquoteCommand.key)(ctx) },
  ],
  [
    { label: "Grassetto", icon: Bold, run: (ctx) => callCommand(toggleStrongCommand.key)(ctx) },
    { label: "Corsivo", icon: Italic, run: (ctx) => callCommand(toggleEmphasisCommand.key)(ctx) },
    { label: "Barrato", icon: Strikethrough, run: (ctx) => callCommand(toggleStrikethroughCommand.key)(ctx) },
    { label: "Codice", icon: Code, run: (ctx) => callCommand(toggleInlineCodeCommand.key)(ctx) },
    {
      label: "Link",
      icon: Link,
      run: (ctx) => {
        const href = prompt("Indirizzo del link");
        if (href) callCommand(toggleLinkCommand.key, { href })(ctx);
      },
    },
  ],
];

// Voci "- [ ]" / "- [x]" (opzioni delle D[N]): il preset gfm le legge e le salva ma non mostra la
// casella. Questa vista la aggiunge; le altre voci d'elenco restano col DOM del preset.
const taskItemView = $view(listItemSchema.node, () => (initial, view, getPos) => {
  let current = initial;
  const isTask = initial.attrs.checked != null;
  // Stessa voce se cambia solo il contenuto (o, per le caselle, solo la spunta).
  const sameItem = (next: Node) =>
    next.type === current.type &&
    (next.attrs.checked != null) === isTask &&
    ["label", "listType", "spread"].every((key) => next.attrs[key] === current.attrs[key]);

  if (!isTask) {
    const { dom, contentDOM } = DOMSerializer.renderSpec(document, initial.type.spec.toDOM!(initial));
    return {
      dom,
      contentDOM,
      update: (next) => {
        if (!sameItem(next)) return false;
        current = next;
        return true;
      },
    };
  }

  const dom = document.createElement("li");
  dom.dataset.itemType = "task";
  // Stesso aspetto del Checkbox shadcn (src/components/ui/checkbox.tsx), con la spunta disegnata sopra.
  const box = document.createElement("span");
  box.contentEditable = "false";
  box.className = "relative inline-flex size-4 shrink-0 translate-y-0.5";
  box.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none absolute inset-0.5 hidden text-primary-foreground peer-checked:block"><path d="M20 6 9 17l-5-5"/></svg>';
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className =
    "peer size-4 cursor-pointer appearance-none rounded-[4px] border border-input bg-input/30 outline-none transition-colors checked:border-primary checked:bg-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  checkbox.checked = initial.attrs.checked;
  box.prepend(checkbox);
  checkbox.addEventListener("change", () => {
    const pos = getPos();
    if (pos !== undefined) view.dispatch(view.state.tr.setNodeAttribute(pos, "checked", checkbox.checked));
  });
  const contentDOM = document.createElement("div");
  dom.append(box, contentDOM);
  return {
    dom,
    contentDOM,
    update: (next) => {
      if (!sameItem(next)) return false;
      current = next;
      checkbox.checked = next.attrs.checked;
      return true;
    },
    stopEvent: (event) => box.contains(event.target as globalThis.Node),
    ignoreMutation: (mutation) => box.contains(mutation.target),
  };
});

// Stessi stili di src/components/markdown.tsx, applicati agli elementi creati dall'editor.
const EDITOR_STYLES = [
  "[&_.ProseMirror]:min-h-96 [&_.ProseMirror]:outline-none",
  "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1:first-child]:mt-0",
  "[&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold",
  "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold",
  "[&_p]:my-3 [&_p]:leading-relaxed",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
  // Nell'editor ogni voce di elenco ha un <p>; in lettura gli elenchi compatti no.
  "[&_li_p]:my-0 [&_li_p]:leading-normal",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
  "[&_a]:text-primary [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm",
  "[&_li[data-item-type=task]]:-ml-6 [&_li[data-item-type=task]]:flex [&_li[data-item-type=task]]:list-none [&_li[data-item-type=task]]:items-baseline [&_li[data-item-type=task]]:gap-2",
  "[&_li[data-item-type=task]>div]:min-w-0 [&_li[data-item-type=task]>div]:flex-1",
  "[&_hr]:my-6 [&_hr]:border-border",
  "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
  "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium",
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_td_p]:my-0 [&_th_p]:my-0",
  "[&_[data-type=html]]:font-mono [&_[data-type=html]]:text-xs [&_[data-type=html]]:text-muted-foreground",
].join(" ");
