import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client Supabase per le richieste con "Authorization: Bearer <JWT>" (server MCP).
// Agisce come l'utente del token: ogni query passa dalle policy RLS.
export function createTokenClient(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
