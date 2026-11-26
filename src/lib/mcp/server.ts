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
import { microsoftEnabled } from "@/lib/microsoft";
import { FilesError, projectFiles, type FilesErrorCode } from "@/lib/project-files";
import { loadSetupState, missingSteps, TEAMS_FOLDERS } from "@/lib/workspace";

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
const BASE_INSTRUCTIONS = `Server MCP di ASDP Workspace: progetti e documenti del framework ASDP di DST, con gli stessi permessi che l'utente ha nell'app.
- I progetti si indicano con il codice (es. PFS): usa list_projects, poi get_project per team, repo di codice, tipi di documento e permessi dell'utente.
- I documenti sono file Markdown con frontespizio YAML (GUIDA-FRONT) tra due righe "---", salvati su GitLab.
- Prima di modificare un documento leggilo con read_document; poi cambia solo le parti necessarie di content e passalo intero a update_document con il last_commit_id letto. Lascia invariato tutto il resto, commenti del frontespizio compresi.
- Stati del documento: Da fare, In corso, Completo, Approvato. Lo stato Approvato e i campi approvato_da, approvato_il, versione_approvata, evidenza_approvazione li cambia solo chi approva; non modificare versione_frontespizio. Se cambi il testo di un documento Approvato, il server lo riporta In corso e svuota i dati di approvazione: va riapprovato.
- Quando una skill ASDP legge o scrive un file asdp/..., di norma usa questo server: read_document per gli input, create_document per un file nuovo, update_document per uno esistente, con lo stesso percorso. Salva su file locale solo se l'utente lo chiede o se la cartella di lavoro è un clone della repo documenti (il push lo porta nell'app). Il server non cancella file.
- Ogni salvataggio è un commit a nome dell'utente: scrivi messaggi di commit brevi e chiari in italiano.
- Se get_project.setup.missing contiene docs_repository il progetto non ha una repo documenti e non si può salvare: dillo all'utente e rimandalo alla scheda "Prepara l'area di lavoro" del progetto nell'app. Gli altri passi di setup.missing citali solo se servono a ciò che l'utente chiede. Il server non crea repo, canali o team.`;

// Aggiunte quando i file Teams sono attivi (MICROSOFT_CLIENT_ID).
const FILES_INSTRUCTIONS = `
- I file del cliente (offerta, RFP, trascrizioni, verbali) stanno nelle cartelle Teams del progetto (get_project.setup.teams_folders), non su GitLab. Per gli input di una skill elenca con list_project_files la cartella indicata nella richiesta (es. "Input cliente", "Verbali e trascrizioni"), leggi con read_project_file i file utili e dì all'utente quali hai usato. Se la cartella è vuota o manca, chiedi all'utente invece di inventare.
- I percorsi dei file sono relativi alla cartella collegata (es. "Input cliente/Offerta.docx"). Il server non esce mai da quella cartella.
- Sposta, rinomina, copia ed elimina file solo se l'utente lo chiede in modo esplicito. Non copiare i file del cliente nella repo documenti: i documenti ASDP li citano per nome.
- Se un tool dei file risponde che l'account Microsoft non è collegato, rimanda l'utente alla scheda File del progetto nell'app.`;

