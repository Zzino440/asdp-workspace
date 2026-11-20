import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Client Supabase per Server Components, Server Actions e Route Handlers.
// Usa il JWT dell'utente: ogni query passa dalle policy RLS.
export async function createClient() {
  // Il client auth legge l'ora corrente: va eseguito a request time, mai nel prerender.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chiamato da un Server Component: i cookie li aggiorna il proxy.
          }
        },
      },
    },
  );
}
