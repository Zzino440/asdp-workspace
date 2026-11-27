# ASDP Workspace — Architettura

Stato: bozza v0.1 · 2026-11-20 · owner: Lorenzo Belli

## 1. Scopo

App web per gestire i progetti DST con il framework ASDP (plugin `asdp` della marketplace
`dst-claude-skills`, fasi 0–4 + delivery per Feature). Ogni persona vede i documenti che il suo
ruolo nel progetto le permette, li modifica a mano o con l'AI, li porta ai gate e li approva.

Problemi che risolve (call Lorenzo–Denis del 2026-11-18):

| Problema | Risposta |
|---|---|
| PM senza Git e senza accesso al repository | Solo browser; l'app scrive su GitLab con un service account |
| Skill da installare sul PC | Le skill partono dall'app (cloud) oppure da Claude Code in locale, a scelta |
| Framework copiato in ogni progetto | Una sola fonte versionata (plugin `asdp`); ogni progetto dichiara la versione |
| Documenti ASDP da trovare anche in Teams | GitLab resta la fonte (decisione del 2026-11-27: spostarli su SharePoint è bloccato dal GDPR e rompe permessi RLS ed evidenza delle approvazioni); "Pubblica su Teams" mette copie degli approvati (PDF, Word, .md) nella cartella del progetto; "Esporta" scarica gli stessi formati |
| File di progetto sparsi tra Teams, OneDrive e GitLab | Navigatore unico per progetto: documenti ASDP da GitLab, gli altri file (Word, Excel, PDF…) dalla cartella Teams/SharePoint del progetto via Microsoft Graph |
| File sensibili (`reserved`) | Area Riservati fuori da Git, mai inviata all'AI |
| Troppe domande sparse nei documenti | Vista unica delle `D[N]` di progetto, risposte in blocco, rigenerazione in aggiornamento |

## 2. Stack

| Livello | Scelta | Perché |
|---|---|---|
| App | Next.js 16 (App Router, TypeScript, Cache Components) | Un linguaggio e un repo per UI e backend; tipi condivisi; deploy nativo su Vercel; lo stack che gli agenti AI conoscono meglio |
| UI | Tailwind 4 + shadcn/ui (Base UI) + lucide | Componenti nel repo, modificabili; stile vicino al design Stitch |
| Dati e auth | Supabase: Postgres + RLS, Auth, Storage, Realtime | Permessi per ruolo applicati nel DB; login con Microsoft (Entra, tenant DST) o email e password su invito |
| Documenti | GitLab DST, un Project `adsp` per progetto | Unica copia, versioning, già usato dal team tecnico |
| AI | Anthropic Managed Agents (skill) + Messages API (modifiche puntuali) | Nessuna infrastruttura per eseguire le skill; sessioni lunghe asincrone |
| Deploy | Vercel | Preview per branch, zero configurazione |
| Validazione | Zod | Input di form e webhook |

Scelta rispetto a Spring Boot + Angular: Java su Vercel gira solo come container (avvii a freddo
lenti), servirebbero due repo e due deploy, e il backend userebbe Supabase con la service role
perdendo la RLS. Con un solo manutentore che sviluppa con agenti AI, TypeScript end-to-end costa
meno.

## 3. Componenti

```
 Browser (PM, TL, AF, …)    Claude desktop / Code (MCP)    Claude Code locale (git, opzionale)
        │ HTTPS                       │ MCP /api/mcp (OAuth)          │ git push su adsp
        ▼                             ▼                               ▼
 ┌──────────────────────── Vercel: Next.js ────────────────┐   ┌──────────────┐
 │ UI (RSC + client)  │ Route handlers / Server actions    │◀──│ GitLab DST   │ webhook push
 │                    │  - docs: read/commit via GitLab API │──▶│ Project adsp │ (unica copia)
 │                    │  - indexer (webhook GitLab)         │   └──────────────┘
 │                    │  - skill runs (start/resume/webhook)│──▶ Anthropic Managed Agents
 │                    │  - "Modifica con AI" (Messages API) │    (skill asdp via Skills API,
 │                    │  - server MCP (stessi servizi)      │
 └────────────────────┴─────────────────────────────────────┘     output in /mnt/session/outputs)
        │ supabase-js (JWT utente → RLS)
        ▼
 Supabase: Auth · Postgres (indice + dati app, RLS) · Storage (riservati, evidenze) · Realtime
```

