"use client";

import { useEffect, useId, useState } from "react";
import { searchRepositories } from "./actions";
import { Input } from "@/components/ui/input";

// Campo "percorso GitLab" con i suggerimenti delle repo che l'app vede (lista nativa del browser).
// Si può sempre scrivere a mano: al salvataggio l'app verifica la repo.
export function RepoPathInput(props: Omit<React.ComponentProps<"input">, "list" | "onChange">) {
  const listId = useId();
  const [text, setText] = useState(String(props.defaultValue ?? ""));
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => searchRepositories(text).then(setOptions), 300);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <>
      <Input {...props} list={listId} autoComplete="off" onChange={(e) => setText(e.target.value)} />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
