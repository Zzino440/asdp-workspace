"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

// Copia negli appunti la richiesta pronta per Claude.
export function CopyPromptButton({
  prompt,
  label = "Copia prompt per Claude",
  variant = "default",
}: {
  prompt: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant={variant}
      size={variant === "ghost" ? "sm" : "default"}
      onClick={async () => {
        // Senza permesso sugli appunti (browser o pagina non sicura) il testo si copia a mano.
        const ok = await navigator.clipboard.writeText(prompt).then(
          () => true,
          () => false,
        );
        if (!ok) return window.prompt("Copia il prompt e incollalo in Claude:", prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copiato" : label}
    </Button>
  );
}
