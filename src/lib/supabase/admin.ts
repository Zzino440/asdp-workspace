import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client con la service role: salta la RLS. Usalo SOLO per auth.admin.inviteUserByEmail
// nell'azione "Invita utente", dopo aver verificato con il client dell'utente che sia admin.
// Ogni altro accesso ai dati passa da src/lib/supabase/server.ts.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