### Progetti e repository

- Ogni progetto ha **una repo documenti dedicata** (`projects.gitlab_project_path`), separata dal
  codice: funziona uguale con una o più repo di codice (BE, FE, …).
- Le repo si identificano dal numero GitLab (`gitlab_project_id`), che resta lo stesso se la repo
  viene spostata; il percorso serve per i link e "Reindicizza" lo riallinea.
- `projects.docs_root` (default `asdp/`) è la cartella dei documenti; per i progetti esistenti
  con i documenti dentro una repo di codice si punta a quella repo e cartella.
- Le repo di codice sono registrate in `project_repositories` (percorso, ruolo, branch): servono
  alle skill che leggono il codice e all'MCP per indicare a Claude quali repo aprire.

### Canali di accesso

| Chi | Canale | Cosa fa |
|---|---|---|
| PM, AF, chiunque | Browser | Legge, modifica, gate, approvazioni |
| PM, AF, chiunque | Claude Desktop (Cowork o chat) con il plugin `asdp`, che porta skill e MCP dell'app | Lancia le skill, legge gli input e salva gli output via MCP; interroga lo stato del progetto |
| TL, sviluppatori | Claude Code nella cartella del codice + MCP dell'app (+ plugin `asdp`) | Analizza il codice in locale, legge gli input e salva gli output via MCP |
| Chi preferisce git | Clone della repo documenti + push | Resta supportato: il webhook reindicizza |

UI e MCP sono due adattatori sullo **stesso livello di servizio** (`src/lib/documents/`): stessi
permessi, stessi commit.

### Chi è fonte di cosa

| Dato | Fonte | Note |
|---|---|---|
| Contenuto e stato dei documenti | GitLab, repo documenti del progetto (`adsp`) nella cartella `docs_root` | Il frontespizio GUIDA-FRONT contiene stato, versione e approvazione |
| Codice | Repo BE/FE del progetto (`project_repositories`) | L'app non ci scrive; le skill che leggono codice le usano come input |
| Indice documenti, `D[N]` estratte | Supabase (derivato) | Ricostruito dall'indexer a ogni push; non si modifica a mano |
| Utenti, ruoli per progetto, permessi, gate, run, commenti, risposte `D[N]` | Supabase | Dati che esistono solo nell'app |
| File riservati, evidenze di approvazione | Supabase Storage | Fuori da Git; i riservati non vanno mai all'AI. Restano qui e non su SharePoint: lì li leggerebbero Copilot e i connettori M365 |
| File di progetto non ASDP (Word, Excel, PDF, verbali…) | SharePoint, cartella del canale Teams del progetto | L'app li sfoglia, carica e sposta via Microsoft Graph con l'account Microsoft dell'utente; si aprono in Office per il web (co-editing e versioni di SharePoint). Mai copiati su GitLab |
| Copie pubblicate su Teams | SharePoint, `ASDP/Fase N - …/` nella cartella collegata; cosa è stato pubblicato in Supabase, `document_publications` | Copie, non fonte: ereditano i permessi del canale. Ripubblicare sostituisce i file; "Da ripubblicare" se il documento cambia dopo |
| Account Microsoft collegato | Supabase, `microsoft_accounts` | Refresh token dell'utente per Graph; RLS: solo la propria riga |
| Cartelle Teams collegate al progetto | Supabase, `project_file_locations` | Etichetta, drive e cartella SharePoint; le vedono i membri, le cambiano PM e admin. I file restano su SharePoint |
| Framework (skill `asdp`) | repo `dst-claude-skills` | Versione fissata per progetto, pubblicata sulla Skills API |

