"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Decisione dell'utente sulla richiesta OAuth: Supabase restituisce l'URL di ritorno al client.
export async function decide(authorizationId: string, approve: boolean) {
  const supabase = await createClient();
  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
  if (error || !data) redirect(`/oauth/consent?authorization_id=${authorizationId}&errore=1`);
  redirect(data.redirect_url);
}
