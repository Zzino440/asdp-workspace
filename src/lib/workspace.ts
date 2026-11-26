import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureProjectWebhook, indexProject } from "@/lib/documents";
import { branchExists, commitFiles, searchProjects, createGroup, createProject, getGroup, getProject, GitLabError } from "@/lib/gitlab";
import {
  channelFolder,
  createChannel,
  createFolder,
  type Graph,
  listChannels,
  listTeamMembers,
  MicrosoftError,
  microsoftEnabled,
} from "@/lib/microsoft";

// Preparazione dell'area di lavoro di un progetto: gruppo e repo su GitLab, canale e cartelle su
// Teams. Ogni passo è idempotente (riusa quello che esiste già), così si può rifare dalla card
// "Prepara l'area di lavoro". Il permesso si controlla prima con il client dell'utente: GitLab
// gira col token del service account.

// Senza gruppo padre l'app non crea repo: si collega solo una repo esistente.
export const gitlabCreationEnabled = () => Boolean(process.env.GITLAB_PROJECTS_GROUP);

// Cartelle create nel canale Teams. I documenti ASDP restano su GitLab.
export const TEAMS_FOLDERS = ["Input cliente", "Verbali e trascrizioni", "Governance", "Consegne"];

export const slug = (code: string) =>
  code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type ProjectRow = { id: string; code: string; name: string; client: string; gitlab_project_path: string | null };

async function manageableProject(supabase: SupabaseClient, projectId: string, adminOnly = false) {
  const [{ data: project }, { data: isAdmin }, { data: isPm }] = await Promise.all([
    supabase.from("projects").select("id, code, name, client, gitlab_project_path").eq("id", projectId).maybeSingle<ProjectRow>(),
    supabase.rpc("is_admin"),
    supabase.rpc("has_project_role", { p_project_id: projectId, p_roles: ["pm"] }),
  ]);
  if (!project || !(isAdmin || (isPm && !adminOnly))) {
    throw new Error(adminOnly ? "Solo l'amministratore crea le repo su GitLab." : "Solo l'amministratore o il PM del progetto possono prepararlo.");
  }
  return project;
}

async function author(supabase: SupabaseClient) {
  const { data: claims } = await supabase.auth.getClaims();
  const { data } = await supabase.from("profiles").select("full_name, email").eq("id", claims?.claims.sub).single();
  return { authorName: data?.full_name || data?.email || "ASDP Workspace", authorEmail: data?.email ?? "" };
}

function readme(project: ProjectRow, types: { code: string; name: string; folder: string }[]) {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return `# ${project.code} — ${project.name}

Documenti ASDP del progetto per ${project.client}. Si leggono e si modificano da ASDP Workspace${
    host ? ` (https://${host})` : ""
  } o da Claude con il plugin \`asdp\`; chi preferisce git può lavorare su un clone e fare push.

Ogni documento nasce dalla skill del suo passo, che parte dal proprio template e crea la sua
cartella quando salva il primo file:

| Documento | Cartella |
|---|---|
${types.map((t) => `| ${t.code} ${t.name} | \`${t.folder}/\` |`).join("\n")}

Il codice sta nelle repo \`fe\` e \`be\` dello stesso gruppo, se ci sono.
`;
}

export type SetupResult = { warnings: string[] };

