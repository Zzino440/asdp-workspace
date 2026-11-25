import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NATURE_LABELS, PHASES, PROJECT_STATUS_LABELS, type AsdpRole } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { AdvancePhaseButton } from "./advance-phase";
import { DocumentList, loadProjectSteps } from "./document-list";
import { ProjectEditDialog } from "./project-edit-dialog";
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

  // Link a GitLab costruiti qui: GITLAB_URL resta sul server.
  const gitlabRepo = (path: string) => (process.env.GITLAB_URL ? `${process.env.GITLAB_URL}/${path}` : null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <span className="font-mono text-sm text-muted-foreground">{project.code}</span>
            <Badge variant="secondary">{PROJECT_STATUS_LABELS[project.status]}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{project.client}</span>
            <span aria-hidden>·</span>
            <span>{NATURE_LABELS[project.nature]}</span>
            <span aria-hidden>·</span>
            <span>
              Fase {project.current_phase} · {PHASES[project.current_phase]?.name}
            </span>
            <span aria-hidden>·</span>
            <span>asdp {project.framework_version}</span>
            {canManage && project.current_phase < 4 && (
              <Suspense>
                <AdvancePhase projectId={project.id} currentPhase={project.current_phase} />
              </Suspense>
            )}
          </div>
        </div>
        {canManage && <ProjectEditDialog project={project} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Percorso ASDP</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
            <DocumentList projectId={project.id} currentPhase={project.current_phase} canReindex={canManage} />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
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
            <CardTitle>Repository</CardTitle>
          </CardHeader>
          <CardContent>
            <Repositories
              projectId={project.id}
              canEdit={canManage}
              docs={{
                path: project.gitlab_project_path,
                branch: project.gitlab_branch,
                root: project.docs_root,
                href: project.gitlab_project_path ? gitlabRepo(project.gitlab_project_path) : null,
              }}
              repositories={(repositories ?? []).map((r) => ({ ...r, href: gitlabRepo(r.gitlab_path) }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// "Passa alla Fase N+1" quando la fase corrente ha documenti attesi e nessun passo aperto.
async function AdvancePhase({ projectId, currentPhase }: { projectId: string; currentPhase: number }) {
  const { mapTypes, open } = await loadProjectSteps(projectId);
  const complete =
    mapTypes.some((t) => t.phase === currentPhase) && !open.some((s) => s.phase === currentPhase);
  if (!complete) return null;
  return <AdvancePhaseButton projectId={projectId} nextPhase={currentPhase + 1} />;
}
