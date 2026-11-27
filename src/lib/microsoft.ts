import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Microsoft Graph con l'account Microsoft collegato dall'utente (permessi delegati: decide
// SharePoint cosa vede). Il refresh token sta in public.microsoft_accounts, riga dell'utente (RLS).

// Funzione nascosta finché l'IT non dà il consenso: senza MICROSOFT_CLIENT_ID pagina e route
// rispondono 404 (oggi le variabili ci sono solo in .env.local di chi sviluppa).
export const microsoftEnabled = () => Boolean(process.env.MICROSOFT_CLIENT_ID);

// Deve essere identico all'URI registrato su Entra: aprire l'app da localhost, non da 127.0.0.1.
// Per ora solo sviluppo locale; sul cloud servirà l'URI di produzione.
const REDIRECT_URI = "http://localhost:4100/api/microsoft/callback";
// .default = tutti i permessi delegati approvati dall'IT sull'app ASDP (elenco in ARCHITETTURA).
const SCOPES = "https://graph.microsoft.com/.default offline_access";
const authority = () => `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0`;

const base64url = (buffer: Buffer) => buffer.toString("base64url");

// Errore di Microsoft (token o Graph). reconnect: il token non vale più, serve ricollegare l'account.
export class MicrosoftError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly reconnect = false,
  ) {
    super(message);
  }

  get isForbidden() {
    return this.status === 403 || this.status === 404;
  }
}

// URL di login Microsoft con state e PKCE; state e verifier vanno salvati dal chiamante.
export function authorizeRequest() {
  const state = base64url(randomBytes(16));
  const verifier = base64url(randomBytes(32));
  const query = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge: base64url(createHash("sha256").update(verifier).digest()),
    code_challenge_method: "S256",
  });
  return { url: `${authority()}/authorize?${query}`, state, verifier };
}

async function token(params: Record<string, string>) {
  const response = await fetch(`${authority()}/token`, {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      scope: SCOPES,
      ...params,
    }),
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) {
    throw new MicrosoftError(
      response.status,
      `Microsoft ${response.status}: ${body.error_description ?? body.error}`,
      body.error === "invalid_grant",
    );
  }
  return body as { access_token: string; refresh_token: string };
}

const saveRefreshToken = async (supabase: SupabaseClient, refreshToken: string) => {
  const { error } = await supabase
    .from("microsoft_accounts")
    .upsert({ refresh_token: refreshToken, updated_at: new Date().toISOString() });
  if (error) throw error;
};

// Callback: codice → token, salva il refresh token dell'utente.
export async function connectAccount(supabase: SupabaseClient, code: string, verifier: string) {
  const tokens = await token({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });
  await saveRefreshToken(supabase, tokens.refresh_token);
}

// Access token fresco dal refresh token salvato; null se l'utente non ha collegato l'account.
async function accessToken(supabase: SupabaseClient) {
  const { data } = await supabase.from("microsoft_accounts").select("refresh_token").maybeSingle();
  if (!data) return null;
  const tokens = await token({ grant_type: "refresh_token", refresh_token: data.refresh_token });
  await saveRefreshToken(supabase, tokens.refresh_token);
  return tokens.access_token;
}

export type Graph = NonNullable<Awaited<ReturnType<typeof graphClient>>>;

// Client Graph per l'utente; null se l'account non è collegato.
export async function graphClient(supabase: SupabaseClient) {
  const access = await accessToken(supabase);
  if (!access) return null;
  return async <T>(path: string, init?: RequestInit) => {
    const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      ...init,
      headers: { ...(init?.headers as Record<string, string>), Authorization: `Bearer ${access}` },
      cache: "no-store",
    });
    if (init?.redirect === "manual") return response as T;
    if (!response.ok) {
      // Il messaggio di Graph (es. intervallo Excel non valido) serve a capire cosa correggere.
      const detail = await response.json().then((b) => b?.error?.message as string | undefined, () => undefined);
      throw new MicrosoftError(response.status, detail ?? `Graph ${response.status} su ${path}`);
    }
    // 202: operazione asincrona accettata (copia), senza corpo.
    if (response.status === 204 || response.status === 202) return undefined as T;
    return (await response.json()) as T;
  };
}

