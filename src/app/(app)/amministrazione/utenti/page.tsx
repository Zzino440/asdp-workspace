import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { USER_STATUS_LABELS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { AdminSwitch, DeleteUserButton, InviteDialog, ResendAccessButton, SuspendButton } from "./user-controls";

export default function UtentiPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Utenti</h1>
        <InviteDialog />
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
        <UsersTable />
      </Suspense>
    </div>
  );
}

async function UsersTable() {
  const supabase = await createClient();
  // Pagina solo per admin (i dati li protegge comunque la RLS).
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();

  const [{ data: claims }, { data: users }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("profiles")
      .select("id, full_name, email, is_admin, status, last_sign_in_at, project_members(project_id)")
      .order("full_name"),
  ]);
  const me = claims?.claims.sub;
  const dateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Admin</TableHead>
          <TableHead>Progetti</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead>Ultimo accesso</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {(users ?? []).map((u) => (
          <TableRow key={u.id}>
            <TableCell className="font-medium">
              <Link href={`/amministrazione/utenti/${u.id}`} className="hover:underline">
                {u.full_name || u.email}
              </Link>
            </TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell>
              <AdminSwitch userId={u.id} checked={u.is_admin} disabled={u.id === me} />
            </TableCell>
            <TableCell>{u.project_members.length}</TableCell>
            <TableCell>
              <Badge variant={u.status === "attivo" ? "secondary" : "outline"}>
                {USER_STATUS_LABELS[u.status]}
              </Badge>
            </TableCell>
            <TableCell>{u.last_sign_in_at ? dateFormat.format(new Date(u.last_sign_in_at)) : "—"}</TableCell>
            <TableCell>
              <div className="flex flex-wrap items-center gap-2">
                <SuspendButton userId={u.id} status={u.status} disabled={u.id === me} />
                <ResendAccessButton userId={u.id} status={u.status} disabled={u.id === me} />
                <DeleteUserButton userId={u.id} name={u.full_name || u.email} disabled={u.id === me} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