## 4. Flussi

1. **Salva documento.** Server action → GitLab Commits API con il `last_commit_id` del file
   aperto (concorrenza ottimistica). In caso di conflitto: banner "modificato su GitLab" con
   Ricarica/Confronta. Commit fatto dal service account con `author_name`/`author_email`
   dell'utente.
2. **Indicizzazione.** Webhook push di GitLab (verificato con `X-Gitlab-Token`) → per ogni `.md`
   cambiato sotto `asdp/`: lettura, parsing del frontespizio, estrazione delle `D[N]` → upsert su
   `documents` e `open_questions`. Le modifiche fatte da Claude Code in locale entrano così senza
   integrazioni. Il webhook lo crea l'app (creazione del progetto e "Reindicizza") sulla repo
   documenti, verso `https://$VERCEL_PROJECT_PRODUCTION_URL/api/gitlab/webhook`: serve che il
   token GitLab sia Maintainer della repo. In locale non viene creato (GitLab non raggiunge il PC).
3. **Skill in cloud.** Avvio asincrono dalla UI → upload degli input come `file` resource →
   sessione Managed Agents con le skill `asdp` della versione del progetto → gli eventi
   aggiornano `skill_runs` (Realtime verso la UI). Ai gate A/B delle skill la sessione si ferma
   (`awaiting_review`); l'utente approva o chiede modifiche dalla UI. A fine run l'app scarica gli
   output da `/mnt/session/outputs` e li committa su GitLab (flusso 1). Il montaggio di repository
   e la scoperta di `.claude/skills` dei Managed Agents funzionano solo con GitHub: input e skill
   si passano in modo esplicito.
4. **Skill in locale.** Claude Desktop (Cowork o chat) o Claude Code sulla cartella del codice,
   con il plugin `asdp` e l'MCP dell'app; con l'MCP collegato le skill di norma leggono gli input
   (`read_document`) e salvano gli output (`create_document` / `update_document` → flusso 1).
   Su richiesta dell'utente, in un clone della repo documenti o senza MCP: file → push → flusso 2.
5. **Gate.** Invio → checklist → decisione. L'approvazione è un commit che aggiorna nel
   frontespizio `stato`, `approvato_da`, `approvato_il`, `versione_approvata`, `gate`; l'hash del
   commit è l'evidenza. L'approvazione del PO cliente si registra come esterna, con upload
   dell'evidenza.
6. **Modifica con AI.** Una chiamata Messages API sulla selezione → testo proposto → diff in UI →
   Accetta = salvataggio normale (flusso 1).
7. **Preparazione del progetto.** "Nuovo progetto" (solo admin) crea la riga e, con "Crea su
   GitLab", il gruppo del progetto sotto `GITLAB_PROJECTS_GROUP` con `adsp` (solo README) e le
   repo di codice scelte, come §18.4.3 della Guida; poi webhook. La scheda "Prepara l'area di
   lavoro" (admin e PM) mostra i passi mancanti, ricavati dai dati esistenti (nessuna tabella):
   repo, canale Teams (creato in un Team esistente con quattro cartelle e collegato), PM e TL,
   Claude, Kickoff. Ogni passo è idempotente. Codice in `src/lib/workspace.ts`; il permesso si
   controlla col client dell'utente prima di usare il token GitLab. L'MCP vede solo lo stato
   (`get_project.setup`), non crea nulla.