// --- Team, canali e cartelle ---

export type Team = { id: string; displayName: string };
export type Channel = { id: string; displayName: string; membershipType: string };
export type DriveItem = {
  id: string;
  name: string;
  webUrl: string;
  eTag?: string;
  size?: number;
  folder?: { childCount: number };
  file?: { mimeType: string };
  createdDateTime?: string;
  lastModifiedDateTime: string;
  lastModifiedBy?: { user?: { displayName?: string } };
  parentReference: { driveId: string; id?: string; path?: string };
};

const ITEM_FIELDS =
  "id,name,webUrl,eTag,size,folder,file,createdDateTime,lastModifiedDateTime,lastModifiedBy,parentReference";

export async function listTeams(graph: Graph) {
  const { value } = await graph<{ value: Team[] }>("/me/joinedTeams?$select=id,displayName");
  return value.sort((a, b) => a.displayName.localeCompare(b.displayName, "it"));
}

export async function listChannels(graph: Graph, teamId: string) {
  const { value } = await graph<{ value: Channel[] }>(
    `/teams/${teamId}/channels?$select=id,displayName,membershipType`,
  );
  return value.sort((a, b) => a.displayName.localeCompare(b.displayName, "it"));
}

// Canale standard nuovo (Channel.Create, già approvato dall'IT).
export const createChannel = (graph: Graph, teamId: string, displayName: string, description: string) =>
  graph<Channel>(`/teams/${teamId}/channels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName, description, membershipType: "standard" }),
  });

// Team (gruppo Microsoft 365) che possiede la raccolta documenti: per i canali di un Team è il
// Team stesso; null per un drive che non è di un gruppo.
export async function teamOfDrive(graph: Graph, driveId: string) {
  const drive = await graph<{ owner?: { group?: { id: string } } }>(`/drives/${driveId}?$select=owner`);
  return drive.owner?.group?.id ?? null;
}

export type TeamMember = { displayName: string; email: string | null };

export async function listTeamMembers(graph: Graph, teamId: string) {
  const { value } = await graph<{ value: TeamMember[] }>(`/teams/${teamId}/members`);
  return value;
}

// Cartella dei file di un canale (per i canali privati e condivisi è in un sito a parte).
export async function channelFolder(graph: Graph, teamId: string, channelId: string) {
  return graph<DriveItem>(`/teams/${teamId}/channels/${channelId}/filesFolder`);
}

// Percorso relativo a una cartella ("Analisi/Bozze"): ogni parte codificata, i nomi SharePoint
// possono contenere # % & '.
const relative = (path: string) =>
  path ? `:/${path.split("/").filter(Boolean).map(encodeURIComponent).join("/")}:` : "";

export async function getItem(graph: Graph, driveId: string, itemId: string, path = "") {
  return graph<DriveItem>(`/drives/${driveId}/items/${itemId}${relative(path)}?$select=${ITEM_FIELDS}`);
}

// Contenuto di una cartella: prima le cartelle, poi i file, per nome.
export async function listChildren(graph: Graph, driveId: string, itemId: string, path = "") {
  const { value } = await graph<{ value: DriveItem[] }>(
    `/drives/${driveId}/items/${itemId}${relative(path)}/children?$select=${ITEM_FIELDS}&$top=500`,
  );
  return value.sort((a, b) => Number(!!b.folder) - Number(!!a.folder) || a.name.localeCompare(b.name, "it"));
}

// Percorso Graph di un elemento ("/drives/{id}/root:/Generale/Analisi"); la radice della raccolta
// non ha parentReference.path.
const pathOf = (item: DriveItem) =>
  item.parentReference.path ? `${item.parentReference.path}/${item.name}` : `/drives/${item.parentReference.driveId}/root:`;

// Ricerca nella cartella e nelle sottocartelle, con la cartella di ogni risultato relativa a quella
// collegata. SharePoint cerca in tutta la raccolta e non restituisce il percorso: si rilegge ogni
// risultato e si tengono solo quelli dentro la cartella (minimizzazione: niente file di altri canali).
export async function searchFolder(graph: Graph, driveId: string, itemId: string, query: string) {
  const root = await getItem(graph, driveId, itemId);
  const rootPath = pathOf(root);
  const { value } = await graph<{ value: DriveItem[] }>(
    `/drives/${driveId}/items/${itemId}/search(q='${encodeURIComponent(query.replace(/'/g, "''"))}')?$select=id,name&$top=200`,
  );
  // La ricerca di Graph è full-text (contenuto, percorso, nome del sito): si tengono solo gli
  // elementi il cui nome contiene il testo cercato.
  const needle = query.toLocaleLowerCase("it");
  const matches = value.filter((r) => r.name.toLocaleLowerCase("it").includes(needle)).slice(0, 50);
  const items = await Promise.all(matches.map((r) => getItem(graph, driveId, r.id)));
  return items
    .filter((i) => i.parentReference.path === rootPath || i.parentReference.path?.startsWith(`${rootPath}/`))
    .map((item) => ({ item, folder: item.parentReference.path!.slice(rootPath.length + 1) }));
}

