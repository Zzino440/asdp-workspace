"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Inserisci email e password valide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error?.code === "user_banned") {
    return { error: "Account sospeso. Contatta un amministratore." };
  }
  if (error) {
    return { error: "Credenziali non valide." };
  }

  // Solo percorsi interni: niente redirect verso altri siti.
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/progetti");
}

// Accesso con Microsoft (provider azure di Supabase Auth): al primo accesso crea l'utente, se
// l'hook before_user_created lo consente. Il ritorno passa da /auth/callback.
export async function loginWithMicrosoft(formData: FormData) {
  const next = String(formData.get("next") ?? "");
  const callback = new URL("/auth/callback", (await headers()).get("origin") ?? "");
  if (next.startsWith("/") && !next.startsWith("//")) callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    // profile: nome e cognome, che handle_new_user copia nel profilo.
    options: { scopes: "email profile", redirectTo: callback.toString() },
  });
  redirect(error ? "/login?error=microsoft" : data.url);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
