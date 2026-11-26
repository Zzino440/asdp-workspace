"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { checkRepository, ensureProjectWebhook, indexProject } from "@/lib/documents";
import { ASDP_ROLES } from "@/lib/labels";
import { graphClient } from "@/lib/microsoft";
import { createClient } from "@/lib/supabase/server";
import {
  createProjectChannel,
  gitlabCreationEnabled,
  provisionGitLab,
  suggestRepositories,
  relinkDocsRepository,
  syncCodeRepositories,
} from "@/lib/workspace";

// ok distingue il salvataggio riuscito dallo stato iniziale (serve ai dialog per chiudersi).
export type FormState = { error: string | null; ok?: boolean; warning?: string | null };

// Campo facoltativo del form: vuoto → null.
const optional = z.string().trim().optional().transform((v) => v || null);

const detailsSchema = {
  description: optional,
  start_date: optional,
  end_date: optional,
};

const projectSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(20),
  name: z.string().trim().min(1),
  client: z.string().trim().min(1),
  nature: z.enum(["greenfield", "evolutiva"]),
  ...detailsSchema,
  framework_version: z.string().trim().min(1),
  gitlab_project_path: z.string().trim().transform((v) => v || null),
  gitlab_branch: z.string().trim().min(1),
  docs_root: z.string().trim().min(1),
});

// repos: "crea" = gruppo GitLab nuovo con adsp, "collega" = repo documenti esistente.
// fe/be: repo di codice nuova (nel gruppo), esistente (fe_path/be_path) o nessuna.
// pm/tl: persone del team; teams_team: Team Microsoft in cui creare il canale.
const codeRepo = z.enum(["nessuna", "nuova", "esistente"]).default("nessuna");
const setupSchema = z.object({
  repos: z.enum(["crea", "collega"]),
  fe: codeRepo,
  be: codeRepo,
  fe_path: optional,
  be_path: optional,
  pm: optional.pipe(z.guid().nullable()),
  tl: optional.pipe(z.guid().nullable()),
  teams_team: optional,
});

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const fields = Object.fromEntries(formData);
  const parsed = projectSchema.safeParse(fields);
  const setup = setupSchema.safeParse(fields);
  if (!parsed.success || !setup.success) {
    return { error: String(fields.code ?? "").trim().length < 3 ? "Il codice deve avere almeno 3 caratteri." : "Compila tutti i campi obbligatori." };
  }
  const create = setup.data.repos === "crea" && gitlabCreationEnabled();
  const { fe, be, fe_path, be_path, pm, tl, teams_team } = setup.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...parsed.data, ...(create && { gitlab_project_path: null }) })
    .select("id")
    .single();
  if (error?.code === "23505") return { error: "Esiste già un progetto con questo codice." };
  if (error?.code === "23514") return { error: "La fine prevista non può venire prima dell'inizio." };
  if (error?.code === "42501") return { error: "Solo un amministratore può creare progetti." };
  if (error) return { error: "Impossibile creare il progetto." };

  // I passi dopo la creazione non la bloccano: i problemi arrivano come avviso nella pagina del
  // progetto, dove la card "Area di lavoro" permette di rifare ciò che manca.
  const problems: string[] = [];
  if (create) {
    try {
      problems.push(...(await provisionGitLab(supabase, data.id, { fe: fe === "nuova", be: be === "nuova" })).warnings);
    } catch (e) {
      problems.push(e instanceof Error ? e.message : "Preparazione GitLab non riuscita.");
    }
  } else {
    const webhook = await ensureProjectWebhook(supabase, data.id);
    if (webhook) problems.push(webhook);
  }

  const existing = [
    { role: "fe" as const, choice: fe, gitlab_path: fe_path },
    { role: "be" as const, choice: be, gitlab_path: be_path },
  ].flatMap(({ role, choice, gitlab_path }) => (choice === "esistente" && gitlab_path ? [{ role, gitlab_path }] : []));
  for (const repo of existing) {
    const { error } = await supabase
      .from("project_repositories")
      .insert({ project_id: data.id, ...repo, branch: "main" });
    if (error && error.code !== "23505") problems.push(`Repo ${repo.gitlab_path} non collegata.`);
    else {
      const warning = await checkRepository(repo.gitlab_path, "main");
      if (warning) problems.push(warning);
    }
  }
  if (existing.length > 0) await syncCodeRepositories(supabase, data.id);

  // PM e TL sulla stessa persona: una riga con i due ruoli (accorpamento).
  const members = new Map<string, ("pm" | "tl")[]>();
  if (pm) members.set(pm, ["pm"]);
  if (tl) members.set(tl, [...(members.get(tl) ?? []), "tl"]);
  if (members.size > 0) {
    const { error } = await supabase
      .from("project_members")
      .upsert([...members].map(([user_id, roles]) => ({ project_id: data.id, user_id, roles })));
    if (error) problems.push("PM e TL non salvati: assegnali da Impostazioni › Team.");
  }

  if (teams_team) {
    try {
      const graph = await graphClient(supabase);
      if (!graph) throw new Error();
      await createProjectChannel(supabase, graph, data.id, teams_team);
    } catch (e) {
      console.error("Creazione del canale Teams non riuscita", e);
      problems.push(`Canale Teams non creato (${e instanceof Error && e.message ? e.message : "account Microsoft non collegato"}): riprova dalla scheda File.`);
    }
  }

  const problem = problems.join(" ");
  redirect(`/progetti/${data.id}${problem ? `?avviso=${encodeURIComponent(problem)}` : ""}`);
}