export const INSTRUCTIONS = BASE_INSTRUCTIONS + (microsoftEnabled() ? FILES_INSTRUCTIONS : "");

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
        "documenti già presenti con stato e versione. setup.missing elenca i passi di preparazione mancanti " +
        "(docs_repository, code_repositories, teams_folder, team, kickoff); setup.teams_folders, se presente, elenca le " +
        "cartelle Teams collegate con le sottocartelle base, da usare con i tool *_project_file.",
      inputSchema: z.object({ project: z.string().describe("Codice del progetto, es. PFS") }),
    },
    async ({ project }, ctx) => {
      const { supabase, userId } = clientFor(ctx);
      const id = await projectId(supabase, project);
      if (!id) return failure(NOT_FOUND);
      const [{ data: info }, { data: members }, { data: repositories }, { data: types }, documents, setup, { data: folders }] = await Promise.all([
        supabase
          .from("projects")
          .select("code, name, client, nature, status, current_phase, framework_version, gitlab_project_path, gitlab_branch, docs_root")
          .eq("id", id)
          .single(),
        supabase.from("project_members").select("user_id, roles, profiles(full_name, email)").eq("project_id", id),
        supabase.from("project_repositories").select("gitlab_path, role, branch").eq("project_id", id),
        supabase.from("document_types").select("code, name, phase, folder").order("sort_order"),
        listDocuments(supabase, id),
        loadSetupState(supabase, id),
        supabase.from("project_file_locations").select("label, web_url").eq("project_id", id).order("created_at"),
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
        setup: {
          teams_folders: microsoftEnabled()
            ? (folders ?? []).map((f) => ({ label: f.label, web_url: f.web_url, subfolders: TEAMS_FOLDERS }))
            : undefined,
          teams_folder: setup.teamsFolder,
          missing: missingSteps(setup),
        },
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

  if (microsoftEnabled()) registerFileTools(server, clientFor);
}

// --- File Teams/SharePoint del progetto (solo con MICROSOFT_CLIENT_ID) ---

const projectArg = z.string().describe("Codice del progetto, es. PFS");
const locationArg = z
  .string()
  .optional()
  .describe("Etichetta della cartella collegata (get_project.setup.teams_folders); di default la prima");
const pathArg = (what: string) =>
  z.string().describe(`${what}, relativo alla cartella collegata (es. "Input cliente/Offerta.docx")`);

type Files = Awaited<ReturnType<typeof projectFiles>>;

function registerFileTools(server: McpServer, clientFor: ClientFor) {
  // Risolve progetto e cartella collegata, esegue l'operazione e traduce gli errori.
  const withFiles =
    <A extends { project: string; location?: string }>(operation: (files: Files, args: A) => Promise<unknown>) =>
    async (args: A, ctx: unknown) => {
      const { supabase } = clientFor(ctx);
      const id = await projectId(supabase, args.project);
      if (!id) return failure(NOT_FOUND);
      try {
        const files = await projectFiles(supabase, id, args.location);
        return text((await operation(files, args)) ?? { done: true });
      } catch (e) {
        if (!(e instanceof FilesError)) throw e;
        return failure(FILE_ERRORS[e.code]);
      }
    };

  server.registerTool(
    "list_project_files",
    {
      title: "Elenca file Teams",
      description:
        "Contenuto di una cartella Teams del progetto (sottocartelle prima): percorso, tipo, dimensione, data e autore " +
        "dell'ultima modifica, link.",
      inputSchema: z.object({
        project: projectArg,
        location: locationArg,
        folder: z.string().optional().describe('Sottocartella, es. "Input cliente"; vuota = la cartella collegata'),
      }),
      annotations: { readOnlyHint: true },
    },
    withFiles((files, { folder }: { project: string; location?: string; folder?: string }) => files.list(folder)),
  );

  server.registerTool(
    "search_project_files",
    {
      title: "Cerca file Teams",
      description:
        "Cerca per nome e contenuto nella cartella Teams del progetto e nelle sottocartelle (massimo 25 risultati).",
      inputSchema: z.object({ project: projectArg, location: locationArg, query: z.string().min(1) }),
      annotations: { readOnlyHint: true },
    },
    withFiles((files, { query }: { project: string; location?: string; query: string }) => files.search(query)),
  );

  server.registerTool(
    "read_project_file",
    {
      title: "Leggi file Teams",
      description:
        "Testo di un file della cartella Teams del progetto: txt, md, vtt, srt, csv, json così come sono; PDF, Word, " +
        "PowerPoint ed Excel come testo estratto (impaginazione persa). Massimo 10 MB; oltre 150.000 caratteri il " +
        "testo è troncato e truncated è true.",
      inputSchema: z.object({ project: projectArg, location: locationArg, path: pathArg("Percorso del file") }),
      annotations: { readOnlyHint: true },
    },
    withFiles((files, { path }: { project: string; location?: string; path: string }) => files.readText(path)),
  );

  server.registerTool(
    "create_project_folder",
    {
      title: "Crea cartella Teams",
      description: "Crea una cartella nella cartella Teams del progetto.",
      inputSchema: z.object({ project: projectArg, location: locationArg, path: pathArg("Percorso della nuova cartella") }),
    },
    withFiles((files, { path }: { project: string; location?: string; path: string }) => files.createFolder(path)),
  );

  server.registerTool(
    "upload_project_file",
    {
      title: "Carica file Teams",
      description:
        "Salva un file di testo scritto da Claude (md, txt, csv, json, vtt, html, xml; massimo 4 MB) nella cartella " +
        "Teams del progetto. Se il nome esiste già il salvataggio viene rifiutato. I documenti ASDP vanno invece su " +
        "GitLab con create_document.",
      inputSchema: z.object({
        project: projectArg,
        location: locationArg,
        path: pathArg("Percorso del nuovo file"),
        content: z.string().describe("Testo completo del file"),
      }),
    },
    withFiles((files, { path, content }: { project: string; location?: string; path: string; content: string }) =>
      files.uploadText(path, content),
    ),
  );

  server.registerTool(
    "move_project_file",
    {
      title: "Sposta o rinomina file Teams",
      description:
        "Sposta e/o rinomina un file o una cartella dentro la cartella Teams del progetto. Solo su richiesta " +
        "esplicita dell'utente.",
      inputSchema: z.object({
        project: projectArg,
        location: locationArg,
        from: pathArg("Percorso attuale"),
        to: pathArg("Nuovo percorso completo, cartella e nome"),
      }),
      annotations: { destructiveHint: true },
    },
    withFiles((files, { from, to }: { project: string; location?: string; from: string; to: string }) =>
      files.move(from, to),
    ),
  );

  server.registerTool(
    "copy_project_file",
    {
      title: "Copia file Teams",
      description:
        "Copia un file o una cartella in un'altra cartella del progetto, con lo stesso nome. SharePoint completa la " +
        "copia in pochi secondi; se il nome esiste già nella destinazione la copia non avviene.",
      inputSchema: z.object({
        project: projectArg,
        location: locationArg,
        from: pathArg("Percorso da copiare"),
        to_folder: z
          .string()
          .describe('Cartella di destinazione, relativa alla cartella collegata ("" = la cartella stessa)'),
      }),
    },
    withFiles((files, { from, to_folder }: { project: string; location?: string; from: string; to_folder: string }) =>
      files.copy(from, to_folder),
    ),
  );

  server.registerTool(
    "delete_project_file",
    {
      title: "Elimina file Teams",
      description:
        "Sposta nel cestino del sito SharePoint un file o una cartella del progetto (si recupera da lì). Solo su " +
        "richiesta esplicita dell'utente.",
      inputSchema: z.object({ project: projectArg, location: locationArg, path: pathArg("Percorso da eliminare") }),
      annotations: { destructiveHint: true },
    },
    withFiles((files, { path }: { project: string; location?: string; path: string }) => files.remove(path)),
  );
}

const FILE_ERRORS: Record<FilesErrorCode, string> = {
  not_linked:
    "Il progetto non ha una cartella Teams collegata (o non con questa etichetta). Si collega dalla scheda File del " +
    "progetto nell'app.",
  no_account: "L'utente non ha collegato l'account Microsoft: lo collega dalla scheda File del progetto nell'app.",
  reconnect:
    "Il collegamento a Microsoft è scaduto: l'utente deve ricollegare l'account dalla scheda File del progetto nell'app.",
  not_found: "File o cartella non trovato nella cartella del progetto. Usa list_project_files per i percorsi.",
  forbidden: "L'utente non ha i permessi su Teams per questa operazione.",
  exists: "Esiste già un elemento con questo nome.",
  locked: "Il file è aperto o bloccato in SharePoint: riprova tra poco.",
  invalid_path:
    'Percorso non valido: relativo alla cartella collegata, senza ".." e con un nome senza " * : < > ? \\ | né ' +
    "punto finale.",
  unreadable:
    "Formato non supportato: si leggono testo, PDF, Word, PowerPoint ed Excel; si caricano solo file di testo.",
  too_large: "File troppo grande (lettura fino a 10 MB, caricamento fino a 4 MB).",
  unavailable: "Microsoft non risponde: riprova tra poco.",
};

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
  // Solo del flusso di approvazione, che oggi non ha tool MCP.
  invalid_state: "Lo stato del documento non permette questo passo.",
  incomplete: "Checklist o campi obbligatori incompleti.",
};
