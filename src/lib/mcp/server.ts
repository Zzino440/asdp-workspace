import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  createDocument,
  documentLevel,
  DocumentError,
  listActivity,
  listVersions,
  readDocument,
  saveDocument,
} from "@/lib/documents";
import { microsoftEnabled } from "@/lib/microsoft";
import { type MapDoc, nextStep, projectSteps } from "@/lib/project-steps";
import type { ExcelOperation } from "@/lib/office/excel";
import type { PowerPointOperation } from "@/lib/office/powerpoint";
import type { WordOperation } from "@/lib/office/word";
import { FilesError, projectFiles, type FilesErrorCode, type OfficeContent } from "@/lib/project-files";
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

// Dati di un documento come li mostra la mappa del Percorso.
const docInfo = (d: MapDoc) => ({
  path: d.path,
  type: d.typeCode,
  title: d.title,
  state: d.state,
  version: d.version,
  feature: d.feature,
  owner: d.owner,
  deadline: d.deadline,
  questions: d.questions,
  changes_requested: d.changesRequested,
});

// Commit senza il trailer "Via:" (il canale è già un campo a parte).
const commitMessage = (message: string) => message.replace(/\n+Via: (app|mcp)\s*$/, "").trim();

// Regole minime che il client riceve alla connessione: valgono per ogni modifica.
const BASE_INSTRUCTIONS = `Server MCP di ASDP Workspace: progetti e documenti del framework ASDP di DST, con gli stessi permessi che l'utente ha nell'app.
- I progetti si indicano con il codice (es. PFS): usa list_projects, poi get_project per team, repo di codice, tipi di documento e permessi dell'utente.
- Per "cosa devo fare" o "a che punto siamo" usa get_project: next_step è il prossimo passo come lo mostra l'app (con la skill da lanciare), behind i passi rimasti indietro; per ogni documento ci sono owner, scadenza, domande D[N] e changes_requested. list_activity dice chi ha salvato cosa di recente.
- Domande D[N]: answered = true vuol dire che la risposta è spuntata ma va ancora applicata rilanciando la skill sul documento. Nella T1.4 le D[N] sono copie di quelle dei Requisiti Consolidati (P1.3): si rispondono lì, poi si aggiorna la T1.4.
- Se un documento ha changes_requested, chi l'ha approvato ha chiesto modifiche: parti dal motivo quando lo aggiorni.
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
      description:
        "Progetti ASDP a cui l'utente ha accesso, con codice, cliente, natura, stato, fase corrente, descrizione e date di inizio e fine.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const { data, error } = await clientFor(ctx)
        .supabase.from("projects")
        .select("code, name, client, nature, status, current_phase, description, start_date, end_date")
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
        "Dati del progetto (con descrizione e date), team con ruoli, repo dei documenti e repo di codice collegate, " +
        "ruoli dell'utente, next_step (il prossimo passo del percorso, come nella mappa dell'app, con la skill da " +
        "usare) e behind (passi aperti delle fasi precedenti). Per ogni tipo di documento del framework: fase, " +
        "cartella, skill, per_feature (un documento per Feature), livello dell'utente (none/view/edit/approve) e " +
        "documenti presenti con stato, versione, owner, scadenza, domande D[N] (answered: ha una risposta da " +
        "applicare rilanciando la skill) e changes_requested (motivo di chi ha chiesto modifiche). setup.missing elenca i passi di preparazione mancanti " +
        "(docs_repository, code_repositories, teams_folder, team, kickoff); setup.teams_folders, se presente, elenca le " +
        "cartelle Teams collegate con le sottocartelle base, da usare con i tool *_project_file.",
      inputSchema: z.object({ project: z.string().describe("Codice del progetto, es. PFS") }),
    },
    async ({ project }, ctx) => {
      const { supabase, userId } = clientFor(ctx);
      const id = await projectId(supabase, project);
      if (!id) return failure(NOT_FOUND);
      const [{ data: info }, { data: members }, { data: repositories }, { data: types }, steps, setup, { data: folders }] = await Promise.all([
        supabase
          .from("projects")
          .select(
            "code, name, client, nature, status, current_phase, description, start_date, end_date, framework_version, gitlab_project_path, gitlab_branch, docs_root",
          )
          .eq("id", id)
          .single(),
        supabase.from("project_members").select("user_id, roles, profiles(full_name, email)").eq("project_id", id),
        supabase.from("project_repositories").select("gitlab_path, role, branch").eq("project_id", id),
        supabase.from("document_types").select("code, name, phase, folder, skill_name, per_feature").order("sort_order"),
        projectSteps(supabase, id),
        loadSetupState(supabase, id),
        supabase.from("project_file_locations").select("label, web_url").eq("project_id", id).order("created_at"),
      ]);
      const levels = await Promise.all((types ?? []).map((t) => documentLevel(supabase, id, t.code)));
      const team = (members ?? []).map((m) => {
        const profile = m.profiles as unknown as { full_name: string; email: string } | null;
        return { name: profile?.full_name || profile?.email, email: profile?.email, roles: m.roles };
      });
      const documents = [...steps.mapTypes.flatMap((t) => t.docs), ...steps.otherFiles];
      const { next, behind } = nextStep(steps.open, info?.current_phase ?? 0);
      const step = (s: NonNullable<typeof next>) => ({
        type: s.code,
        name: s.name,
        phase: s.phase,
        skill: s.skill,
        feature: s.feature,
        action: s.doc ? "complete" : "create",
        document: s.doc ? docInfo(s.doc) : null,
      });
      return text({
        ...info,
        next_step: next ? step(next) : null,
        behind: behind.map(step),
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
        document_types: (types ?? []).map(({ skill_name, ...t }, i) => ({
          ...t,
          skill: skill_name,
          my_level: levels[i],
          documents: documents.filter((d) => d.typeCode === t.code).map(docInfo),
        })),
      });
    },
  );

  server.registerTool(
    "list_documents",
    {
      title: "Documenti del progetto",
      description:
        "Documenti ASDP del progetto visibili all'utente: percorso, tipo (es. T1.4), titolo, stato, versione, " +
        "Feature, owner, scadenza, domande D[N] (answered: ha una risposta da applicare rilanciando la skill) e " +
        "changes_requested (chi ha chiesto modifiche e perché, se il documento è tornato In corso).",
      inputSchema: z.object({ project: z.string().describe("Codice del progetto, es. PFS") }),
    },
    async ({ project }, ctx) => {
      const { supabase } = clientFor(ctx);
      const id = await projectId(supabase, project);
      if (!id) return failure(NOT_FOUND);
      const { mapTypes, otherFiles } = await projectSteps(supabase, id);
      return text(
        [...mapTypes.flatMap((t) => t.docs), ...otherFiles].sort((a, b) => a.path.localeCompare(b.path)).map(docInfo),
      );
    },
  );

  server.registerTool(
    "list_activity",
    {
      title: "Attività del progetto",
      description:
        "Ultimi salvataggi dei documenti del progetto visibili all'utente, dal più recente: documento, autore, " +
        "data, canale (app, mcp = Claude, git = push diretto), titolo e dettaglio del commit (es. il motivo di " +
        "una richiesta di modifiche).",
      inputSchema: z.object({
        project: z.string().describe("Codice del progetto, es. PFS"),
        limit: z.number().int().min(1).max(100).optional().describe("Quanti salvataggi (default 20)"),
      }),
    },
    async ({ project, limit }, ctx) => {
      const { supabase } = clientFor(ctx);
      const id = await projectId(supabase, project);
      if (!id) return failure(NOT_FOUND);
      const activity = await listActivity(supabase, id, limit ?? 20);
      return text(
        activity.map((e) => ({
          path: e.path,
          type: e.document_type,
          author: e.author_name,
          date: e.created_at,
          via: e.via,
          title: e.title,
          detail: e.detail,
        })),
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
        "Storico di un documento: un commit per versione, dal più recente, con autore, data, titolo, messaggio " +
        "completo (es. il motivo di una richiesta di modifiche) e canale (app, mcp, git).",
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
        versions.map((v) => ({
          commit: v.id,
          title: v.title,
          message: commitMessage(v.message),
          author: v.authorName,
          date: v.authoredDate,
          via: v.via,
        })),
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
        return failure(e.detail ? `${FILE_ERRORS[e.code]} ${e.detail}` : FILE_ERRORS[e.code]);
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
        "Contenuto di un file della cartella Teams del progetto, con etag per le modifiche. Word (.docx): blocchi " +
        "numerati [b0], [b1]… (titoli in Markdown, {stile}, tabelle con righe e colonne da 0), da usare con " +
        "edit_word_file. PowerPoint (.pptx): slide numerate da 1 con le forme [shape N], i paragrafi e le note, da " +
        "usare con edit_powerpoint_file. Excel (.xlsx): fogli e tabelle, poi celle per riga con numero di riga e " +
        "colonne (formule mostrate come =…), da usare con edit_excel_file; sheet e range limitano la lettura. " +
        "txt, md, vtt, srt, csv, json così come sono; PDF e altri Office (doc, ppt, xls…) come testo estratto. " +
        "Massimo 10 MB (Excel escluso); oltre il limite il testo è troncato e truncated è true.",
      inputSchema: z.object({
        project: projectArg,
        location: locationArg,
        path: pathArg("Percorso del file"),
        sheet: z.string().optional().describe("Solo Excel: foglio da leggere (di default tutti)"),
        range: z.string().optional().describe('Solo Excel, con sheet: intervallo, es. "A1:F40" (di default le celle usate)'),
      }),
      annotations: { readOnlyHint: true },
    },
    withFiles((files, { path, sheet, range }: { project: string; location?: string; path: string; sheet?: string; range?: string }) =>
      files.readText(path, { sheet, range }),
    ),
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
        "Copia un file o una cartella in una cartella del progetto, con lo stesso nome o con new_name (es. per un " +
        "documento o una presentazione nuova basata su una esistente, da modificare poi con edit_word_file / " +
        "edit_powerpoint_file / edit_excel_file). Attende che SharePoint completi la copia e restituisce il nuovo " +
        "file; se il nome esiste già nella destinazione la copia non avviene.",
      inputSchema: z.object({
        project: projectArg,
        location: locationArg,
        from: pathArg("Percorso da copiare"),
        to_folder: z
          .string()
          .describe('Cartella di destinazione, relativa alla cartella collegata ("" = la cartella stessa)'),
        new_name: z.string().optional().describe('Nome della copia, es. "Offerta v2.pptx" (di default lo stesso)'),
      }),
    },
    withFiles(
      (files, { from, to_folder, new_name }: { project: string; location?: string; from: string; to_folder: string; new_name?: string }) =>
        files.copy(from, to_folder, new_name),
    ),
  );

  const cellValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
  const matrix = z.array(z.array(cellValue));
  const etagArg = z.string().describe("etag restituito dall'ultima read_project_file del file");

  server.registerTool(
    "create_office_file",
    {
      title: "Crea file Office Teams",
      description:
        "Crea un file Word, Excel o PowerPoint nuovo nella cartella Teams del progetto (anche non ASDP). Il tipo " +
        "viene dall'estensione: .docx da markdown (titoli, elenchi, tabelle, grassetto, link); .xlsx da sheets " +
        '(righe di celle; una stringa che inizia con "=" è una formula; header: prima riga in grassetto); .pptx da ' +
        "slides (titolo, punti e note, grafica di base 16:9). Per partire da un file esistente (modello, grafica " +
        "aziendale) usa invece copy_project_file con new_name e poi le edit_*. Se il nome esiste già non salva. " +
        "I documenti ASDP vanno su GitLab con create_document.",
      inputSchema: z.object({
        project: projectArg,
        location: locationArg,
        path: pathArg('Percorso del nuovo file, es. "Verbali/Verbale 12-11.docx"'),
        markdown: z.string().optional().describe("Solo .docx: testo in Markdown"),
        sheets: z
          .array(z.object({ name: z.string(), rows: matrix.optional(), header: z.boolean().optional() }))
          .optional()
          .describe("Solo .xlsx: fogli in ordine"),
        slides: z
          .array(z.object({ title: z.string(), bullets: z.array(z.string()).optional(), notes: z.string().optional() }))
          .optional()
          .describe("Solo .pptx: slide in ordine; la prima senza punti fa da copertina"),
      }),
    },
    withFiles((files, { path, ...content }: { project: string; location?: string; path: string } & OfficeContent) =>
      files.createOffice(path, content),
    ),
  );

  server.registerTool(
    "edit_word_file",
    {
      title: "Modifica Word Teams",
      description:
        "Modifica un .docx della cartella Teams del progetto e salva una nuova versione (SharePoint tiene le " +
        "precedenti). Prima read_project_file: gli id dei blocchi (b0, b1…) e l'etag vengono da lì e valgono " +
        "tutti per lo stato letto, anche dopo inserimenti ed eliminazioni nella stessa chiamata. Cambia solo il " +
        "testo: stili, numerazione, immagini, intestazioni restano. track_changes true = revisioni di Word " +
        "(accetta/rifiuta) a nome dell'utente: usalo se l'utente lo chiede o il documento è del cliente. Se il " +
        "file è cambiato dopo la lettura il salvataggio viene rifiutato: rileggi e riprova.",
      inputSchema: z.object({
        project: projectArg,
        location: locationArg,
        path: pathArg("Percorso del .docx"),
        etag: etagArg,
        track_changes: z.boolean().optional().describe("Modifiche come revisioni di Word (di default no)"),
        operations: z
          .array(
            z.discriminatedUnion("op", [
              z.object({ op: z.literal("replace_block"), block: z.string(), text: z.string() }),
              z.object({
                op: z.literal("insert_after"),
                block: z.string(),
                paragraphs: z.array(
                  z.object({
                    text: z.string(),
                    style: z.string().optional().describe('Stile di paragrafo, es. "Heading 2" (di default quello del blocco)'),
                  }),
                ),
              }),
              z.object({ op: z.literal("delete_block"), block: z.string() }),
              z.object({ op: z.literal("set_cell"), block: z.string(), row: z.number().int().min(0), col: z.number().int().min(0), text: z.string() }),
              z.object({
                op: z.literal("find_replace"),
                find: z.string().min(1),
                replace: z.string(),
                block: z.string().optional().describe("Solo in questo blocco (di default tutto il documento)"),
              }),
            ]),
          )
          .min(1),
      }),
      annotations: { destructiveHint: true },
    },
    withFiles(
      (
        files,
        { path, etag, operations, track_changes }: { project: string; location?: string; path: string; etag: string; operations: WordOperation[]; track_changes?: boolean },
      ) => files.editWord(path, etag, operations, track_changes ?? false),
    ),
  );

  server.registerTool(
    "edit_powerpoint_file",
    {
      title: "Modifica PowerPoint Teams",
      description:
        "Modifica un .pptx della cartella Teams del progetto e salva una nuova versione. Prima read_project_file: " +
        "numeri di slide (da 1), id delle forme ed etag vengono da lì e valgono per lo stato letto. set_text " +
        "sostituisce i paragrafi di una forma tenendone il formato; set_notes le note (solo se la slide le ha); " +
        "duplicate_slide copia una slide (dopo after, di default dopo sé stessa; 0 = in testa); move_slide la sposta " +
        "dopo after; delete_slide la toglie. Grafica e layout restano quelli del file. Se il file è cambiato dopo la " +
        "lettura il salvataggio viene rifiutato.",
      inputSchema: z.object({
        project: projectArg,
        location: locationArg,
        path: pathArg("Percorso del .pptx"),
        etag: etagArg,
        operations: z
          .array(
            z.discriminatedUnion("op", [
              z.object({ op: z.literal("set_text"), slide: z.number().int().min(1), shape: z.number().int(), paragraphs: z.array(z.string()) }),
              z.object({ op: z.literal("set_notes"), slide: z.number().int().min(1), text: z.string() }),
              z.object({ op: z.literal("duplicate_slide"), slide: z.number().int().min(1), after: z.number().int().min(0).optional() }),
              z.object({ op: z.literal("delete_slide"), slide: z.number().int().min(1) }),
              z.object({ op: z.literal("move_slide"), slide: z.number().int().min(1), after: z.number().int().min(0) }),
            ]),
          )
          .min(1),
      }),
      annotations: { destructiveHint: true },
    },
    withFiles(
      (files, { path, etag, operations }: { project: string; location?: string; path: string; etag: string; operations: PowerPointOperation[] }) =>
        files.editPowerPoint(path, etag, operations),
    ),
  );

  server.registerTool(
    "edit_excel_file",
    {
      title: "Modifica Excel Teams",
      description:
        "Modifica un .xlsx della cartella Teams del progetto direttamente in Excel (formattazione e grafici restano, " +
        "chi lo ha aperto vede le modifiche). Prima read_project_file per fogli, tabelle e celle. set_range scrive " +
        'values o formulas (matrice delle stesse dimensioni di address, es. "B2:D4"); clear_range svuota i valori; ' +
        "append_table_rows aggiunge righe a una tabella di Excel; add_sheet, rename_sheet, delete_sheet per i fogli.",
      inputSchema: z.object({
        project: projectArg,
        location: locationArg,
        path: pathArg("Percorso del .xlsx"),
        operations: z
          .array(
            z.discriminatedUnion("op", [
              z.object({ op: z.literal("set_range"), sheet: z.string(), address: z.string(), values: matrix.optional(), formulas: matrix.optional() }),
              z.object({ op: z.literal("clear_range"), sheet: z.string(), address: z.string() }),
              z.object({ op: z.literal("add_sheet"), name: z.string() }),
              z.object({ op: z.literal("rename_sheet"), sheet: z.string(), name: z.string() }),
              z.object({ op: z.literal("delete_sheet"), sheet: z.string() }),
              z.object({ op: z.literal("append_table_rows"), table: z.string(), values: matrix }),
            ]),
          )
          .min(1),
      }),
      annotations: { destructiveHint: true },
    },
    withFiles((files, { path, operations }: { project: string; location?: string; path: string; operations: ExcelOperation[] }) =>
      files.editExcel(path, operations),
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
    "Formato non supportato: si leggono testo, PDF, Word, PowerPoint ed Excel; si caricano solo file di testo (Word, Excel e PowerPoint si creano con create_office_file).",
  too_large: "File troppo grande (lettura e modifica fino a 10 MB, caricamento e creazione fino a 4 MB).",
  conflict: "Il file è cambiato dopo l'ultima lettura: rileggilo con read_project_file e riapplica le modifiche.",
  invalid_op: "Operazione non valida:",
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