// Passo "Repo documenti" della card: crea (o riusa) gruppo, adsp e repo di codice scelte.
export async function runGitLabSetup(projectId: string, code: { fe: boolean; be: boolean }): Promise<FormState> {
  const supabase = await createClient();
  try {
    const { warnings } = await provisionGitLab(supabase, projectId, code);
    refresh();
    return { error: null, ok: true, warning: warnings.join(" ") || null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Preparazione GitLab non riuscita." };
  }
}

const teamSchema = z.array(
  // z.guid(): z.uuid() rifiuta UUID validi per Postgres ma senza versione RFC (es. quelli del seed).
  z.object({ user_id: z.guid(), roles: z.array(z.enum(ASDP_ROLES)) }),
);

// Salva il team intero: chi ha almeno un ruolo viene inserito o aggiornato, chi non ne ha più
// viene rimosso. I permessi (admin o PM del progetto) li applica la RLS.
const projectUpdateSchema = z.object({
  name: z.string().trim().min(1),
  client: z.string().trim().min(1),
  nature: z.enum(["greenfield", "evolutiva"]),
  status: z.enum(["aperto", "in_presidio", "in_attesa", "chiuso"]),
  current_phase: z.coerce.number().int().min(0).max(4),
  framework_version: z.string().trim().min(1),
  gitlab_project_path: z.string().trim().optional(),
  ...detailsSchema,
});

// Dati del progetto (admin o PM del progetto, via RLS). Se cambia la repo documenti si verifica
// su GitLab, si ricrea il webhook e si reindicizza (relinkDocsRepository); branch e cartella
// restano fissi.
export async function updateProject(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = projectUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Compila tutti i campi obbligatori." };
  const { gitlab_project_path: docsPath, ...fields } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update(fields).eq("id", projectId).select("id, gitlab_project_path").single();
  if (error?.code === "23514") return { error: "La fine prevista non può venire prima dell'inizio." };
  if (!data) return { error: "Non hai i permessi per modificare questo progetto." };

  let warning: string | null = null;
  if (docsPath && docsPath !== data.gitlab_project_path) {
    try {
      warning = (await relinkDocsRepository(supabase, projectId, docsPath)).warnings.join(" ") || null;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Repo documenti non collegata." };
    }
  }
  refresh();
  return { error: null, ok: true, warning };
}

export async function advancePhase(projectId: string, phase: number): Promise<FormState> {
  const parsed = z.number().int().min(0).max(4).safeParse(phase);
  if (!parsed.success) return { error: "Fase non valida." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .update({ current_phase: parsed.data })
    .eq("id", projectId)
    .select("id");
  if (!data?.length) return { error: "Non hai i permessi per modificare questo progetto." };
  refresh();
  return { error: null, ok: true };
}

export async function saveTeam(
  projectId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = teamSchema.safeParse(JSON.parse(String(formData.get("team") ?? "[]")));
  if (!parsed.success) return { error: "Dati del team non validi." };

  const keep = parsed.data.filter((m) => m.roles.length > 0);
  const removed = parsed.data.filter((m) => m.roles.length === 0).map((m) => m.user_id);
  const supabase = await createClient();

  if (keep.length > 0) {
    const { data, error } = await supabase
      .from("project_members")
      .upsert(keep.map((m) => ({ project_id: projectId, ...m })))
      .select("user_id");
    if (error || data.length !== keep.length) {
      return { error: "Non hai i permessi per modificare questo team." };
    }
  }
  if (removed.length > 0) {
    const { data, error } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .in("user_id", removed)
      .select("user_id");
    if (error || data.length !== removed.length) {
      return { error: "Non hai i permessi per modificare questo team." };
    }
  }

  refresh();
  return { error: null, ok: true };
}

export type ReindexResult = { error: string | null; count?: number; warning?: string | null };

// Ricostruisce l'indice dei documenti e ricrea il webhook GitLab se manca. La RLS su
// documents lo permette solo ad admin e PM.
export async function reindexDocuments(projectId: string): Promise<ReindexResult> {
  const supabase = await createClient();
  try {
    const count = await indexProject(supabase, projectId);
    await syncCodeRepositories(supabase, projectId);
    const warning = await ensureProjectWebhook(supabase, projectId);
    refresh();
    return { error: null, count, warning };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Indicizzazione non riuscita." };
  }
}

const repositorySchema = z.object({
  gitlab_path: z.string().trim().min(1),
  role: z.enum(["be", "fe", "altro"]),
  branch: z.string().trim().min(1),
});

// Repo di codice collegate al progetto (admin o PM, via RLS).
export async function addRepository(
  projectId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = repositorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Indica percorso GitLab, ruolo e branch." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_repositories")
    .insert({ project_id: projectId, ...parsed.data });
  if (error?.code === "23505") return { error: "Repo già collegata." };
  if (error) return { error: "Non hai i permessi per modificare le repo del progetto." };
  const warning = await checkRepository(parsed.data.gitlab_path, parsed.data.branch);
  if (!warning) await syncCodeRepositories(supabase, projectId);
  refresh();
  return { error: null, ok: true, warning };
}

export async function removeRepository(id: string): Promise<FormState> {
  const supabase = await createClient();
  const { data } = await supabase.from("project_repositories").delete().eq("id", id).select("id");
  if (!data?.length) return { error: "Non hai i permessi per modificare le repo del progetto." };
  refresh();
  return { error: null };
}

// Suggerimenti di repo GitLab mentre si scrive il percorso.
export async function searchRepositories(text: string) {
  return suggestRepositories(await createClient(), text);
}