// Gruppo del progetto sotto GITLAB_PROJECTS_GROUP con la repo documenti "adsp" (README che
// spiega le cartelle) e, se richieste, le repo di codice fe e be, registrate nel progetto.
export async function provisionGitLab(
  supabase: SupabaseClient,
  projectId: string,
  code: { fe: boolean; be: boolean },
): Promise<SetupResult> {
  const project = await manageableProject(supabase, projectId, true);
  const parentPath = process.env.GITLAB_PROJECTS_GROUP;
  if (!parentPath) throw new Error("Creazione delle repo non configurata (GITLAB_PROJECTS_GROUP).");
  const warnings: string[] = [];

  try {
    const parent = await getGroup(parentPath);
    if (!parent) throw new Error(`Gruppo GitLab ${parentPath} non trovato o non accessibile al token dell'app.`);
    const groupPath = `${parentPath}/${slug(project.code)}`;
    const group = (await getGroup(groupPath)) ?? (await createGroup(parent.id, slug(project.code), `${project.code} — ${project.name}`));

    // Repo documenti nuova: solo il README alla radice, che spiega le cartelle. Le cartelle sotto
    // asdp/ le crea la skill col primo documento (file vuoti come .gitkeep finirebbero nell'indice).
    // Si riusa solo ciò che è di questo progetto: la repo documenti non cambia una volta collegata
    // e una repo esistente con contenuto (o di un altro progetto) non si collega da qui.
    const docsPath = `${group.full_path}/adsp`;
    if (project.gitlab_project_path && project.gitlab_project_path !== docsPath) {
      throw new Error("Il progetto ha già una repo documenti collegata.");
    }
    const { data: others } = await supabase
      .from("projects")
      .select("id")
      .eq("gitlab_project_path", docsPath)
      .neq("id", projectId);
    if (others?.length) throw new Error(`${docsPath} è già la repo documenti di un altro progetto.`);
    const existing = await getProject(docsPath);
    if (existing && !existing.empty_repo && project.gitlab_project_path !== docsPath) {
      throw new Error(`${docsPath} esiste già con dei file: se è di questo progetto, collegala come repo esistente.`);
    }
    const docs = existing ?? (await createProject(group.id, "adsp", "adsp", false));
    const { data: sameId } = await supabase.from("projects").select("id").eq("gitlab_project_id", docs.id).neq("id", projectId);
    if (sameId?.length) throw new Error(`${docsPath} è già la repo documenti di un altro progetto.`);
    if (docs.empty_repo) {
      const { data: types } = await supabase.from("document_types").select("code, name, folder").order("sort_order");
      await commitFiles(docsPath, "main", [{ path: "README.md", content: readme(project, types ?? []) }], {
        message: "Prepara la repo dei documenti ASDP",
        ...(await author(supabase)),
      });
    }

    if (project.gitlab_project_path !== docsPath) {
      const { data } = await supabase
        .from("projects")
        .update({ gitlab_project_id: docs.id, gitlab_project_path: docsPath, gitlab_branch: "main", docs_root: "asdp/" })
        .eq("id", projectId)
        .select("id");
      if (!data?.length) throw new Error("Impossibile collegare la repo documenti al progetto.");
    }

    for (const role of (["fe", "be"] as const).filter((r) => code[r])) {
      const path = `${group.full_path}/${role}`;
      const repo = (await getProject(path)) ?? (await createProject(group.id, role, role, true));
      const { error } = await supabase
        .from("project_repositories")
        .insert({ project_id: projectId, gitlab_path: path, gitlab_project_id: repo.id, role, branch: "main" });
      if (error && error.code !== "23505") warnings.push(`Repo ${role} creata ma non registrata nel progetto.`);
    }
  } catch (error) {
    if (!(error instanceof GitLabError)) throw error;
    console.error("Preparazione GitLab non riuscita", error);
    throw new Error(
      error.status === 403
        ? "Il token GitLab dell'app non può creare gruppi o repo sotto il gruppo padre."
        : `GitLab non ha completato la preparazione (errore ${error.status}: ${error.body.slice(0, 200)}). Riprova: i passi già fatti vengono riusati.`,
    );
  }

  const webhook = await ensureProjectWebhook(supabase, projectId);
  if (webhook) warnings.push(webhook);
  return { warnings };
}

