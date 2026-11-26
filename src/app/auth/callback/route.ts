import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Ritorno dall'accesso con Microsoft: scambia il codice con la sessione. Se Supabase ha rifiutato
// (es. hook before_user_created) arriva senza codice, con ?error=...
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Solo percorsi interni: niente redirect verso altri siti.
    if (!error) redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/progetti");
  }

  redirect("/login?error=microsoft");
}
