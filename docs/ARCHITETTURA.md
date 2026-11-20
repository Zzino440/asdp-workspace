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
| SharePoint senza versioning | GitLab è la fonte; su SharePoint si pubblicano solo copie in sola lettura degli approvati |
| File sensibili (`reserved`) | Area Riservati fuori da Git, mai inviata all'AI |
| Troppe domande sparse nei documenti | Vista unica delle `D[N]` di progetto, risposte in blocco, rigenerazione in aggiornamento |

## 2. Stack

| Livello | Scelta | Perché |
|---|---|---|
| App | Next.js 16 (App Router, TypeScript, Cache Components) | Un linguaggio e un repo per UI e backend; tipi condivisi; deploy nativo su Vercel; lo stack che gli agenti AI conoscono meglio |
| UI | Tailwind 4 + shadcn/ui (Base UI) + lucide | Componenti nel repo, modificabili; stile vicino al design Stitch |
| Dati e auth | Supabase: Postgres + RLS, Auth, Storage, Realtime | Permessi per ruolo applicati nel DB; login email in dev, Microsoft Entra in produzione |
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
- `projects.docs_root` (default `asdp/`) è la cartella dei documenti; per i progetti esistenti
  con i documenti dentro una repo di codice si punta a quella repo e cartella.
- Le repo di codice sono registrate in `project_repositories` (percorso, ruolo, branch): servono
  alle skill che leggono il codice e all'MCP per indicare a Claude quali repo aprire.

### Canali di accesso

| Chi | Canale | Cosa fa |
|---|---|---|
| PM, AF, chiunque | Browser | Legge, modifica, gate, approvazioni |
| Chiunque | MCP da Claude desktop / claude.ai | Interroga lo stato del progetto, legge e salva documenti |
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
| File riservati, evidenze di approvazione | Supabase Storage | Fuori da Git; i riservati non vanno mai all'AI |
| Framework (skill `asdp`) | repo `dst-claude-skills` | Versione fissata per progetto, pubblicata sulla Skills API |

## 4. Flussi

1. **Salva documento.** Server action → GitLab Commits API con il `last_commit_id` del file
   aperto (concorrenza ottimistica). In caso di conflitto: banner "modificato su GitLab" con
   Ricarica/Confronta. Commit fatto dal service account con `author_name`/`author_email`
   dell'utente.
2. **Indicizzazione.** Webhook push di GitLab (verificato con `X-Gitlab-Token`) → per ogni `.md`
   cambiato sotto `asdp/`: lettura, parsing del frontespizio, estrazione delle `D[N]` → upsert su
   `documents` e `open_questions`. Le modifiche fatte da Claude Code in locale entrano così senza
   integrazioni.
3. **Skill in cloud.** Avvio asincrono dalla UI → upload degli input come `file` resource →
   sessione Managed Agents con le skill `asdp` della versione del progetto → gli eventi
   aggiornano `skill_runs` (Realtime verso la UI). Ai gate A/B delle skill la sessione si ferma
   (`awaiting_review`); l'utente approva o chiede modifiche dalla UI. A fine run l'app scarica gli
   output da `/mnt/session/outputs` e li committa su GitLab (flusso 1). Il montaggio di repository
   e la scoperta di `.claude/skills` dei Managed Agents funzionano solo con GitHub: input e skill
   si passano in modo esplicito.
4. **Skill in locale.** Claude Code aperto sulla cartella del codice, con il plugin `asdp` e
   l'MCP dell'app: legge gli input (`read_document`) e salva gli output (`create_document` /
   `update_document` → flusso 1). In alternativa, senza MCP: clone di `adsp` → push → flusso 2.
5. **Gate.** Invio → checklist → decisione. L'approvazione è un commit che aggiorna nel
   frontespizio `stato`, `approvato_da`, `approvato_il`, `versione_approvata`, `gate`; l'hash del
   commit è l'evidenza. L'approvazione del PO cliente si registra come esterna, con upload
   dell'evidenza.
6. **Modifica con AI.** Una chiamata Messages API sulla selezione → testo proposto → diff in UI →
   Accetta = salvataggio normale (flusso 1).
7. **MCP.** Il server MCP dell'app (`/api/mcp`, Streamable HTTP) agisce come l'utente: token
   OAuth → JWT Supabase → RLS e `document_level()`. Tool: `list_projects`, `get_project`,
   `list_documents`, `read_document`, `update_document`, `create_document`; con le milestone
   successive domande aperte, invio in approvazione, avvio skill. Ogni scrittura è un commit
   (flusso 1) con trailer `Via: mcp`; i riservati non sono esposti.

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
- **Webhook firmati**: GitLab con secret token, Anthropic con verifica HMAC.
- **Riservati**: bucket privato con policy per persona; esclusi da ogni input AI.
- **Utenti su invito**: registrazione libera disattivata (`enable_signup = false`). L'email di
  invito porta a `/auth/confirm` (token verificato lato server), poi a `/imposta-password`; in
  produzione il template `supabase/templates/invite.html` va copiato nella dashboard Supabase.
- **Sospensione**: lo stato `sospeso` (modificabile solo dall'admin, via RLS) imposta
  `auth.users.banned_until`; login e refresh vengono rifiutati, il JWT già emesso resta valido
  fino alla scadenza (1 h).

## 7. Milestone

| # | Contenuto |
|---|---|
| 0 | **Fatto**: scaffold, login, layout, schema base con RLS, elenco progetti |
| 1 | **Fatto**: progetti, team, utenti con invito, ruoli e matrice permessi (amministrazione) |
| 2a | **Fatto**: lettura e indice: repo collegate, indexer (webhook + Reindicizza), elenco e vista documenti |
| 2b | **Fatto**: modifica e commit: editor sorgente (CodeMirror) + anteprima, frontespizio come form, concorrenza ottimistica |
| 2c | Versioni e diff |
| 2d | Server MCP: auth, tool di lettura e scrittura sopra lo stesso livello di servizio |
| 3 | Gate e approvazioni |
| 4 | Skill in cloud con gate A/B; sincronizzazione versioni framework → Skills API |
| 5 | Modifica con AI, Domande aperte di progetto |
| 6 | Riservati, Pubblica su SharePoint (Microsoft Graph), login Microsoft Entra, deploy Vercel |

## 8. Punti aperti

- Skill che chiedono input interattivi oltre ai gate A/B: da verificare sul primo run reale.
- Costi dei Managed Agents (runtime di sessione + token) per progetto.
- Editor WYSIWYG da valutare (oggi sorgente CodeMirror + anteprima, senza perdite).
- Campi di approvazione del frontespizio (`stato: Approvato`, `approvato_*`,
  `versione_approvata`, `evidenza_approvazione`): la UI li mostra in sola lettura, ma chi ha
  "edit" può ancora scriverli inviando il testo completo (a mano o via `update_document`). Va
  chiuso nel livello di servizio in M3, prima di aprire le scritture via MCP in 2d.
- Auth dell'MCP: Supabase Auth come server OAuth 2.1 (anche in locale?) oppure token personale
  per Claude Code. Da verificare in 2d.
- Adattare le skill del plugin `asdp` a salvare via MCP invece che su file locali.
- Teams esce dal giro dei documenti ASDP: diverge dalla Guida §18.4.3, va deciso con il team.