// URL di download temporaneo (Graph risponde 302 verso l'URL firmato). format "pdf": il file
// Office convertito in PDF da SharePoint. versionId: il contenuto di una versione precedente.
export async function downloadUrl(graph: Graph, driveId: string, itemId: string, format?: "pdf", versionId?: string) {
  const query = format ? `?format=${format}` : "";
  const version = versionId ? `/versions/${encodeURIComponent(versionId)}` : "";
  const response = await graph<Response>(`/drives/${driveId}/items/${itemId}${version}/content${query}`, {
    redirect: "manual",
  });
  if (response.status !== 302) throw new MicrosoftError(response.status, `Graph ${response.status} sul download`);
  return response.headers.get("location")!;
}

// Versioni di un file, dalla più recente (la prima è quella attuale). Id come su SharePoint ("3.0").
export type FileVersion = {
  id: string;
  lastModifiedDateTime: string;
  lastModifiedBy?: { user?: { displayName?: string } };
  size?: number;
};

export async function listVersions(graph: Graph, driveId: string, itemId: string) {
  const { value } = await graph<{ value: FileVersion[] }>(`/drives/${driveId}/items/${itemId}/versions`);
  return value;
}

// Attività nella cartella collegata e nelle sottocartelle (API activities di Graph, v1.0): anche
// quelle fatte direttamente da Teams/SharePoint. Per un'eliminazione driveItem è la cartella che
// conteneva l'elemento e il nome sta nell'azione.
export type FileActivity = {
  id: string;
  action: "create" | "edit" | "move" | "rename" | "delete" | "restore";
  at: string;
  actor: string;
  mine: boolean;
  name: string;
  folder: string; // relativa alla cartella collegata, "" = la cartella stessa
  isFolder: boolean;
  webUrl?: string; // assente per eliminati e spostati
  oldName?: string;
  from?: string; // spostati: cartella di origine
};

type RawActivity = {
  id: string;
  action: Record<string, { name?: string; objectType?: string; oldName?: string; to?: string } | undefined>;
  actor?: { user?: { displayName?: string; self?: object } };
  times: { recordedDateTime: string };
  driveItem?: DriveItem;
};

// Le più importanti prima: un'attività può avere più azioni (es. edit + version).
const ACTIONS = ["delete", "move", "rename", "restore", "create", "edit"] as const;
const HOUR = 60 * 60 * 1000;

