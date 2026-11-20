import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ASDP_ROLES, ROLE_LABELS, USER_STATUS_LABELS, type AsdpRole } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { AddToProject, AdminSwitch, ProjectRolesRow, SuspendButton } from "../user-controls";

export default function UtentePage({ params }: PageProps<"/amministrazione/utenti/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
      <UserDetail params={params} />
    </Suspense>
  );
}

async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();

  const [{ data: user }, { data: memberships }, { data: projects }, { data: claims }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, is_admin, status").eq("id", id).maybeSingle(),
    supabase.from("project_members").select("project_id, roles").eq("user_id", id),
    supabase.from("projects").select("id, name, code").order("name"),
    supabase.auth.getClaims(),
  ]);
  if (!user) notFound();
  const isMe = claims?.claims.sub === user.id;

  const rolesByProject = new Map((memberships ?? []).map((m) => [m.project_id, m.roles as AsdpRole[]]));
  const assigned = (projects ?? []).filter((p) => rolesByProject.has(p.id));
  const available = (projects ?? []).filter((p) => !rolesByProject.has(p.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{user.full_name || user.email}</h1>
        <Badge variant="secondary">{USER_STATUS_LABELS[user.status]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profilo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-8 text-sm">
          <span>{user.email}</span>
          <label className="flex items-center gap-2">
            Admin piattaforma
            <AdminSwitch userId={user.id} checked={user.is_admin} disabled={isMe} />
          </label>
          <SuspendButton userId={user.id} status={user.status} disabled={isMe} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ruoli per progetto</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {assigned.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Progetto</TableHead>
                  {ASDP_ROLES.map((role) => (
                    <TableHead key={role} className="text-center">
                      {ROLE_LABELS[role]}
                    </TableHead>
                  ))}
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assigned.map((p) => (
                  <ProjectRolesRow key={p.id} userId={user.id} project={p} roles={rolesByProject.get(p.id)!} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nessun progetto assegnato.</p>
          )}
          {available.length > 0 && <AddToProject userId={user.id} projects={available} />}
        </CardContent>
      </Card>
    </div>
  );
}
