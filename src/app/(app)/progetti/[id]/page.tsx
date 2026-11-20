import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NATURE_LABELS, PROJECT_STATUS_LABELS, type AsdpRole } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { DocumentList } from "./document-list";
import { Repositories } from "./repositories";
import { TeamEditor } from "./team-editor";

export default function ProgettoPage({ params }: PageProps<"/progetti/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
      <ProjectDetail params={params} />
    </Suspense>
  );
}

async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, code, name, client, nature, status, current_phase, framework_version, gitlab_project_path, gitlab_branch, docs_root",
    )
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const [{ data: members }, { data: people }, { data: isAdmin }, { data: isPm }, { data: repositories }] =
    await Promise.all([
    supabase
      .from("project_members")
      .select("user_id, roles, profiles(full_name, email)")
      .eq("project_id", id),
    supabase.from("profiles").select("id, full_name, email").neq("status", "sospeso").order("full_name"),
    supabase.rpc("is_admin"),
    supabase.rpc("has_project_role", { p_project_id: id, p_roles: ["pm"] }),
    supabase.from("project_repositories").select("id, gitlab_path, role, branch").eq("project_id", id).order("gitlab_path"),
  ]);
  const canManage = Boolean(isAdmin || isPm);

  const details: [string, string][] = [
    ["Cliente", project.client],
    ["Natura", NATURE_LABELS[project.nature]],
    ["Fase corrente", `Fase ${project.current_phase}`],
    ["Framework", `asdp ${project.framework_version}`],
    ["Repo documenti", project.gitlab_project_path ?? "—"],
    ["Branch", project.gitlab_branch],
    ["Cartella documenti", project.docs_root],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <span className="font-mono text-sm text-muted-foreground">{project.code}</span>
        <Badge variant="secondary">{PROJECT_STATUS_LABELS[project.status]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dati del progetto</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            {details.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
        </CardHeader>
        <CardContent>
          {/* La key rimonta l'editor quando il server restituisce un team diverso (dopo il salvataggio). */}
          <TeamEditor
            key={JSON.stringify(members)}
            projectId={project.id}
            canEdit={canManage}
            members={(members ?? []).map((m) => {
              // Relazione molti-a-uno: PostgREST restituisce un oggetto, i tipi non generati un array.
              const profile = m.profiles as unknown as { full_name: string; email: string } | null;
              return {
                user_id: m.user_id,
                roles: m.roles as AsdpRole[],
                name: profile?.full_name || profile?.email || "",
                email: profile?.email ?? "",
              };
            })}
            people={(people ?? []).map((p) => ({ id: p.id, name: p.full_name || p.email, email: p.email }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repository di codice</CardTitle>
        </CardHeader>
        <CardContent>
          <Repositories projectId={project.id} canEdit={canManage} repositories={repositories ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documenti</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
            <DocumentList projectId={project.id} canReindex={canManage} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
