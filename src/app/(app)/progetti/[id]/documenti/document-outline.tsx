"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

// "In questa pagina": i titoli H2/H3 del testo mostrato in #containerId, con la sezione corrente
// evidenziata mentre si scorre.
export function DocumentOutline({ containerId }: { containerId: string }) {
  const [items, setItems] = useState<{ id: string; text: string; level: number }[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const pinned = useRef(false);

  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root) return;
    const headings = [...root.querySelectorAll<HTMLElement>("h2, h3")];
    headings.forEach((h, i) => {
      if (!h.id) h.id = `sezione-${i + 1}`;
      h.style.scrollMarginTop = "11rem"; // sotto l'intestazione fissa
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- i titoli si leggono dal DOM
    setItems(headings.map((h) => ({ id: h.id, text: h.textContent ?? "", level: h.tagName === "H2" ? 2 : 3 })));
    if (headings.length === 0) return;
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
      setActive((passed.at(-1) ?? headings[0]).id);
    };
    // Dopo un clic sull'indice resta la voce cliccata finché l'utente non scorre di nuovo.
    const unpin = () => {
      pinned.current = false;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const userScroll = ["wheel", "touchstart", "keydown"] as const;
    userScroll.forEach((type) => window.addEventListener(type, unpin, { passive: true }));
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      userScroll.forEach((type) => window.removeEventListener(type, unpin));
    };
  }, [containerId]);

  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nessuna sezione.</p>;
  return (
    <ul className="flex flex-col gap-0.5 text-sm">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            onClick={() => {
              pinned.current = true;
              setActive(item.id);
            }}
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
