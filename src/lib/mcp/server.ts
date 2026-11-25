import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  createDocument,
  documentLevel,
  DocumentError,
  listDocuments,
  listVersions,
  readDocument,
  saveDocument,
} from "@/lib/documents";

// Tool MCP dell'app: adattatori sottili sopra src/lib/documents/, sempre col client dell'utente.
// Progetti identificati dal codice (es. "PFS"), documenti dal percorso nella repo.

type ClientFor = (ctx: unknown) => { supabase: SupabaseClient; userId: string };

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});
const failure = (message: string) => ({ ...text(message), isError: true });

async function projectId(supabase: SupabaseClient, code: string) {
  const { data } = await supabase.from("projects").select("id").ilike("code", code).maybeSingle();
  return data?.id as string | undefined;
}

const NOT_FOUND = "Progetto non trovato o non accessibile. Usa list_projects per vedere i codici disponibili.";

// Regole minime che il client riceve alla connessione: valgono per ogni modifica.
export const INSTRUCTIONS = `Server MCP di ASDP Workspace: progetti e documenti del framework ASDP di DST, con gli stessi permessi che l'utente ha nell'app.
- I progetti si indicano con il codice (es. PFS): usa list_projects, poi get_project per team, repo di codice, tipi di documento e permessi dell'utente.
- I documenti sono file Markdown con frontespizio YAML (GUIDA-FRONT) tra due righe "---", salvati su GitLab.
- Prima di modificare un documento leggilo con read_document; poi cambia solo le parti necessarie di content e passalo intero a update_document con il last_commit_id letto. Lascia invariato tutto il resto, commenti del frontespizio compresi.
- Stati del documento: Da fare, In corso, Completo, Approvato. Lo stato Approvato e i campi approvato_da, approvato_il, versione_approvata, evidenza_approvazione li cambia solo chi approva; non modificare versione_frontespizio.
- Quando una skill ASDP legge o scrive un file asdp/..., di norma usa questo server: read_document per gli input, create_document per un file nuovo, update_document per uno esistente, con lo stesso percorso. Salva su file locale solo se l'utente lo chiede o se la cartella di lavoro è un clone della repo documenti (il push lo porta nell'app). Il server non cancella file.
- Ogni salvataggio è un commit a nome dell'utente: scrivi messaggi di commit brevi e chiari in italiano.`;

