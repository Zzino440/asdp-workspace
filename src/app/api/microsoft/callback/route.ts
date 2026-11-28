import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { connectAccount, microsoftEnabled } from "@/lib/microsoft";
import { createClient } from "@/lib/supabase/server";

// Ritorno dal login Microsoft: verifica lo state, salva il token, torna alla pagina di partenza.
// Gli errori (es. consenso negato o approvazione dell'amministratore richiesta) si mostrano lì.
export async function GET(request: NextRequest) {
  if (!microsoftEnabled()) notFound();
  const params = request.nextUrl.searchParams;
  const cookieStore = await cookies();
  const saved = cookieStore.get("ms_oauth")?.value;
  cookieStore.delete({ name: "ms_oauth", path: "/api/microsoft" });
  const { state, verifier, next = "/dashboard" } = saved ? JSON.parse(saved) : {};

  let error = params.get("error_description") ?? params.get("error");
  if (!error) {
    if (!state || state !== params.get("state")) error = "Richiesta scaduta o non valida: riprova.";
    else {
      try {
        await connectAccount(await createClient(), params.get("code")!, verifier);
      } catch (e) {
        error = (e as Error).message;
      }
    }
  }
  const target = new URL(next, request.nextUrl.origin);
  if (error) target.searchParams.set("errore", error);
  redirect(target.pathname + target.search);
}
