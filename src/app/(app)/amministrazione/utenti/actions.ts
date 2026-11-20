"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { ASDP_ROLES } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string | null; message?: string };

const NO_PERMISSION = "Operazione non permessa.";

const inviteSchema = z.object({ email: z.email(), full_name: z.string().trim().min(1) });

export async function inviteUser(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Inserisci nome ed email validi." };

  // La service role salta la RLS: prima si verifica, con il JWT di chi chiama, che sia admin.
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { error: "Solo un amministratore può invitare utenti." };

  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { full_name: parsed.data.full_name },
  });
  if (error?.code === "email_exists") return { error: "Esiste già un utente con questa email." };
  if (error) return { error: "Impossibile inviare l'invito." };

  refresh();
  return { error: null, message: `Invito inviato a ${parsed.data.email}.` };
}

// Le modifiche ai profili passano dal client dell'utente: la RLS le permette solo all'admin.
export async function setAdmin(userId: string, isAdmin: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId)
    .select("id");
  if (!data?.length) return { error: NO_PERMISSION };
  refresh();
  return { error: null };
}

export async function setStatus(userId: string, status: "attivo" | "sospeso"): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .update({ status: z.enum(["attivo", "sospeso"]).parse(status) })
    .eq("id", userId)
    .select("id");
  if (!data?.length) return { error: NO_PERMISSION };
  refresh();
  return { error: null };
}

// Ruoli di un utente in un progetto; nessun ruolo = rimozione dal progetto.
export async function setUserProjectRoles(
  userId: string,
  projectId: string,
  roles: string[],
): Promise<ActionResult> {
  const parsedRoles = z.array(z.enum(ASDP_ROLES)).parse(roles);
  const supabase = await createClient();
  const query =
    parsedRoles.length > 0
      ? supabase
          .from("project_members")
          .upsert({ project_id: projectId, user_id: userId, roles: parsedRoles })
      : supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
  const { data } = await query.select("user_id");
  if (!data?.length) return { error: NO_PERMISSION };
  refresh();
  return { error: null };
}
