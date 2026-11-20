"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { ASDP_ROLES } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string | null };

const changesSchema = z.array(
  z.object({
    document_type: z.string(),
    role: z.enum(ASDP_ROLES),
    level: z.enum(["none", "view", "edit", "approve"]),
  }),
);

// Solo le celle cambiate; la RLS permette l'update solo all'admin.
export async function savePermissions(changes: unknown): Promise<ActionResult> {
  const parsed = changesSchema.safeParse(changes);
  if (!parsed.success) return { error: "Dati non validi." };

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map(({ document_type, role, level }) =>
      supabase
        .from("role_permissions")
        .update({ level })
        .eq("document_type", document_type)
        .eq("role", role)
        .select("role"),
    ),
  );
  if (results.some((r) => !r.data?.length)) return { error: "Operazione non permessa." };

  refresh();
  return { error: null };
}

export async function resetPermissions(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reset_role_permissions");
  if (error) return { error: "Impossibile ripristinare i default." };
  refresh();
  return { error: null };
}
