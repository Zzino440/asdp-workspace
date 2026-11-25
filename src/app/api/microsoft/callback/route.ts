import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { connectAccount, microsoftEnabled } from "@/lib/microsoft";
import { createClient } from "@/lib/supabase/server";

// Ritorno dal login Microsoft: verifica lo state, salva il token, torna alla pagina dei file.
// Gli errori (es. consenso negato o approvazione dell'amministratore richiesta) si mostrano lì.
export async function GET(request: NextRequest) {
  if (!microsoftEnabled()) notFound();
  const params = request.nextUrl.searchParams;
  const cookieStore = await cookies();
  const saved = cookieStore.get("ms_oauth")?.value;
  cookieStore.delete({ name: "ms_oauth", path: "/api/microsoft" });

  let error = params.get("error_description") ?? params.get("error");
  if (!error) {
    const { state, verifier } = saved ? JSON.parse(saved) : {};
    if (!state || state !== params.get("state")) error = "Richiesta scaduta o non valida: riprova.";
    else {
      try {
        await connectAccount(await createClient(), params.get("code")!, verifier);
      } catch (e) {
        error = (e as Error).message;
      }
    }
  }
  redirect(error ? `/file-microsoft?errore=${encodeURIComponent(error)}` : "/file-microsoft");
}
