"use client";

import { useEffect, useState } from "react";
import { startInvitedSession } from "./actions";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Link dell'invito con il template standard di Supabase (cloud sul piano free, senza SMTP):
// la sessione arriva nel frammento "#access_token=…", che il server non vede.
// In locale l'invito usa invece /auth/confirm (supabase/templates/invite.html).
export default function InvitoPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, "", window.location.pathname);
    // Senza token (o con "#error=…" per link scaduto) l'azione risponde con l'errore.
    startInvitedSession(hash.get("access_token") ?? "", hash.get("refresh_token") ?? "").then((result) =>
      setError(result.error),
    );
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{error ? "Invito non valido" : "Accesso in corso…"}</CardTitle>
          {error && <CardDescription>{error}</CardDescription>}
        </CardHeader>
      </Card>
    </main>
  );
}
