import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { DocumentError, listDocuments, readDocument, saveDocument } from "@/lib/documents";

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
};
