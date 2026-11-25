import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { authorizeRequest, microsoftEnabled } from "@/lib/microsoft";

// "Collega account Microsoft": salva state e verifier PKCE per 10 minuti e manda al login Microsoft.
export async function GET() {
  if (!microsoftEnabled()) notFound();
  const { url, state, verifier } = authorizeRequest();
  (await cookies()).set("ms_oauth", JSON.stringify({ state, verifier }), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/microsoft",
  });
  redirect(url);
}
