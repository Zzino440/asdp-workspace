import { Suspense } from "react";
import { redirect } from "next/navigation";
import { decide } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

// Pagina di consenso del server OAuth di Supabase Auth: qui l'utente autorizza un client MCP
// (Claude) ad agire con il suo account. Il proxy garantisce che l'utente abbia già fatto login.
export default function ConsentPage({ searchParams }: PageProps<"/oauth/consent">) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Suspense fallback={null}>
        <Consent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Indirizzi di ritorno ammessi: la registrazione dinamica è aperta a chiunque, quindi
// accettiamo solo i client Claude (connettori di claude.ai, Claude Code nell'app desktop) e i
// client locali (Claude Code da terminale).
const CLAUDE_CALLBACKS = ["https://claude.ai/api/mcp/auth_callback", "claude://claude.ai/mcp-auth-callback/sdk"];

function isAllowedRedirect(uri: string) {
  if (CLAUDE_CALLBACKS.includes(uri)) return true;
  try {
    const url = new URL(uri);
    return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

async function Consent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const authorizationId = typeof query.authorization_id === "string" ? query.authorization_id : null;
  const supabase = await createClient();
  const { data, error } = authorizationId
    ? await supabase.auth.oauth.getAuthorizationDetails(authorizationId)
    : { data: null, error: null };

  // JWT ancora valido ma sessione chiusa altrove (es. logout da un altro dispositivo): nuovo login.
  if (error?.name === "AuthSessionMissingError") {
    redirect(`/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`);
  }
  if (data && !("authorization_id" in data)) redirect(data.redirect_url);
  if (!authorizationId || !data) {
    return <Message title="Richiesta non valida" text="La richiesta di autorizzazione è scaduta o non esiste. Riprova dal client." />;
  }
  if (!isAllowedRedirect(data.redirect_uri)) {
    return <Message title="Client non ammesso" text={`Questo client non è autorizzato a collegarsi ad ASDP Workspace (${data.redirect_uri}).`} />;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Autorizza {data.client.name || "il client"}</CardTitle>
        <CardDescription>
          {data.client.name || "Il client"} potrà leggere e modificare i documenti ASDP come {data.user.email}, con
          gli stessi permessi che hai nell&apos;app.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.errore && <p className="text-sm text-destructive">Operazione non riuscita. Riprova.</p>}
        <div className="flex gap-3">
          <form action={decide.bind(null, authorizationId, true)}>
            <Button type="submit">Consenti</Button>
          </form>
          <form action={decide.bind(null, authorizationId, false)}>
            <Button type="submit" variant="outline">
              Rifiuta
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{text}</CardDescription>
      </CardHeader>
    </Card>
  );
}
