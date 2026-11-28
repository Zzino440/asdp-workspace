import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { authorizeRequest, microsoftEnabled } from "@/lib/microsoft";

// "Collega account Microsoft": salva state, verifier PKCE e pagina di ritorno per 10 minuti e
// manda al login Microsoft. next solo percorsi interni (niente // o /\, che porterebbero fuori).
export async function GET(request: NextRequest) {
  if (!microsoftEnabled()) notFound();
  const next = request.nextUrl.searchParams.get("next") ?? "";
  const { url, state, verifier } = authorizeRequest();
  (await cookies()).set(
    "ms_oauth",
    JSON.stringify({ state, verifier, next: /^\/(?![/\\])/.test(next) ? next : "/dashboard" }),
    { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/api/microsoft" },
  );
  redirect(url);
}
