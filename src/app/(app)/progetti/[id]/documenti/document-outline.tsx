"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { cn } from "cn";

// "In questa pagina": i titoli H2/H3 del testo in containerRef (lettura o editor) o in #containerId (guida), con la
// sezione corrente evidenziata mentre si scorre. Non tocca il DOM dei titoli (nell'editor lo
// gestisce ProseMirror): il clic scorre con scrollTo, di base fino a 11rem dal bordo in alto.
// I titoli si rileggono a ogni cambio del testo, così in modifica l'indice segue ciò che si scrive.
// compact: un trattino per titolo (pannello ridotto), il testo resta nel tooltip.
export function DocumentOutline({
  containerId,
  containerRef,
  compact = false,
  scrollTo = (element) =>
    window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 176, behavior: "smooth" }),
}: {
  containerId?: string;
  containerRef?: RefObject<HTMLElement | null>;
  compact?: boolean;
  scrollTo?: (element: HTMLElement) => void;
}) {
  const [items, setItems] = useState<{ element: HTMLElement; text: string; level: number }[]>([]);
  const [active, setActive] = useState<HTMLElement | null>(null);
  const pinned = useRef(false);

  useEffect(() => {
    const root = containerRef ? containerRef.current : document.getElementById(containerId ?? "");
    if (!root) return;
    let headings: HTMLElement[] = [];
    // Attivo l'ultimo titolo sopra una linea a 200px (sotto l'intestazione). Negli ultimi pixel di
    // scorrimento la linea scende fino al fondo dello schermo: gli ultimi titoli, che non possono
    // salire fin lì, la attraversano comunque uno alla volta, in ordine.
    const update = () => {
      if (pinned.current) return;
      const top = 200;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const range = Math.min(window.innerHeight - top, maxScroll);
      const remaining = maxScroll - window.scrollY;
      const line = range > 0 && remaining < range ? top + (window.innerHeight - top) * (1 - remaining / range) : top;
      const passed = headings.filter((h) => h.getBoundingClientRect().top <= line);
      setActive(passed.at(-1) ?? headings[0] ?? null);
    };
    const read = () => {
      headings = [...root.querySelectorAll<HTMLElement>("h2, h3")];
      setItems(headings.map((h) => ({ element: h, text: h.textContent ?? "", level: h.tagName === "H2" ? 2 : 3 })));
      update();
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(read, 200);
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    // Dopo un clic sull'indice resta la voce cliccata finché l'utente non scorre di nuovo.
    const unpin = () => {
      pinned.current = false;
    };
    read();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const userScroll = ["wheel", "touchstart", "keydown"] as const;
    userScroll.forEach((type) => window.addEventListener(type, unpin, { passive: true }));
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      userScroll.forEach((type) => window.removeEventListener(type, unpin));
    };
  }, [containerId, containerRef]);

  if (items.length === 0) return compact ? null : <p className="text-sm text-muted-foreground">Nessuna sezione.</p>;
  return (
    <ul className={cn("flex flex-col text-sm", compact ? "items-end gap-2" : "gap-0.5")}>
      {items.map((item, i) => (
        <li key={i}>
          <button
            type="button"
            title={compact ? item.text : undefined}
            aria-label={compact ? item.text : undefined}
            onClick={() => {
              pinned.current = true;
              setActive(item.element);
              scrollTo(item.element);
            }}
            className={cn(
              compact
                ? cn("block h-0.5 rounded-full bg-muted-foreground/40", item.level === 2 ? "w-4" : "w-2.5")
                : "block w-full truncate rounded-md px-2 py-1 text-left text-muted-foreground hover:bg-muted hover:text-foreground",
              !compact && item.level === 3 && "pl-5",
              active === item.element && (compact ? "bg-foreground" : "bg-accent text-foreground"),
            )}
          >
            {!compact && item.text}
          </button>
        </li>
      ))}
    </ul>
  );
}
