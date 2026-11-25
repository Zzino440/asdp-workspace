"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

// "In questa pagina": i titoli H2/H3 del testo mostrato in #containerId, con la sezione corrente
// evidenziata mentre si scorre.
export function DocumentOutline({ containerId }: { containerId: string }) {
  const [items, setItems] = useState<{ id: string; text: string; level: number }[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root) return;
    const headings = [...root.querySelectorAll<HTMLElement>("h2, h3")];
    headings.forEach((h, i) => {
      if (!h.id) h.id = `sezione-${i + 1}`;
      h.style.scrollMarginTop = "8rem"; // sotto l'intestazione fissa
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- i titoli si leggono dal DOM
    setItems(headings.map((h) => ({ id: h.id, text: h.textContent ?? "", level: h.tagName === "H2" ? 2 : 3 })));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-120px 0px -70% 0px" },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [containerId]);

  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nessuna sezione.</p>;
  return (
    <ul className="flex flex-col gap-0.5 text-sm">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className={cn(
              "block truncate rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground",
              item.level === 3 && "pl-5",
              active === item.id && "bg-accent text-foreground",
            )}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );
}