// Nomi ammessi per i canali di Teams (massimo 50 caratteri, senza alcuni simboli).
const channelName = (project: { code: string; name: string }) =>
  `${project.code} ${project.name}`.replace(/[~#%&*{}+/\\:<>?|'".]/g, " ").replace(/\s+/g, " ").trim().slice(0, 50);

// Canale standard del progetto nel Team scelto (riusa quello con lo stesso nome), cartelle base e
// collegamento della cartella del canale al progetto. Ritorna l'id della cartella collegata.
export async function createProjectChannel(supabase: SupabaseClient, graph: Graph, projectId: string, teamId: string) {
  const project = await manageableProject(supabase, projectId);
  const name = channelName(project);
  const existing = (await listChannels(graph, teamId)).find((c) => c.displayName.toLowerCase() === name.toLowerCase());
  const channel = existing ?? (await createChannel(graph, teamId, name, `Progetto ${project.code} per ${project.client}`));

  // La cartella di un canale appena creato si prepara con qualche secondo di ritardo.
  let folder;
  for (let attempt = 0; !folder; attempt++) {
    try {
      folder = await channelFolder(graph, teamId, channel.id);
    } catch (error) {
      if (!(error instanceof MicrosoftError) || !error.isForbidden || attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  const driveId = folder.parentReference.driveId;
  for (const folderName of TEAMS_FOLDERS) {
    try {
      await createFolder(graph, driveId, folder.id, folderName);
    } catch (error) {
      if (!(error instanceof MicrosoftError) || error.status !== 409) throw error;
    }
  }

  const { data: linked } = await supabase
    .from("project_file_locations")
    .select("id")
    .eq("project_id", projectId)
    .eq("item_id", folder.id)
    .maybeSingle();
  if (linked) return linked.id as string;
  const { data, error } = await supabase
    .from("project_file_locations")
    .insert({ project_id: projectId, label: name, drive_id: driveId, item_id: folder.id, web_url: folder.webUrl })
    .select("id")
    .single();
  if (error) throw new Error("Canale creato ma non collegato al progetto.");
  return data.id as string;
}

// Membri del Team che hanno un account nell'app (per email), da proporre nel team del progetto;
// gli altri si invitano da Amministratore → Utenti.
export async function teamMemberSuggestions(supabase: SupabaseClient, graph: Graph, teamId: string) {
  const [members, team] = await Promise.all([
    listTeamMembers(graph, teamId),
    graph<{ displayName: string }>(`/teams/${teamId}?$select=displayName`),
  ]);
  const emails = members.map((m) => m.email?.toLowerCase()).filter((e): e is string => Boolean(e));
  const { data: people } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .neq("status", "sospeso")
    .in("email", emails);
  const known = new Set((people ?? []).map((p) => p.email.toLowerCase()));
  return {
    team: team.displayName,
    people: (people ?? []).map((p) => ({ id: p.id as string, name: (p.full_name || p.email) as string, email: p.email as string })),
    missing: members.filter((m) => m.email && !known.has(m.email.toLowerCase())).map((m) => m.displayName),
  };
}

export type SetupState = {
  docsRepository: boolean;
  codeRepositories: number;
  teamsFolder: boolean | null; // null = Teams non disponibile
  team: { pm: boolean; tl: boolean };
  documents: number;
};

// Stato dell'area di lavoro ricavato dai dati del progetto (nessuna tabella apposta).
export async function loadSetupState(supabase: SupabaseClient, projectId: string): Promise<SetupState> {
  const [{ data: project }, repositories, folders, { data: members }, documents] = await Promise.all([
    supabase.from("projects").select("gitlab_project_path").eq("id", projectId).single(),
    supabase.from("project_repositories").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("project_file_locations").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("project_members").select("roles").eq("project_id", projectId),
    supabase.from("documents").select("path", { count: "exact", head: true }).eq("project_id", projectId).not("document_type", "is", null),
  ]);
  const roles = (members ?? []).flatMap((m) => m.roles as string[]);
  return {
    docsRepository: Boolean(project?.gitlab_project_path),
    codeRepositories: repositories.count ?? 0,
    teamsFolder: microsoftEnabled() ? (folders.count ?? 0) > 0 : null,
    team: { pm: roles.includes("pm"), tl: roles.includes("tl") },
    documents: documents.count ?? 0,
  };
}

// Passi aperti (codici stabili, li restituisce anche get_project dell'MCP).
export function missingSteps(s: SetupState) {
  return [
    !s.docsRepository && "docs_repository",
    s.codeRepositories === 0 && "code_repositories",
    s.teamsFolder === false && "teams_folder",
    !(s.team.pm && s.team.tl) && "team",
    s.documents === 0 && "kickoff",
  ].filter((v): v is string => Boolean(v));
}

// Numero e percorso delle repo di codice riallineati da GitLab (per numero se c'è). Una repo che
// l'app non vede resta com'è: le skill leggono il codice da un clone locale.
export async function syncCodeRepositories(supabase: SupabaseClient, projectId: string) {
  const { data: repositories } = await supabase
    .from("project_repositories")
    .select("id, gitlab_path, gitlab_project_id")
    .eq("project_id", projectId);
  for (const r of repositories ?? []) {
    try {
      const remote = await getProject(r.gitlab_project_id ? String(r.gitlab_project_id) : r.gitlab_path);
      if (!remote || (remote.id === r.gitlab_project_id && remote.path_with_namespace === r.gitlab_path)) continue;
      await supabase
        .from("project_repositories")
        .update({ gitlab_project_id: remote.id, gitlab_path: remote.path_with_namespace })
        .eq("id", r.id);
    } catch (error) {
      console.error("Repo di codice non riallineata", error);
    }
  }
}

// Collega un'altra repo documenti (admin o PM): verifica su GitLab, salva numero e percorso,
// ricrea il webhook e reindicizza. Il webhook sulla repo vecchia va tolto a mano.
export async function relinkDocsRepository(supabase: SupabaseClient, projectId: string, path: string): Promise<SetupResult> {
  await manageableProject(supabase, projectId);
  const { data: current } = await supabase.from("projects").select("gitlab_branch").eq("id", projectId).single();
  const remote = await getProject(path);
  if (!remote) throw new Error("Repo non trovata su GitLab o non accessibile all'app.");
  if (!(await branchExists(String(remote.id), current?.gitlab_branch ?? "main"))) {
    throw new Error(`La repo non ha il branch ${current?.gitlab_branch ?? "main"}.`);
  }
  const { data: others } = await supabase.from("projects").select("id").eq("gitlab_project_id", remote.id).neq("id", projectId);
  if (others?.length) throw new Error("Questa repo è già la repo documenti di un altro progetto.");
  const { data } = await supabase
    .from("projects")
    .update({ gitlab_project_id: remote.id, gitlab_project_path: remote.path_with_namespace })
    .eq("id", projectId)
    .select("id");
  if (!data?.length) throw new Error("Non hai i permessi per modificare questo progetto.");

  const warnings: string[] = [];
  const webhook = await ensureProjectWebhook(supabase, projectId);
  if (webhook) warnings.push(webhook);
  await indexProject(supabase, projectId);
  return { warnings };
}

// Suggerimenti per i campi "repo GitLab" (admin o PM di almeno un progetto). Un errore di GitLab
// non blocca: niente suggerimenti, il percorso si scrive a mano.
export async function suggestRepositories(supabase: SupabaseClient, text: string) {
  if (text.trim().length < 2) return [];
  const [{ data: isAdmin }, { data: isPm }] = await Promise.all([supabase.rpc("is_admin"), supabase.rpc("is_any_project_pm")]);
  if (!isAdmin && !isPm) return [];
  try {
    return await searchProjects(text.trim());
  } catch {
    return [];
  }
}
