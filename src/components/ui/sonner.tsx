"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

// Toaster di shadcn senza next-themes: il tema è solo scuro. Colori dai token del design system.
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
