import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";
import { PermissionMatrix } from "./permission-matrix";

export default function PermessiPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Ruoli e permessi</h1>
      <Alert>
        <AlertDescription>
          I permessi si applicano per ruolo nel progetto; un utente con più ruoli ottiene l&apos;unione
          dei permessi.
        </AlertDescription>
      </Alert>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
        <Matrix />
      </Suspense>
    </div>
  );
}

async function Matrix() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();

  const [{ data: types }, { data: permissions }] = await Promise.all([
    supabase.from("document_types").select("code, name, phase").order("sort_order"),
    supabase.from("role_permissions").select("document_type, role, level"),
  ]);

  return (
    <PermissionMatrix
      key={JSON.stringify(permissions)}
      types={types ?? []}
      permissions={permissions ?? []}
    />
  );
}
