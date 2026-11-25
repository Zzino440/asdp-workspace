"use client";

import { useEffect, useRef } from "react";
import { Editor, defaultValueCtx, rootCtx } from "@milkdown/kit/core";
import { history, redoCommand, undoCommand } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import {
  commonmark,
  toggleEmphasisCommand,
  toggleStrongCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { callCommand, getMarkdown, replaceAll } from "@milkdown/kit/utils";
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
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => callbacks.current.onChange(markdown));
      })
      .use(commonmark)
      .use(gfm)
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
  "[&_hr]:my-6 [&_hr]:border-border",
  "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
  "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium",
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_td_p]:my-0 [&_th_p]:my-0",
  "[&_[data-type=html]]:font-mono [&_[data-type=html]]:text-xs [&_[data-type=html]]:text-muted-foreground",
].join(" ");
