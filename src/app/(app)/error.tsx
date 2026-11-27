"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

// Errore imprevisto in una pagina dell'area riservata: la barra laterale resta, la pagina si può
// ricaricare. Il codice (digest) è quello dei log del server.
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <h1 className="text-2xl font-semibold">Qualcosa non ha funzionato</h1>
      <p className="text-sm text-muted-foreground">
        La pagina non si è caricata. Spesso GitLab o Microsoft non rispondono per qualche momento: riprova tra poco.
        Se l&apos;errore resta, segnalalo con il codice qui sotto.
      </p>
      {digest && <code className="font-mono text-xs text-muted-foreground">Codice: {digest}</code>}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => retry()}>
          Riprova
        </Button>
        <Link href="/progetti" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Torna ai progetti
        </Link>
      </div>
    </div>
  );
}