8. **MCP.** Il server MCP dell'app (`/api/mcp`, Streamable HTTP) agisce come l'utente: token
   OAuth → JWT Supabase → RLS e `document_level()`. Tool: `list_projects`, `get_project` (team,
   repo, e per ogni tipo di documento livello dell'utente e documenti presenti), `list_documents`,
   `read_document` (testo esatto in `content`), `list_versions`, `update_document`,
   `create_document` (tipo ricavato come nell'indice, serve "edit"); con `MICROSOFT_CLIENT_ID`
   anche i tool dei file Teams del progetto (`*_project_file(s)`, `create_project_folder`,
   servizio `src/lib/project-files.ts`), con l'account Microsoft dell'utente e solo dentro le
   cartelle in `project_file_locations`; con le milestone successive domande aperte, invio in approvazione, avvio
   skill. Le regole minime (leggere prima di salvare, modifiche minime, stati, campi di
   approvazione) arrivano al client come istruzioni del server; le regole dettagliate e i template
   restano nel plugin `asdp`, senza copie nell'app. Ogni scrittura è un commit
   (flusso 1) con trailer `Via: mcp`; i riservati non sono esposti.
   Login: Supabase Auth fa da server OAuth 2.1 (registrazione dinamica dei client, PKCE). Il
   client trova Supabase dai metadati `/.well-known/oauth-protected-resource/api/mcp`, l'utente
   fa login nell'app e autorizza nella pagina `/oauth/consent`, che accetta solo i ritorni verso
   claude.ai, `claude://` (app desktop) e localhost (Claude Code da terminale). Collegamento da
   Claude Code: `claude mcp add --transport http asdp <url-app>/api/mcp`, poi `/mcp` → Authenticate.

## 5. Modello dati

Già nello schema (`supabase/migrations/`):

| Tabella | Contenuto |
|---|---|
| `profiles` | Utente (1:1 con `auth.users`), `is_admin`, stato (invitato → attivo al primo accesso; sospeso = ban in Auth), ultimo accesso |
| `projects` | Codice, nome, cliente, natura, stato progetto, fase corrente, versione framework, repo documenti e `docs_root` |
| `project_repositories` | Repo di codice del progetto: percorso GitLab, ruolo (be, fe, altro), branch |
| `documents` | Indice derivato da GitLab: path, tipo, frontespizio, ultimo commit |
| `project_members` | Ruoli ASDP della persona nel progetto (`asdp_role[]`: pm, tl, af, designer, developer, qa) |
| `document_types` | Catalogo dei documenti ASDP con cartella e skill che li produce |
| `role_permissions` | Livello `none/view/edit/approve` per ruolo e tipo documento; `default_level` dal RACI per "Ripristina default framework" |

Nelle milestone: `open_questions`, `gates`, `skill_runs`, `comments`,
`framework_versions`, `reserved_files`, `audit_log`.

## 6. Sicurezza

- **RLS è l'unico punto dei permessi.** Il codice usa il client con il JWT dell'utente; funzioni
  `is_admin()`, `is_project_member()`, `has_project_role()`, `shares_project_with()`. Un utente con
  più ruoli ottiene l'unione dei permessi.
- **Segreti solo lato server** (token GitLab, chiave Anthropic, service role Supabase): mai con
  prefisso `NEXT_PUBLIC_`.
- **Service role Supabase** solo per i webhook (indexer, eventi delle skill), che non hanno un
  utente, e per l'invito utenti (`auth.admin.inviteUserByEmail`), dopo aver verificato
  `is_admin()` con il client dell'utente.
- **MCP**: agisce sempre come l'utente autenticato (mai service role); stessi permessi della UI.
- **Commit dei documenti**: col token del service account GitLab, con `author` = l'utente
  (nome ed email dal profilo) e trailer `Via: app|mcp`. Prima del commit `saveDocument` controlla
  `document_level() >= edit`; GitLab rifiuta il commit se il file è cambiato dopo l'ultimo
  `last_commit_id` visto (conflitto → l'utente ricarica). La riga d'indice la aggiorna chi ha
  "edit" sul tipo (policy `documents_update_editor`).
- **Campi di approvazione**: `saveDocument` rifiuta, a chi non ha "approve", ogni modifica che
  mette o toglie `stato: Approvato` o cambia `approvato_da`, `approvato_il`, `versione_approvata`,
  `evidenza_approvazione` (confronto con la versione di partenza, `last_commit_id`). Vale per UI e MCP.
  Se invece cambia il testo di un documento Approvato, `saveDocument` lo riporta In corso e svuota
  quei campi (regola GUIDA-FRONT), anche per chi ha solo "edit". I passi del flusso
  (`changeApproval`) richiedono "approve", tranne Segna come completo ("edit").
- **Webhook firmati**: GitLab con secret token, Anthropic con verifica HMAC.
- **Riservati**: bucket privato con policy per persona; esclusi da ogni input AI.
- **File di progetto su SharePoint**: deroga voluta alla regola "permessi solo in RLS". L'app
  chiama Graph con il token delegato dell'utente, quindi decide SharePoint chi vede e modifica;
  la RLS decide solo quale cartella è collegata al progetto e chi può cambiarla.
- **Accesso con Microsoft o su invito**: provider `azure` di Supabase Auth (app registration
  `ASDP`, solo tenant DST), ritorno su `/auth/callback`. La registrazione di Auth è aperta
  (`enable_signup = true`, serve al primo accesso con Microsoft), ma chi può creare un account lo
  decide l'hook `before_user_created` (`public.hook_before_user_created`): Microsoft con email di un
  dominio DST, oppure email/password solo se l'azione Invita ha scritto l'email in
  `signup_invites` (l'evento dell'hook non distingue un invito da una registrazione pubblica).
  Un utente eliminato che rientra con Microsoft viene ricreato senza ruoli: per bloccarlo si usa
  Sospendi. L'email di invito porta a `/auth/confirm` (token verificato lato server), poi a
  `/imposta-password`; in produzione il template `supabase/templates/invite.html` va copiato
  nella dashboard Supabase.
- **Sospensione**: lo stato `sospeso` (modificabile solo dall'admin, via RLS) imposta
  `auth.users.banned_until`; login e refresh vengono rifiutati, il JWT già emesso resta valido
  fino alla scadenza (1 h).

## 7. Milestone

| # | Contenuto |
|---|---|
| 0 | **Fatto**: scaffold, login, layout, schema base con RLS, elenco progetti |
| 1 | **Fatto**: progetti, team, utenti con invito, ruoli e matrice permessi (amministrazione) |
| 2a | **Fatto**: lettura e indice: repo collegate, indexer (webhook + Reindicizza), elenco e vista documenti |
| 2b | **Fatto**: modifica e commit: editor visuale (Milkdown) nella stessa pagina della lettura, salvataggio a blocchi che lascia identico il Markdown non toccato (`src/lib/markdown-splice.ts`), frontespizio come form, concorrenza ottimistica con bozza locale |
| 2c | **Fatto**: versioni (commit del file con autore e canale App/MCP/Git) e diff rispetto alla versione precedente |
| 2d | **In corso**: server MCP con login OAuth, tool di lettura e scrittura, `create_document`, file Teams e Office (fatto); skill del plugin `asdp` che salvano dall'MCP (sul branch `feature/asdp-mcp`); verifica da Cowork e chat di Claude Desktop (sul cloud di prova) |
| 2e | **Fatto** (0.3.0): Guida al framework nell'app (`/guida`): fasi, documenti, ruoli, stati, gate, lavoro con Claude; link dalla mappa e dal documento. Manca la rilettura del team |
| 2f | **In parte**: ponte passo → Claude. Fatti "Copia prompt" (0.12.0) e `next_step` in `get_project` (0.14.0); mancano prompt MCP per passo e pagina "Collega Claude" |
| 3 | **In corso**: gate e approvazioni. Fatto il flusso manuale nella pagina del documento (Completo = in approvazione, checklist del gate da `src/lib/gates.ts`, `changeApproval`) e coda `/approvazioni` (`listToApprove`); mancano AI/MCP, evidenza esterna in Storage |
| 3b | Fase modificabile **fatta** (0.20.0: avanti con conferma, indietro solo admin). Da fare: dashboard "Tocca a me" (panoramica personale: miei documenti in attesa di altri, rimandati a me, scadenze, avanzamento; per le approvazioni solo un contatore verso `/approvazioni`); profilo progetto (Nuovo/Evolutiva/BugFix) |
| 4 | Skill in cloud con gate A/B; sincronizzazione versioni framework → Skills API |
| 5 | Modifica con AI, Domande aperte di progetto. **Fatto** (0.21.0): D[N] con quattro stati nel documento, nel Percorso e nell'MCP. Da fare: risposta alle D[N] con un clic |
| 6 | Riservati, login Microsoft Entra, deploy Vercel. **Fatto** (0.16.0): Esporta (PDF, Word, .md; motore in `src/lib/documents/export/`) e Pubblica su Teams degli approvati (`src/lib/documents/publish.ts`) |
| 7 | **In corso**, solo in locale per Lorenzo finché l'IT non vede l'analisi GDPR. 7a fatta (0.10.0): card "File di progetto" e pagina di collegamento. 7b fatta (0.11.0): carica, nuova cartella, rinomina, sposta, elimina, solo dentro la cartella collegata. 7c fatta (0.12.0, 0.17.0, 0.18.0): tool MCP dei file e di Word, Excel, PowerPoint. File di progetto da Teams/SharePoint (Graph, account Microsoft dell'utente): 7a sfoglia e apri in Office per il web; 7b carica, cartelle, sposta, rinomina; 7c file come input delle skill; la pubblicazione degli approvati (6) scrive nella stessa cartella. La prova `/file-microsoft` (0.8.1) è stata tolta in 0.10.1 |

## 8. Punti aperti

- Skill che chiedono input interattivi oltre ai gate A/B: da verificare sul primo run reale.
- Costi dei Managed Agents (runtime di sessione + token) per progetto.
- MCP da Claude desktop (pannello Server MCP del tab Code): in locale l'app ottiene l'URL di
  login ma non apre il browser, probabilmente perché il server OAuth è su `http://`. Da
  riprovare con un URL `https` (tunnel o deploy di prova); ripiego: token come header.
- Server OAuth di Supabase in beta; la registrazione dinamica è aperta a chiunque (mitigata dalla
  lista di ritorni ammessi nella pagina di consenso).
- Skill del plugin `asdp` che salvano via MCP: fatte sul branch `feature/asdp-mcp` di
  `dst-claude-skills`, da portare su `main` quando ci sarà l'URL di produzione.
- Teams esce dal giro dei documenti ASDP (diverge dalla Guida §18.4.3, va deciso con il team);
  rientra per i file non ASDP (milestone 7, decisione di Lorenzo del 2026-11-26).
- File di progetto: clienti esterni (guest SharePoint, ruolo nell'app) da decidere.
- File di progetto: app registration `ASDP` su Entra del tenant DST (fatta da Lorenzo, permessi
  già aggiunti). Il tenant non permette il consenso degli utenti: serve il consenso
  amministratore dell'IT, una volta per tutti i permessi delegati previsti: `openid`, `profile`,
  `email`, `offline_access`, `User.Read` (login Entra, milestone 6), `User.ReadBasic.All` (scelta
  delle persone), `Team.ReadBasic.All`, `Channel.ReadBasic.All` (Team e canale del progetto),
  `Files.ReadWrite.All`, `Sites.ReadWrite.All` (file e pubblicazione degli approvati),
  `ChannelMessage.Send` (avvisi nel canale, se servono). Nessun permesso applicativo: tutto
  agisce come l'utente.
- Guida del framework e plugin `asdp` divergono su alcuni punti (RACI di T3.1 e T4.1, chi definisce
  gli NFR, G1/G2/G3 usati sia per i gate di Fase 4 sia per gli artefatti di governance): la Guida
  nell'app descrive come funziona con le skill e segnala la differenza; da decidere col team.
