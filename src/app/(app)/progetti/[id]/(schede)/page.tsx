import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { guidaHref } from "@/lib/guida";
import { ASDP_ROLES, ROLE_LABELS } from "@/lib/labels";
import { microsoftEnabled } from "@/lib/microsoft";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/time";
import { loadSetupState } from "@/lib/workspace";
import { DocumentList, loadProjectSteps } from "../document-list";
import { gitlabHref, loadProject } from "../project-data";
import { WorkspaceSetup } from "../workspace-setup";

// Scheda Percorso: la mappa al centro, a destra area di lavoro, team e collegamenti.
export default function PercorsoPage({ params, searchParams }: PageProps<"/progetti/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
      <Percorso params={params} searchParams={searchParams as Promise<{ avviso?: string }>} />
    </Suspense>
  );
}

async function Percorso({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ avviso?: string }>;
}) {
  const [{ id }, { avviso }] = await Promise.all([params, searchParams]);
  const { project, canManage, isAdmin, members, repositories } = await loadProject(id);
  const supabase = await createClient();
  const [setup, { data: folders }] = await Promise.all([
    canManage ? loadSetupState(supabase, id) : null,
    microsoftEnabled()
      ? supabase.from("project_file_locations").select("id, label").eq("project_id", id).order("created_at")
      : { data: null },
  ]);
  const base = `/progetti/${id}`;
  const missingRoles = (["pm", "tl"] as const).filter((r) => !members.some((m) => m.roles.includes(r)));
  const clone = [project.gitlab_project_path, ...repositories.map((r) => r.gitlab_path)]
    .filter((p): p is string => Boolean(p) && Boolean(process.env.GITLAB_URL))
    .map((p) => `git clone ${process.env.GITLAB_URL}/${p}.git`);

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-4">
        {avviso && (
          <Alert variant="destructive">
            <AlertDescription>{avviso}</AlertDescription>
          </Alert>
        )}
        <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
          <DocumentList
            projectId={project.id}
            project={{ ...project, teams: Boolean(folders?.length) }}
            currentPhase={project.current_phase}
            isAdmin={isAdmin}
          />
        </Suspense>
      </div>

      <aside className="grid gap-6 sm:grid-cols-3 xl:sticky xl:top-[calc(var(--project-header-h)+1.5rem)] xl:flex xl:flex-col">
        {setup && (
          <WorkspaceSetup
            projectId={id}
            state={setup}
            currentPhase={project.current_phase}
            summary={{
              docsPath: project.gitlab_project_path,
              codeCount: repositories.length,
              teamsLabels: (folders ?? []).map((f) => f.label),
              pmTl: members.filter((m) => m.roles.includes("pm") || m.roles.includes("tl")).map((m) => m.name),
              documents: setup.documents,
            }}
          />
        )}

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs text-muted-foreground">Team</h2>
            {canManage && (
              <Link href={`${base}/impostazioni#team`} className="text-xs text-primary hover:underline">
                Gestisci
              </Link>
            )}
          </div>
          {members.length === 0 && <p className="text-sm text-muted-foreground">Nessuna persona nel team.</p>}
          <ul className="flex flex-col gap-1.5">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm" title={m.email}>
                  {m.name}
                </span>
                <span className="flex shrink-0 gap-1">
                  {ASDP_ROLES.filter((r) => m.roles.includes(r)).map((r) => (
                    <Badge key={r} variant="secondary">
                      {ROLE_LABELS[r]}
                    </Badge>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          {missingRoles.length > 0 && (
            <p className="text-xs text-destructive">Manca {missingRoles.map((r) => ROLE_LABELS[r]).join(" e ")}.</p>
          )}
        </section>

        <Suspense fallback={null}>
          <RecentActivity projectId={id} />
        </Suspense>

        <section className="flex flex-col gap-2">
          <h2 className="text-xs text-muted-foreground">Collegamenti</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            <RailLink href={gitlabHref(project.gitlab_project_path)} external label="Documenti su GitLab" />
            {repositories.map((r) => (
              <RailLink key={r.id} href={gitlabHref(r.gitlab_path)} external label={`Codice ${r.role.toUpperCase()} su GitLab`} />
            ))}
            {folders?.map((f) => <RailLink key={f.id} href={`${base}/file?file=${f.id}`} label={`File · ${f.label}`} />)}
            <RailLink href={guidaHref("collegare-claude")} label="Collegare Claude" />
          </ul>
          {clone.length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Cartella di lavoro locale (TL)</summary>
              <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 font-mono">{clone.join("\n")}</pre>
            </details>
          )}
        </section>
      </aside>
    </div>
  );
}

// Ultimi salvataggi dei documenti (app, Claude via MCP, push diretti su GitLab).
async function RecentActivity({ projectId }: { projectId: string }) {
  const { activity, mapTypes } = await loadProjectSteps(projectId);
  if (activity.length === 0) return null;
  const names = new Map(mapTypes.map((t) => [t.code, t.name]));
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs text-muted-foreground">Attività recente</h2>
      <ul className="flex flex-col gap-2.5">
        {activity.slice(0, 8).map((e) => (
          <li key={`${e.created_at}-${e.path}`} className="flex flex-col text-sm">
            <Link
              href={`/progetti/${projectId}/documenti/${e.path.split("/").map(encodeURIComponent).join("/")}`}
              className="truncate hover:underline"
              title={e.title}
            >
              {names.get(e.document_type ?? "") ?? e.path.split("/").pop()}
            </Link>
            <span className="truncate text-xs text-muted-foreground" title={e.title}>
              {e.author_name}
              {e.via === "mcp" ? " con Claude" : ""} · {timeAgo(e.created_at)} · {e.title}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RailLink({ href, label, external }: { href: string | null; label: string; external?: boolean }) {
  if (!href) return null;
  return (
    <li>
      {external ? (
        <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:underline">
          {label}
          <ExternalLink className="size-3 text-muted-foreground" aria-hidden />
        </a>
      ) : (
        <Link href={href} className="hover:underline">
          {label}
        </Link>
      )}
    </li>
  );
}
