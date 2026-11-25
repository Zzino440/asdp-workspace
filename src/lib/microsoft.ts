import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Microsoft Graph con l'account Microsoft collegato dall'utente (permessi delegati: decide
// SharePoint cosa vede). Il refresh token sta in public.microsoft_accounts, riga dell'utente (RLS).

// Funzione nascosta finché l'IT non dà il consenso: senza MICROSOFT_CLIENT_ID pagina e route
// rispondono 404 (oggi le variabili ci sono solo in .env.local di chi sviluppa).
export const microsoftEnabled = () => Boolean(process.env.MICROSOFT_CLIENT_ID);

// Deve essere identico all'URI registrato su Entra: aprire l'app da localhost, non da 127.0.0.1.
// Per ora solo sviluppo locale; sul cloud servirà l'URI di produzione.
const REDIRECT_URI = "http://localhost:4100/api/microsoft/callback";
const SCOPES = "offline_access User.Read Team.ReadBasic.All Files.ReadWrite.All Sites.ReadWrite.All";
const authority = () => `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0`;

const base64url = (buffer: Buffer) => buffer.toString("base64url");

// URL di login Microsoft con state e PKCE; state e verifier vanno salvati dal chiamante.
export function authorizeRequest() {
  const state = base64url(randomBytes(16));
  const verifier = base64url(randomBytes(32));
  const query = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge: base64url(createHash("sha256").update(verifier).digest()),
    code_challenge_method: "S256",
  });
  return { url: `${authority()}/authorize?${query}`, state, verifier };
}

async function token(params: Record<string, string>) {
  const response = await fetch(`${authority()}/token`, {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      scope: SCOPES,
      ...params,
    }),
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Microsoft ${response.status}: ${body.error_description ?? body.error}`);
  return body as { access_token: string; refresh_token: string };
}

const saveRefreshToken = async (supabase: SupabaseClient, refreshToken: string) => {
  const { error } = await supabase
    .from("microsoft_accounts")
    .upsert({ refresh_token: refreshToken, updated_at: new Date().toISOString() });
  if (error) throw error;
};

// Callback: codice → token, salva il refresh token dell'utente.
export async function connectAccount(supabase: SupabaseClient, code: string, verifier: string) {
  const tokens = await token({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });
  await saveRefreshToken(supabase, tokens.refresh_token);
}

// Access token fresco dal refresh token salvato; null se l'utente non ha collegato l'account.
async function accessToken(supabase: SupabaseClient) {
  const { data } = await supabase.from("microsoft_accounts").select("refresh_token").maybeSingle();
  if (!data) return null;
  const tokens = await token({ grant_type: "refresh_token", refresh_token: data.refresh_token });
  await saveRefreshToken(supabase, tokens.refresh_token);
  return tokens.access_token;
}

// Client Graph per l'utente; null se l'account non è collegato.
export async function graphClient(supabase: SupabaseClient) {
  const access = await accessToken(supabase);
  if (!access) return null;
  return async <T>(path: string) => {
    const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      headers: { Authorization: `Bearer ${access}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Graph ${response.status} su ${path}: ${await response.text()}`);
    return (await response.json()) as T;
  };
}