export async function recentActivity(graph: Graph, driveId: string, itemId: string, days: number) {
  const since = Date.now() - days * 24 * HOUR;
  // Graph pagina e non ordina per data: si leggono fino a 5 pagine, poi si filtra e si ordina.
  const readAll = async () => {
    const value: RawActivity[] = [];
    let path: string | undefined =
      `/drives/${driveId}/items/${itemId}/activities?$top=200&$expand=driveItem($select=id,name,webUrl,folder,parentReference)`;
    for (let page = 0; path && page < 5; page++) {
      const body: { value: RawActivity[]; "@odata.nextLink"?: string } = await graph(path);
      value.push(...body.value);
      path = body["@odata.nextLink"]?.replace("https://graph.microsoft.com/v1.0", "");
    }
    return value;
  };
  const [root, value] = await Promise.all([getItem(graph, driveId, itemId), readAll()]);
  const rootPath = pathOf(root);
  const relativeTo = (path?: string) =>
    path === rootPath ? "" : path?.startsWith(`${rootPath}/`) ? path.slice(rootPath.length + 1) : null;
  // Uno spostamento dà la destinazione come "sites/<sito>/<raccolta>/…/<nome>" e, come
  // un'eliminazione, driveItem = cartella di origine.
  const rootUrl = decodeURIComponent(new URL(root.webUrl).pathname).slice(1);

  const all = value.flatMap((a): FileActivity[] => {
    const action = ACTIONS.find((k) => a.action[k]);
    const item = a.driveItem;
    const at = a.times.recordedDateTime;
    // La modifica di una cartella è l'effetto di un cambio al suo interno: già riportato a parte.
    if (!action || !item || Date.parse(at) < since || (action === "edit" && item.folder)) return [];
    const deleted = action === "delete" ? a.action.delete! : null;
    const moved = action === "move" ? (a.action.move!.to ?? "") : null;
    const origin = relativeTo(deleted || moved !== null ? pathOf(item) : item.parentReference.path);
    if (origin === null) return [];
    // Destinazione fuori dalla cartella collegata: resta la cartella di origine.
    const target = moved?.startsWith(`${rootUrl}/`) ? moved.slice(rootUrl.length + 1).split("/").slice(0, -1).join("/") : null;
    return [
      {
        id: a.id,
        action,
        at,
        actor: a.actor?.user?.displayName ?? "—",
        mine: Boolean(a.actor?.user?.self),
        name: deleted?.name ?? (moved !== null ? (moved.split("/").pop() ?? item.name) : item.name),
        folder: target ?? origin,
        isFolder: deleted ? deleted.objectType === "Folder" : moved !== null ? false : Boolean(item.folder),
        webUrl: deleted || moved !== null ? undefined : item.webUrl,
        oldName: a.action.rename?.oldName,
        from: moved !== null ? origin : undefined,
      },
    ];
  });

  // Dalla più recente; i salvataggi ripetuti (stesso file, azione e persona entro un'ora)
  // diventano una riga sola.
  const last = new Map<string, number>();
  return all
    .sort((x, y) => y.at.localeCompare(x.at))
    .filter((a) => {
      const key = `${a.action}|${a.actor}|${a.folder}/${a.name}`;
      const time = Date.parse(a.at);
      const previous = last.get(key);
      if (previous !== undefined && previous - time < HOUR) return false;
      last.set(key, time);
      return true;
    });
}

// --- Gestione (7b): sempre dentro la cartella collegata al progetto ---

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// Il blocco condiviso che Word/Office per il web lascia sul file anche per minuti dopo la chiusura
// fa rispondere 423 a ogni scrittura via Graph. Con questa intestazione SharePoint lo scavalca
// (come fa la sua interfaccia); un file ancora aperto in modifica resta rifiutato con 423.
const BYPASS_LOCK = { Prefer: "bypass-shared-lock" };
const jsonBypass = (method: string, body: unknown): RequestInit => ({
  ...json(method, body),
  headers: { "Content-Type": "application/json", ...BYPASS_LOCK },
});

