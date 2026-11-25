"use client";

import { useEffect, useRef } from "react";
import { Editor, defaultValueCtx, remarkStringifyOptionsCtx, rootCtx } from "@milkdown/kit/core";
import { history, redoCommand, undoCommand } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import {
  commonmark,
  listItemSchema,
  toggleEmphasisCommand,
  toggleStrongCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { DOMSerializer, type Node } from "@milkdown/kit/prose/model";
import { $view, callCommand, getMarkdown, replaceAll } from "@milkdown/kit/utils";
import { Bold, Heading2, Heading3, Italic, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Editor visuale Markdown. onReady riceve la baseline (Markdown dell'editor appena aperto sul
// testo originale, prima di applicare l'eventuale bozza): serve a spliceMarkdown per lasciare
// identici i blocchi non toccati.
export function MilkdownEditor(props: {
  initial: string;
  draft: string | null;
  onReady: (baseline: string, read: () => string) => void;
  onChange: (markdown: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const editor = useRef<Editor | null>(null);
  const callbacks = useRef(props);
  useEffect(() => {
    callbacks.current = props;
  });

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
      })
      .use(commonmark)
      .use(gfm)
      .use(taskItemView)
      .use(history)
      .use(listener)
      .create()
      .then((created) => {
        if (cancelled) return created.destroy(true);
        editor.current = created;
        const baseline = created.action(getMarkdown());
        if (callbacks.current.draft !== null) created.action(replaceAll(callbacks.current.draft));
        callbacks.current.onReady(baseline, () => created.action(getMarkdown()));
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
      <div className="sticky top-0 z-10 flex flex-wrap gap-1 rounded-lg border bg-card p-1">
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
      <div ref={root} className={EDITOR_STYLES} />
    </div>
  );
}

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
