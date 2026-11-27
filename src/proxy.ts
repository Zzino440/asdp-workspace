import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // In locale l'app gira solo su 127.0.0.1: i cookie di sessione scritti su "localhost" verrebbero
  // inviati anche a Supabase (localhost:54321) e, troppo grandi, Kong risponde 400 "Bad request".
  const host = request.headers.get("host") ?? "";
  if (process.env.NODE_ENV === "development" && host.startsWith("localhost:")) {
    const { pathname, search } = request.nextUrl;
    // Refresh e non Location: Next tratta localhost e 127.0.0.1 come lo stesso host e
    // renderebbe relativo il Location, con un redirect in loop.
    const target = `http://127.0.0.1:${host.split(":")[1]}${pathname}${search}`;
    return new Response(`In locale apri ${target}`, { headers: { refresh: `0; url=${target}` } });
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