// Elemento dentro la cartella collegata (sottocartelle comprese, esclusa la cartella stessa);
// altrimenti 404, come se non esistesse: dal progetto non si tocca niente fuori dalla cartella.
export async function itemInFolder(graph: Graph, driveId: string, rootId: string, itemId: string) {
  const [root, item] = await Promise.all([getItem(graph, driveId, rootId), getItem(graph, driveId, itemId)]);
  const rootPath = pathOf(root);
  const inside = item.parentReference.path === rootPath || item.parentReference.path?.startsWith(`${rootPath}/`);
  if (!inside) throw new MicrosoftError(404, "Elemento fuori dalla cartella del progetto");
  return item;
}

export const createFolder = (graph: Graph, driveId: string, parentId: string, name: string) =>
  graph<DriveItem>(
    `/drives/${driveId}/items/${parentId}/children`,
    json("POST", { name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
  );

export const renameItem = (graph: Graph, driveId: string, itemId: string, name: string) =>
  graph<DriveItem>(`/drives/${driveId}/items/${itemId}`, jsonBypass("PATCH", { name }));

export const moveItem = (graph: Graph, driveId: string, itemId: string, parentId: string, name?: string) =>
  graph<DriveItem>(`/drives/${driveId}/items/${itemId}`, jsonBypass("PATCH", { parentReference: { id: parentId }, name }));

// Copia asincrona: SharePoint la accetta (202) e la completa da solo; un nome già presente la fa fallire.
// name: nome della copia (di default quello dell'originale).
export const copyItem = (graph: Graph, driveId: string, itemId: string, parentId: string, name?: string) =>
  graph<void>(`/drives/${driveId}/items/${itemId}/copy`, json("POST", { parentReference: { driveId, id: parentId }, name }));

// Attende che la copia compaia nella cartella (fino a ~30 s) e la restituisce.
export async function waitForItem(graph: Graph, driveId: string, parentId: string, name: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getItem(graph, driveId, parentId, name);
    } catch (error) {
      if (!(error instanceof MicrosoftError && error.status === 404) || attempt >= 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// File piccolo (fino a 4 MB) in una richiesta sola; se il nome esiste già fallisce (409).
export const uploadSmallFile = (
  graph: Graph,
  driveId: string,
  parentId: string,
  fileName: string,
  content: string | Uint8Array,
  mime = "text/plain; charset=utf-8",
) =>
  graph<DriveItem>(
    `/drives/${driveId}/items/${parentId}:/${encodeURIComponent(fileName)}:/content?@microsoft.graph.conflictBehavior=fail`,
    { method: "PUT", headers: { "Content-Type": mime }, body: typeof content === "string" ? content : new Blob([content.slice()]) },
  );

// Nel cestino del sito SharePoint: si recupera da lì.
export const deleteItem = (graph: Graph, driveId: string, itemId: string) =>
  graph<void>(`/drives/${driveId}/items/${itemId}`, { method: "DELETE", headers: BYPASS_LOCK });

// Sessione di caricamento: il browser manda i byte direttamente a SharePoint (uploadUrl già
// autorizzato, senza token), quindi il file non passa dall'app. Con un nome già presente:
// "rename" crea un file nuovo ("nome 1.docx"), "replace" carica una nuova versione di quello
// esistente (stesso link; SharePoint tiene le precedenti), "fail" rifiuta il caricamento.
export async function createUploadSession(
  graph: Graph,
  driveId: string,
  parentId: string,
  fileName: string,
  conflict: "rename" | "replace" | "fail" = "rename",
) {
  const { uploadUrl } = await graph<{ uploadUrl: string }>(
    `/drives/${driveId}/items/${parentId}:/${encodeURIComponent(fileName)}:/createUploadSession`,
    json("POST", { item: { "@microsoft.graph.conflictBehavior": conflict } }),
  );
  return uploadUrl;
}

// Invia i byte a una sessione di caricamento, a pezzi; restituisce l'elemento caricato.
async function sendChunks(uploadUrl: string, bytes: Uint8Array) {
  for (let start = 0; ; start += CHUNK) {
    const end = Math.min(start + CHUNK, bytes.length);
    // uploadUrl è già autorizzato: niente token Graph.
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Range": `bytes ${start}-${end - 1}/${bytes.length}` },
      body: new Blob([bytes.slice(start, end)]),
    });
    if (!response.ok) throw new MicrosoftError(response.status, `Graph ${response.status} sul caricamento`);
    if (end === bytes.length) return (await response.json()) as DriveItem;
  }
}

// Nuova versione di un file esistente modificato dal server. eTag: quello letto prima della
// modifica; se nel frattempo il file è cambiato Graph risponde 412 e non salva niente.
export async function replaceContent(graph: Graph, driveId: string, itemId: string, bytes: Uint8Array, mime: string, eTag: string) {
  if (bytes.length <= SMALL_UPLOAD) {
    return graph<DriveItem>(`/drives/${driveId}/items/${itemId}/content`, {
      method: "PUT",
      headers: { "Content-Type": mime, "If-Match": eTag, ...BYPASS_LOCK },
      body: new Blob([bytes.slice()]),
    });
  }
  return sendChunks(await replaceUploadSession(graph, driveId, itemId, eTag), bytes);
}

// Sessione di caricamento per una nuova versione di un file esistente, solo se è ancora quello
// con eTag (altrimenti 412).
export async function replaceUploadSession(graph: Graph, driveId: string, itemId: string, eTag: string) {
  const { uploadUrl } = await graph<{ uploadUrl: string }>(`/drives/${driveId}/items/${itemId}/createUploadSession`, {
    ...json("POST", { item: { "@microsoft.graph.conflictBehavior": "replace" } }),
    headers: { "Content-Type": "application/json", "If-Match": eTag, ...BYPASS_LOCK },
  });
  return uploadUrl;
}

// --- Pubblicazione dei documenti approvati (milestone 6) ---

// Cartella figlia per nome; la crea se manca. Idempotente: con due pubblicazioni insieme il 409
// della seconda si risolve rileggendo la cartella.
async function childFolder(graph: Graph, driveId: string, parentId: string, name: string) {
  try {
    return await createFolder(graph, driveId, parentId, name);
  } catch (error) {
    if (!(error instanceof MicrosoftError && error.status === 409)) throw error;
    return getItem(graph, driveId, parentId, name);
  }
}

// Percorso di cartelle sotto parentId (["ASDP", "Fase 1 - Analisi"]); restituisce l'ultima.
export async function ensureFolderPath(graph: Graph, driveId: string, parentId: string, names: string[]) {
  let folder = await getItem(graph, driveId, parentId);
  for (const name of names) folder = await childFolder(graph, driveId, folder.id, name);
  return folder;
}

const SMALL_UPLOAD = 4 * 1024 * 1024;
const CHUNK = 5 * 320 * 1024; // multiplo di 320 KiB, come chiede Graph

// File generato dall'app, caricato dal server. Un file con lo stesso nome viene sostituito: stesso
// link, SharePoint tiene le versioni precedenti.
export async function uploadFile(graph: Graph, driveId: string, parentId: string, fileName: string, bytes: Uint8Array, mime: string) {
  const body = (start: number, end: number) => new Blob([bytes.slice(start, end)]);
  if (bytes.length <= SMALL_UPLOAD) {
    return graph<DriveItem>(
      `/drives/${driveId}/items/${parentId}:/${encodeURIComponent(fileName)}:/content?@microsoft.graph.conflictBehavior=replace`,
      { method: "PUT", headers: { "Content-Type": mime }, body: body(0, bytes.length) },
    );
  }
  return sendChunks(await createUploadSession(graph, driveId, parentId, fileName, "replace"), bytes);
}
