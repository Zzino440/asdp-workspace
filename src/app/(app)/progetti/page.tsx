import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { featureOf } from "@/lib/features";
import { NATURE_LABELS, PHASES, type AsdpRole } from "@/lib/labels";
import { microsoftEnabled } from "@/lib/microsoft";
import { isDone, phaseProgress } from "@/lib/phase-progress";
import { createClient } from "@/lib/supabase/server";
import { missingSteps } from "@/lib/workspace";
import { ProjectsTable, type ProjectRow } from "./projects-table";

export default function ProgettiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <PageHeader />
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        </div>
      }
    >
      <Projects />
    </Suspense>
  );
}

function PageHeader() {
  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold">Progetti</h1>
      <Suspense>
        <NewProjectButton />
      </Suspense>
    </div>
  );
}

// Il bottone è solo una comodità: la creazione è permessa dalla RLS solo all'admin.
async function NewProjectButton() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return null;
  return (
    <Link href="/progetti/nuovo" className={buttonVariants()}>
      <Plus />
      Nuovo progetto
    </Link>
  );
}

// Nomi dei passi di "Prepara l'area di lavoro" (il team è segnalato a parte).
const SETUP_LABELS: Record<string, string> = {
  docs_repository: "repo documenti",
  code_repositories: "repo di codice",
  teams_folder: "canale Teams",
  kickoff: "kickoff",
};

const PAGE = 1000; // max_rows di PostgREST: oltre, le righe si perdono senza errore.
const isoDate = (value: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? String(value) : null);

type Member = { project_id: string; user_id: string; roles: AsdpRole[]; profiles: unknown };
type Doc = { project_id: string; path: string; document_type: string | null; stato: string | null; scadenza: string | null };

// Legge tutte le righe a pagine, per non fermarsi al tetto di max_rows.
async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await page(from, from + PAGE - 1);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

async function Projects() {
  const supabase = await createClient();
  const teams = microsoftEnabled();
  // Nessun filtro per utente: la RLS restituisce solo ciò che chi è loggato può vedere.
  const [{ data: projects, error }, members, documents, { data: types }, { data: repos }, { data: folders }, { data: isAdmin }, { data: claims }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, code, name, client, nature, status, current_phase, framework_version, gitlab_project_path, end_date")
        .order("name"),
      readAll<Member>((from, to) =>
        supabase.from("project_members").select("project_id, user_id, roles, profiles(full_name, email)").order("project_id").order("user_id").range(from, to),
      ),
      readAll<Doc>((from, to) =>
        supabase
          .from("documents")
          .select("project_id, path, document_type, stato:front_matter->>stato, scadenza:front_matter->>scadenza")
          .order("project_id")
          .order("path")
          .range(from, to),
      ),
      supabase.from("document_types").select("code, phase, per_feature").not("skill_name", "is", null),
      supabase.from("project_repositories").select("project_id"),
      teams ? supabase.from("project_file_locations").select("project_id") : { data: null },
      supabase.rpc("is_admin"),
      supabase.auth.getClaims(),
    ]);

  if (error || !projects || projects.length === 0)
    return (
      <div className="flex flex-col gap-6">
        <PageHeader />
        {error ? (
          <p className="text-sm text-destructive">Impossibile caricare i progetti.</p>
        ) : (
          <p className="text-sm text-muted-foreground">Non partecipi ancora a nessun progetto.</p>
        )}
      </div>
    );

  const me = claims?.claims.sub;
  const today = new Date().toISOString().slice(0, 10);

  const rows: ProjectRow[] = projects.map((p) => {
    const team = members.filter((m) => m.project_id === p.id);
    const roles = team.flatMap((m) => m.roles);
    const mine = team.find((m) => m.user_id === me)?.roles ?? [];
    const docs = documents.filter((d) => d.project_id === p.id);
    const typed = docs.filter((d) => d.document_type);

    // Avanzamento della fase attuale, come nella mappa del progetto.
    const mapTypes = (types ?? []).map((t) => ({
      phase: t.phase as number,
      perFeature: t.per_feature as boolean,
      docs: docs.filter((d) => d.document_type === t.code).map((d) => ({ state: d.stato, feature: featureOf(d.path) })),
    }));
    const features = [...new Set(mapTypes.filter((t) => t.perFeature).flatMap((t) => t.docs.map((d) => d.feature ?? "")))].sort();
    const progress = phaseProgress(mapTypes, features, p.current_phase);

    // Il setup lo vede solo chi può sistemarlo (admin o PM del progetto).
    const setup =
      isAdmin || mine.includes("pm")
        ? missingSteps({
            docsRepository: Boolean(p.gitlab_project_path),
            codeRepositories: (repos ?? []).filter((r) => r.project_id === p.id).length,
            teamsFolder: teams ? (folders ?? []).some((f) => f.project_id === p.id) : null,
            team: { pm: true, tl: true },
            documents: typed.length,
          }).map((s) => SETUP_LABELS[s])
        : [];

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      client: p.client,
      nature: NATURE_LABELS[p.nature],
      status: p.status,
      framework: p.framework_version,
      phase: p.current_phase,
      phaseName: PHASES[p.current_phase]?.name ?? "",
      ready: progress.ready,
      expected: progress.expected,
      inApproval: docs.filter((d) => d.stato === "Completo").length,
      overdue: docs.filter((d) => {
        const deadline = isoDate(d.scadenza);
        return deadline !== null && deadline < today && !isDone({ state: d.stato });
      }).length,
      missingRoles: (["pm", "tl"] as const).filter((r) => !roles.includes(r)).map((r) => r.toUpperCase()),
      setup,
      pm: team
        .filter((m) => m.roles.includes("pm"))
        .map((m) => {
          // Relazione molti-a-uno: PostgREST restituisce un oggetto, i tipi non generati un array.
          const profile = m.profiles as { full_name: string; email: string } | null;
          return profile?.full_name || profile?.email || "";
        })
        .join(", "),
      myRoles: mine,
      endDate: isoDate(p.end_date),
    };
  });

  return <ProjectsTable header={<PageHeader />} rows={rows} today={today} />;
}
