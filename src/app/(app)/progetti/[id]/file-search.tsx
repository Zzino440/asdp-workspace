"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;
const MIN_LENGTH = 2;

// Ricerca mentre si digita: dopo una pausa aggiorna ?cerca= e la pagina server rifà la query a
// Graph. Sotto MIN_LENGTH caratteri non parte nulla; campo vuoto = torna alla cartella.
export function FileSearch({ base, locationId, query }: { base: string; locationId: string; query: string }) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSent = useRef(query);

  // Navigazione esterna (cartella, breadcrumb): riallinea il campo all'URL.
  useEffect(() => {
    if (query !== lastSent.current) {
      lastSent.current = query;
      setValue(query);
    }
  }, [query]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const send = (text: string) => {
    clearTimeout(timer.current);
    const q = text.trim();
    if (q === lastSent.current || (q && q.length < MIN_LENGTH)) return;
    lastSent.current = q;
    const params = new URLSearchParams({ file: locationId });
    if (q) params.set("cerca", q);
    startTransition(() => router.replace(`${base}?${params}`, { scroll: false }));
  };

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        send(value);
      }}
    >
      {pending ? (
        <Loader2 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : (
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <Input
        type="search"
        value={value}
        onChange={(e) => {
          const text = e.target.value;
          setValue(text);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => send(text), DEBOUNCE_MS);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setValue("");
            send("");
          }
        }}
        placeholder="Cerca in questa cartella"
        aria-label="Cerca in questa cartella"
        className="h-8 w-64 pl-8"
      />
    </form>
  );
}
