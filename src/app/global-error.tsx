"use client";

import "./globals.css";

// Errore nel layout principale: sostituisce tutta la pagina, quindi ha il suo <html>.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="it">
      <body className="flex min-h-screen flex-col gap-3 p-8 font-sans antialiased">
        <title>Errore · ASDP Workspace</title>
        <h1 className="text-2xl font-semibold">Qualcosa non ha funzionato</h1>
        <p className="text-sm text-muted-foreground">L&apos;app non si è caricata. Riprova tra poco.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="self-start rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          Riprova
        </button>
      </body>
    </html>
  );
}
