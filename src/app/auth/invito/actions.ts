"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Apre la sessione con i token del link di invito standard di Supabase (Supabase li valida).
export async function startInvitedSession(accessToken: string, refreshToken: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) return { error: "Il link dell'invito non è valido o è scaduto. Chiedi un nuovo invito." };
  redirect("/imposta-password");
}
