import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { graphClient, microsoftEnabled, teamOfDrive } from "@/lib/microsoft";
import { createClient } from "@/lib/supabase/server";
import { gitlabCreationEnabled, teamMemberSuggestions } from "@/lib/workspace";
import { unlinkFolder } from "../../../file-actions";
import { GitLabSetupButton } from "../../gitlab-setup-button";
import { gitlabHref, loadProject } from "../../project-data";
import { ProjectSettingsForm } from "../../project-settings-form";
import { Repositories } from "../../repositories";
import { TeamEditor } from "../../team-editor";

// Scheda Impostazioni (admin e PM): dati del progetto, team, repository e cartelle Teams.
export default function ImpostazioniPage({ params, searchParams }: PageProps<"/progetti/[id]/impostazioni">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
      <Settings params={params} searchParams={searchParams as Promise<{ membri?: string }>} />
    </Suspense>
  );
}

async function Settings({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ membri?: string }>;
}) {
  const [{ id }, { membri }] = await Promise.all([params, searchParams]);
  const { project, isAdmin, canManage, members, repositories } = await loadProject(id);
  if (!canManage) notFound();

  const supabase = await createClient();
  const [{ data: people }, { data: folders }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").neq("status", "sospeso").order("full_name"),
    microsoftEnabled()
      ? supabase.from("project_file_locations").select("id, label, web_url, drive_id").eq("project_id", id).order("created_at")
      : { data: null },
  ]);
  // Team da proporre: quello appena scelto (?membri=) o quello della prima cartella collegata.
  const suggested = membri || folders?.length ? await suggestions(membri ?? null, folders?.[0]?.drive_id ?? null) : null;

  return (
    <div className="flex max-w-5xl flex-col divide-y divide-border">
      <Section id="generale" title="Generale" description="Dati del progetto e repo dei documenti ASDP.">
        <ProjectSettingsForm project={project} isAdmin={isAdmin} />
      </Section>

      <Section id="team" title="Team" description="I ruoli decidono chi modifica e chi approva ogni documento.">
        {/* La key rimonta l'editor quando il server restituisce un team diverso (dopo il salvataggio). */}
        <TeamEditor
          key={JSON.stringify(members)}
          projectId={id}
          canEdit
          members={members}
          people={(people ?? []).map((p) => ({ id: p.id, name: p.full_name || p.email, email: p.email }))}
          suggested={suggested}
          autoOpen={Boolean(membri)}
          isAdmin={isAdmin}
        />
      </Section>

      <Section id="repository" title="Repository" description="Repo dei documenti e del codice su GitLab.">
        {!project.gitlab_project_path && isAdmin && gitlabCreationEnabled() && (
          <div className="rounded-md border p-4 text-sm">
            <GitLabSetupButton projectId={id} />
          </div>
        )}
        <Repositories
          projectId={id}
          canEdit
          docs={{
            path: project.gitlab_project_path,
            branch: project.gitlab_branch,
            root: project.docs_root,
            href: gitlabHref(project.gitlab_project_path),
          }}
          repositories={repositories.map((r) => ({ ...r, href: gitlabHref(r.gitlab_path) }))}
        />
      </Section>

      {folders && (
        <Section id="teams" title="Teams" description="Cartelle di Teams collegate: i loro file si vedono nella scheda File.">
          {folders.length === 0 && <p className="text-sm text-muted-foreground">Nessuna cartella collegata.</p>}
          <ul className="flex flex-col divide-y divide-border">
            {folders.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 py-2 first:pt-0">
                <a href={f.web_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm hover:underline">
                  {f.label}
                  <ExternalLink className="size-3 text-muted-foreground" aria-hidden />
                </a>
                <form action={unlinkFolder.bind(null, id, f.id)}>
                  <Button type="submit" variant="ghost" size="sm" title="Su Teams non cambia niente">
                    Scollega
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <Link href={`/progetti/${id}/file/collega`} className={buttonVariants({ variant: "outline", className: "self-start" })}>
            Crea o collega un canale
          </Link>
        </Section>
      )}
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    // Titolo e descrizione a sinistra, contenuto a destra; sotto i 1024 px uno sopra l'altro.
    <section id={id} className="grid scroll-mt-8 gap-4 py-8 first:pt-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

// Membri del Team Microsoft del progetto (già nell'app e no), proposti in Gestisci team. Un
// errore di Graph non deve bloccare la pagina: niente proposte.
async function suggestions(teamId: string | null, driveId: string | null) {
  const supabase = await createClient();
  const graph = await graphClient(supabase);
  if (!graph) return null;
  try {
    const team = teamId ?? (driveId ? await teamOfDrive(graph, driveId) : null);
    return team ? await teamMemberSuggestions(supabase, graph, team) : null;
  } catch {
    return null;
  }
}