export function registerTools(server: McpServer, clientFor: ClientFor) {
  server.registerTool(
    "list_projects",
    {
      title: "Elenco progetti",
      description: "Progetti ASDP a cui l'utente ha accesso, con codice, cliente, natura, stato e fase corrente.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const { data, error } = await clientFor(ctx)
        .supabase.from("projects")
        .select("code, name, client, nature, status, current_phase")
        .order("code");
      if (error) return failure("Impossibile leggere i progetti.");
      return text(data);
    },
  );

  server.registerTool(
    "get_project",
    {
      title: "Dettaglio progetto",
      description:
        "Dati del progetto, team con ruoli, repo dei documenti e repo di codice collegate, ruoli dell'utente e, per " +
        "ogni tipo di documento del framework, fase, cartella, livello dell'utente (none/view/edit/approve) e " +
        "documenti già presenti con stato e versione.",
      inputSchema: z.object({ project: z.string().describe("Codice del progetto, es. PFS") }),
    },
    async ({ project }, ctx) => {
      const { supabase, userId } = clientFor(ctx);
      const id = await projectId(supabase, project);
      if (!id) return failure(NOT_FOUND);
      const [{ data: info }, { data: members }, { data: repositories }, { data: types }, documents] = await Promise.all([
        supabase
          .from("projects")
          .select("code, name, client, nature, status, current_phase, framework_version, gitlab_project_path, gitlab_branch, docs_root")
          .eq("id", id)
          .single(),
        supabase.from("project_members").select("user_id, roles, profiles(full_name, email)").eq("project_id", id),
        supabase.from("project_repositories").select("gitlab_path, role, branch").eq("project_id", id),
        supabase.from("document_types").select("code, name, phase, folder").order("sort_order"),
        listDocuments(supabase, id),
      ]);
      const levels = await Promise.all((types ?? []).map((t) => documentLevel(supabase, id, t.code)));
      const team = (members ?? []).map((m) => {
        const profile = m.profiles as unknown as { full_name: string; email: string } | null;
        return { name: profile?.full_name || profile?.email, email: profile?.email, roles: m.roles };
      });
      return text({
        ...info,
        team,
        my_roles: (members ?? []).find((m) => m.user_id === userId)?.roles ?? [],
        code_repositories: repositories ?? [],
        document_types: (types ?? []).map((t, i) => ({
          ...t,
          my_level: levels[i],
          documents: documents
            .filter((d) => d.document_type === t.code)
            .map((d) => {
              const front = d.front_matter as Record<string, unknown>;
              return { path: d.path, state: front.stato ?? null, version: front.versione ?? null };
            }),
        })),
      });
    },
  );

  server.registerTool(
    "list_documents",
    {
      title: "Documenti del progetto",
      description:
        "Documenti ASDP del progetto visibili all'utente: percorso, tipo (es. T1.4), stato e versione dal frontespizio.",
      inputSchema: z.object({ project: z.string().describe("Codice del progetto, es. PFS") }),
    },
    async ({ project }, ctx) => {
      const { supabase } = clientFor(ctx);
      const id = await projectId(supabase, project);
      if (!id) return failure(NOT_FOUND);
      const documents = await listDocuments(supabase, id);
      return text(
        documents.map((d) => {
          const front = d.front_matter as Record<string, unknown>;
          return { path: d.path, type: d.document_type, title: front.titolo ?? null, state: front.stato ?? null, version: front.versione ?? null };
        }),
      );
    },
  );

  server.registerTool(
    "read_document",
    {
      title: "Leggi documento",
      description:
        "Legge un documento ASDP. content è il testo esatto del file (frontespizio YAML + Markdown): per " +
        "modificarlo cambia solo le parti necessarie di content e passalo intero a update_document con " +
        "last_commit_id, così il resto del file resta identico. front_matter è il frontespizio già letto, " +
        "solo per consultazione.",
      inputSchema: z.object({
        project: z.string().describe("Codice del progetto, es. PFS"),
        path: z.string().describe("Percorso nella repo documenti, come restituito da list_documents"),
      }),
    },
    async ({ project, path }, ctx) => {
      const { supabase } = clientFor(ctx);
      const id = await projectId(supabase, project);
      if (!id) return failure(NOT_FOUND);
      const document = await readDocument(supabase, id, path);
      if (!document) return failure("Documento non trovato o non accessibile. Usa list_documents.");
      return text({
        path: document.path,
        type: document.documentType,
        last_commit_id: document.lastCommitId,
        front_matter: document.frontMatter,
        content: document.content,
      });
    },
  );

  server.registerTool(
    "list_versions",
    {
      title: "Versioni del documento",
      description:
        "Storico di un documento: un commit per versione, dal più recente, con autore, data, messaggio e canale (app, mcp, git).",
      inputSchema: z.object({
        project: z.string().describe("Codice del progetto, es. PFS"),
        path: z.string().describe("Percorso nella repo documenti"),
      }),
    },
    async ({ project, path }, ctx) => {
      const { supabase } = clientFor(ctx);
      const id = await projectId(supabase, project);
      if (!id) return failure(NOT_FOUND);
      const versions = await listVersions(supabase, id, path);
      if (!versions) return failure("Documento non trovato o non accessibile. Usa list_documents.");
      return text(
        versions.map((v) => ({ commit: v.id, title: v.title, author: v.authorName, date: v.authoredDate, via: v.via })),
      );
    },
  );

  server.registerTool(
    "update_document",
    {
      title: "Salva documento",
      description:
        "Sostituisce il testo completo di un documento ASDP (frontespizio YAML + Markdown) con un commit a nome " +
        "dell'utente. Parti dal content di read_document, modificando solo le parti necessarie, e passa il suo last_commit_id: se nel " +
        "frattempo è cambiato il salvataggio viene rifiutato. Non cambiare stato Approvato né i campi approvato_* " +
        "se l'utente non è approvatore.",
      inputSchema: z.object({
        project: z.string().describe("Codice del progetto, es. PFS"),
        path: z.string().describe("Percorso nella repo documenti"),
        content: z.string().describe("Testo completo del file, frontespizio compreso"),
        last_commit_id: z.string().describe("last_commit_id restituito da read_document"),
        message: z.string().max(200).optional().describe("Messaggio di commit (facoltativo)"),
      }),
    },
    async ({ project, path, content, last_commit_id, message }, ctx) => {
      const { supabase, userId } = clientFor(ctx);
      const id = await projectId(supabase, project);
      if (!id) return failure(NOT_FOUND);
      try {
        const saved = await saveDocument(supabase, {
          projectId: id,
          path,
          content,
          lastCommitId: last_commit_id,
          message,
          via: "mcp",
          userId,
        });
        return text({ saved: true, path, last_commit_id: saved.lastCommitId });
      } catch (e) {
        if (!(e instanceof DocumentError)) throw e;
        return failure(SAVE_ERRORS[e.code]);
      }
    },
  );

  server.registerTool(
    "create_document",
    {
      title: "Crea documento",
      description:
        "Crea un documento ASDP nuovo (Markdown con frontespizio GUIDA-FRONT, o il CSV del backlog) con un commit a " +
        "nome dell'utente. Il percorso è quello indicato dalla skill (es. asdp/backlog/T4.1-BACKLOG.md), sotto la " +
        "cartella documenti del progetto. Il contenuto parte dal template della skill. Se il file esiste già usa " +
        "read_document e update_document.",
      inputSchema: z.object({
        project: z.string().describe("Codice del progetto, es. PFS"),
        path: z.string().describe("Percorso nella repo documenti, es. asdp/backlog/T4.1-BACKLOG.md"),
        content: z.string().describe("Testo completo del file, frontespizio compreso"),
        message: z.string().max(200).optional().describe("Messaggio di commit (facoltativo)"),
      }),
    },
    async ({ project, path, content, message }, ctx) => {
      const { supabase, userId } = clientFor(ctx);
      const id = await projectId(supabase, project);
      if (!id) return failure(NOT_FOUND);
      try {
        const created = await createDocument(supabase, { projectId: id, path, content, message, via: "mcp", userId });
        return text({ created: true, path, type: created.documentType, last_commit_id: created.lastCommitId });
      } catch (e) {
        if (!(e instanceof DocumentError)) throw e;
        return failure(SAVE_ERRORS[e.code]);
      }
    },
  );
}

const SAVE_ERRORS = {
  not_found: "Documento non trovato o non accessibile. Usa list_documents.",
  forbidden: "L'utente non ha il permesso di modificare questo tipo di documento.",
  conflict:
    "Il documento è cambiato dopo l'ultima lettura (o last_commit_id non è valido). Rileggilo con " +
    "read_document, riapplica le modifiche al testo aggiornato e riprova.",
  approval_fields:
    "Solo un approvatore può cambiare lo stato Approvato o i campi approvato_da, approvato_il, " +
    "versione_approvata, evidenza_approvazione. Lascia quei campi come sono.",
  exists: "Il file esiste già. Leggilo con read_document e salvalo con update_document.",
  invalid_path:
    "Percorso non valido: deve stare nella cartella documenti del progetto (docs_root in get_project) e finire " +
    "in .md o .csv.",
  unknown_type:
    "Tipo di documento non riconosciuto. Usa il nome file e il frontespizio del template della skill " +
    "(template_origine), o la cartella del tipo indicata da get_project.",
};
