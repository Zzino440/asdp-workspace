import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { INSTRUCTIONS, registerTools } from "@/lib/mcp/server";
import { createTokenClient } from "@/lib/supabase/token";
import { APP_VERSION } from "@/lib/version";

// Server MCP dell'app (Streamable HTTP, senza sessioni). Ogni chiamata arriva con il JWT
// Supabase dell'utente e i tool usano un client con quel token: stessa RLS della UI.
const handler = createMcpHandler(
  (server) =>
    registerTools(server, (ctx) => {
      const auth = (ctx as { http?: { authInfo?: { token: string; extra?: { userId?: string } } } }).http?.authInfo;
      if (!auth?.token || !auth.extra?.userId) throw new Error("Richiesta senza token.");
      return { supabase: createTokenClient(auth.token), userId: auth.extra.userId };
    }),
  { serverInfo: { name: "asdp-workspace", version: APP_VERSION }, instructions: INSTRUCTIONS },
);

// Verifica firma e scadenza del JWT con le chiavi pubbliche di Supabase Auth.
async function verifyToken(_req: Request, token?: string) {
  if (!token) return undefined;
  const { data } = await createTokenClient(token).auth.getClaims(token);
  if (!data?.claims) return undefined;
  return {
    token,
    clientId: String(data.claims.client_id ?? "supabase"),
    scopes: [],
    expiresAt: data.claims.exp,
    extra: { userId: data.claims.sub },
  };
}

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp",
});

export { authHandler as GET, authHandler as POST };
