# Stato del lavoro

> Istantanea operativa: dove siamo, cosa viene dopo, cosa resta da provare. Va letta all'inizio
> di ogni sessione e aggiornata alla fine di ogni passo (anche a metà di un piano).
> Cosa è cambiato in ogni versione: `CHANGELOG.md`. Architettura e milestone:
> `docs/ARCHITETTURA.md`. Idee e lavori non pianificati: `TODO.md`.
>
> Regola di scrittura: qui solo ciò che serve per ripartire. Quando una cosa è fatta e provata
> esce da "Da provare"; il racconto di come è stata fatta sta nel CHANGELOG e nei commit.

**Ultimo aggiornamento**: 2026-11-27 — Lorenzo Belli con Claude Code (0.27.0 su `feat/percorso-parallelo`)

## Dove siamo

- **0.26.0** su `feat/percorso-parallelo` (da `master` `ae90628`), committata, non unita né pushata: percorso ibrido.
  - Colonna `document_types.requires`.
  - Mappa con «Puoi anticipare» (0.26.1, testo: non cambia la fase) e «Serve prima».
  - MCP `parallel_steps` / `requires_missing`.
  - Guida «Cosa si può fare in parallelo».
  - Va insieme al plugin `asdp` 0.18.0 (`dst-claude-skills`, branch `feature/percorso-parallelo` da `main` `b81ba4d`, separato da `feature/asdp-mcp`, commit `07905d0`, unito in `main` con `183b2a2`, pushato con tag marketplace `0.15.0`). `feature/asdp-mcp` usa già 0.18.0 in locale: quando unirà `main` passerà a una versione sopra.
  - Migration applicata solo al DB locale (`migration up`), non al cloud.
  - Da fare: `supabase test db` dopo un `db reset` (oggi 4 file falliscono per dati locali oltre il seed); merge e tag su indicazione.
- **0.26.1** e **0.27.0** su `feat/percorso-parallelo`, committate, non unite né pushate. 0.26.1: testi «Puoi anticipare». 0.27.0: tool MCP `read_guide` (Claude legge la Guida, istruzione del server per usarlo sulle domande sul framework), testi della Guida inclusi nella route `/api/mcp` (`next.config.ts`). Check, build e prova dal connettore di sviluppo OK.

- **Versione**: `0.22.3` su `master` (blocco 1 dell'analisi del 2026-11-27: errori gestiti,
  frontespizio robusto, Vitest), unita da `consolidamento`. `master` e tag `0.22.2`, `0.22.3`
  pushati il 2026-11-27.
- **0.24.0** su `master` (da `feedback-azioni`, unito, si può eliminare): punto 1 della UX
  dell'analisi: «Tocca a te» nel prossimo passo, toast di conferma (`sonner`), conflitti con chi e
  quando. Tag `0.23.0` e `0.24.0` creati e pushati con `master` il 2026-11-27.
- **0.25.0** su `master`, **non committata**: punti risolti evidenziati nella pagina del documento
  (tracce `→ risolto da D[N]` / `→ aggiornato su indicazione utente` in verde, gruppo «Risolte»
  nel pannello); istruzione MCP e guide allineate alla versione solo nel frontespizio. Da fare: commit, tag `0.25.0`, push.
- **Branch**: `master` (principale), `consolidamento` (unito in `master`, si può eliminare), `develop` (fermo a
  `0.19.1`, `c62abf0`), `feat/domande-evidenziate` (unita in `master`, si può eliminare).
- **0.23.0** su `master`: editor con menu "/" e menu sulla selezione.
- **Ultimo lavoro** (0.21–0.22, pagina del documento): domande D[N] con quattro stati e riquadri
  colorati, pannello Domande, salto e lampeggio; punto di lettura che resta fermo tra lettura e
  modifica, doppio clic per modificare; indice sincronizzato con l'editor e pannello destro
  riducibile; editor con la spaziatura della lettura.
- **Cloud di test**: spento dal 2026-11-20 (vedi "Come riaccendere il cloud di test").
- **Integrazione Microsoft/Teams**: attiva solo per Lorenzo in locale (condizione dell'IT).

## Prossimi passi

0. **Consolidamento** (analisi indipendente del codice del 2026-11-27). Blocco 1 fatto in 0.22.3,
   prossimo passo per persona e feedback delle azioni in 0.24.0 (toast solo nella pagina del
   documento; le altre schermate hanno ancora il testo accanto ai pulsanti). Poi da valutare:
   dashboard "Tocca a me", notifiche (approvatore e autore), mobile; tipi Supabase generati; reindex più leggero.
   Prima di dare l'app al team: chiudere in RLS le colonne `gitlab_*`/`docs_root` di `projects`
   per il PM e le righe di `documents` scritte a mano dagli editor; redirect `next` al login che
   accetta `/` seguito da backslash; immagini remote nell'export PDF.
1. Provare a mano la pagina del documento 0.21–0.22 (pannello ridotto, editor) e decidere se fare
   i riquadri D[N] e "Da chiarire" anche in modifica (plugin di decorazioni ProseMirror, senza
   toccare il Markdown salvato). Lampeggio a velo e riquadri tondi sono già in `master`. Con i
   riquadri in modifica andrebbe valutata anche l'evidenza dei punti risolti (0.25.0).
2. Plugin `asdp` in `dst-claude-skills`:
   - `main`: **asdp 0.17.0** e asdp-project 0.2.7 (versione solo nel frontespizio, nomi file senza
     `-vX.Y`, revisioni sullo stesso file, niente Change log nei template), unite da
     `feature/versione-frontespizio` (`b81ba4d`). Pushato con il tag `0.14.0` della marketplace il
     2026-11-27.
   - `feature/asdp-mcp`: lavoro sul server MCP (0.14.0–0.16.2) con `main` unito, **asdp 0.18.0**
     (`58cdf7b`); il merge futuro in `main` è pulito. Non pushato e **non va portato su `main`**
     finché `.mcp.json` punta al server di prova. Backup del commit prima della separazione:
     branch `backup/asdp-mcp-0.17`, da eliminare dopo la verifica.
   - Da provare: t1-4 via MCP su PSW (stesso percorso, `versione` +1, un solo documento in
     mappa). Nella sandbox GitLab resta `asdp/requirements/PFS-RequirementsConsolidated-v0.1.md`
     (`asdp-sandbox/sandbox-test`): da rinominare o cancellare a mano.
3. Riaccendere il cloud di test per la prova completa: migrazioni (vedi "Da fare sul cloud"),
   nuovo invito di prova, plugin da Claude Desktop (Cowork e chat), poi rispegnere.
4. Analisi GDPR per l'IT: è la condizione per aprire la parte Microsoft/Teams ad altri utenti e al
   cloud (punti in `TODO.md`, "File di progetto da Teams").
5. Roadmap funzionale (ordine deciso il 2026-11-25): ponte passo → Claude (prompt MCP per passo,
   pagina "Collega Claude"), risposta alle D[N] con un clic, approvazione assistita da AI/MCP,
   dashboard "Tocca a me". Dettagli in `docs/ARCHITETTURA.md` §7 e in `TODO.md`.

## Da provare

Funzioni committate ma non provate fino in fondo. Prove con file e Teams **sempre su PSW**
(Prova Setup Workspace), mai su PFS.

- **«Tocca a te»** (0.24.0): con un utente del seed che ha il ruolo del passo (es. TL su Portale
  Fornitori) la scheda «Prossimo passo» mostra il badge.
- **Ruoli diversi da admin**: cambio di fase come PM (0.20.0); pagina Progetti con `pm@`
  (0.13.0); creazione progetto vista da `pm@` e `tl@` (0.12.0); utente senza ruolo PM e link
  GitLab (0.9.0).
- **File Teams (PSW)**: eliminazione e spostamento di un file appena chiuso in Word per il web e
  link `action=view` (0.19.1); rinomina di un file che resta e filtro "Solo io" con un secondo
  utente nella vista Attività (0.19.0); selezione multipla con Sposta/Elimina (0.13.0);
  sostituzione con nuova versione e trascinamento reale di file (0.15.0); dialog "Pubblicato su
  Teams" e chip "Documento ASDP" nella scheda File (0.18.0); Ripubblica (0.19.3).
- **MCP Office (PSW, cartella `Prova MCP Office`)**: PowerPoint ed Excel, conflitto di etag, file
  reali con stili e sezioni (0.17.0–0.18.0). Word è provato.
- **MCP**: attività "con Claude" nella scheda Percorso (0.14.0); `get_project.setup` via MCP
  (0.12.0).
- **Creazione progetto**: "Crea su GitLab" dal wizard e canale Teams su un Team di test (0.12.0).
- **Accesso con Microsoft**: collegamento a un utente email già esistente con la stessa email; MCP
  locale dopo il cambio di `api.external_url`.
- **Desktop Extension di sviluppo** (`mcpb/`): installazione in Claude Desktop, login con un
  utente del seed, tool visibili (server del plugin disattivato).
- **Editor**: come appaiono i commenti HTML del corpo (in lettura sono nascosti).
- **Consolidamento (0.22.3)**: conferma del salvataggio non a blocchi; pagina «Qualcosa non ha
  funzionato» con GitLab irraggiungibile. Provati su PSW il 2026-11-27: YAML rotto (Reindicizza,
  pagina con avviso, MCP `read_document`) e rifiuto MCP senza frontespizio o con YAML rotto.
- **pgTAP**: rilanciare dopo un `supabase db reset` (con i dati locali in più 7 test falliscono
  per i conteggi, non per le migrazioni).

## Da fare sul cloud (alla prossima riaccensione)

- **Migrazioni**: sul cloud ci sono solo le prime 5 (fino a `20261122000000_document_edit.sql`).
  Applicare tutte le successive con `pnpm exec supabase db push --remote`, poi "Reindicizza" su
  ogni progetto (serve per `documents.questions` e il numero GitLab delle repo). Tra queste
  `20261127170350_phase_back_admin_only.sql` (solo l'admin torna a una fase precedente).
- **Ultimo deploy**: controllare che sia `master` attuale (Vercel era in pausa durante alcuni
  push); se no, Redeploy.
- **Invito**: nuovo invito di prova; sbloccare `belluzzino@gmail.com` con "Reimposta password" o
  eliminarlo e reinvitarlo.
- **Accesso con Microsoft** (solo dopo avviso all'IT): redirect
  `https://uirrkpvkrhuvbobthrna.supabase.co/auth/v1/callback` in Entra, `config push` con
  `MICROSOFT_CLIENT_ID/SECRET` nell'env della shell; verificare se DST ha domini email oltre
  `dstech.it` (lista nell'hook `before_user_created`).
- **File Teams** (solo dopo l'analisi GDPR): URI di produzione nell'app registration
  (`REDIRECT_URI` oggi fisso su localhost in `src/lib/microsoft.ts`), variabili `MICROSOFT_*` su
  Vercel.
- **Altro**: `GITLAB_PROJECTS_GROUP` su Vercel e token di gruppo GitLab; PDF dell'export su Vercel
  (Chromium); regione delle funzioni `fra1` invece di `iad1`.

## Rischi e problemi aperti

- **Blocco dei file di Word per il web** (0.19.1): `Prefer: bypass-shared-lock` vale anche per
  eliminazione, spostamento e rinomina, quindi scavalca il blocco anche con il file aperto in
  Word, senza avviso (SharePoint invece avvisa). Proposta non ancora fatta: prima senza
  intestazione, sul 423 chiedere conferma e riprovare (`force` nell'MCP, dialog nell'app). Voce in
  `TODO.md`, "Codice da sistemare".
- **Tag mancanti**: le versioni `0.12.0`, `0.14.0`, `0.16.0`–`0.19.2` sono su `master` senza tag
  (e `0.21.0`, che non ha un commit suo). Da decidere se taggarle sui commit di rilascio.
- **Segreto dell'app `ASDP` in Entra**: scade 6 mesi dopo la creazione (fine maggio 2027); se il
  login Microsoft dà errore sul segreto, crearne uno nuovo.
- **Vercel**: un deploy è finito una volta `BLOCKED` ("Vercel Account Unavailable"), poi è passato.
  Se ricapita: collegare l'account GitHub all'account Vercel `lbelli-3732`.
- **Claude Desktop in locale**: il pannello Server MCP ottiene l'URL di login ma non apre il
  browser (server OAuth su `http://`). Per Desktop usare il cloud o la Desktop Extension.
- **Dev server**: se sulla 4100 resta un `node.exe` appeso, chiuderlo prima di `pnpm dev`.

## Residui delle prove da pulire

- Sandbox GitLab (`asdp-sandbox/sandbox-test`): `asdp/requirements/PFS-RequirementsConsolidated-v0.1.md`
  (P1.3 di prova, commit `49bc8bc`); commenti GUIDA-FRONT tolti da
  `asdp/risks/T3.1-RISK_REGISTER.md` dal commit `3b4ecf38`, da ripristinare se servono; T2.2 e
  T3.1 lasciati In corso.
- GitLab: gruppo di test `asdp-sandbox/psw` creato nelle prove di 0.12.0.
- PSW su SharePoint: `Governance/Agenda Kickoff 12-01-2027.docx` nel cestino del sito; il file di
  prova di Word ha revisioni da accettare o rifiutare.

## Decisioni prese

- **Documenti ASDP solo su GitLab** (2026-11-27): SharePoint come fonte è escluso (GDPR, RLS,
  evidenza). Gli approvati si esportano e si pubblicano su Teams (0.16.0).
- **Claude solo con il plugin** (2026-11-25): PM e AF lavorano in Claude Desktop (Cowork o chat)
  con il plugin `asdp`, che porta skill, template e connettore; claude.ai senza plugin non si usa.
- **File Teams come input delle skill solo dal connettore ASDP** (2026-11-26), non dal connettore
  M365 di Claude.
- **Microsoft/Teams solo per Lorenzo in locale** finché l'IT non vede l'analisi GDPR (consenso
  amministratore del 2026-11-26). Riservati in Supabase Storage, mai su SharePoint.
- **Niente gestore di file su GitLab** per Word ed Excel; niente app Electron per ora (`TODO.md`).
- **D[N]**: quattro stati come la skill P1.3 (aperta, rimandata, da applicare, da correggere);
  risposta con un clic e "punti di attenzione" generici da valutare dopo la prova.
- **Fase del progetto**: avanti con conferma; indietro solo l'admin (trigger nel DB, per
  estenderlo ad altri ruoli basta cambiare la condizione).
- **Frontespizio**: i campi "array" restano testo separato da virgole, senza chip.

## Milestone

Tabella completa in `docs/ARCHITETTURA.md` §7.

| # | Stato |
|---|---|
| 0, 1, 2a, 2b, 2c | Fatte |
| 2d — server MCP | Quasi fatta: tool di lettura, scrittura, file Teams e Office; skill del plugin che salvano dall'MCP (branch `feature/asdp-mcp`). Manca la verifica da Cowork e chat di Claude Desktop sul cloud |
| 2e — Guida nell'app | Fatta (0.3.0); manca la rilettura dei testi da parte del team |
| 2f — ponte passo → Claude | In parte: "Copia prompt", `next_step` in `get_project`. Mancano prompt MCP per passo e pagina "Collega Claude" |
| 3 — gate e approvazioni | Flusso manuale e coda `/approvazioni` fatti; mancano AI/MCP ed evidenza in Storage |
| 3b | Fase modificabile fatta (0.20.0); dashboard "Tocca a me" e profilo progetto da fare |
| 5 | D[N] evidenziate e con stati (0.21.0); risposta con un clic da fare |
| 6 | Esporta e Pubblica su Teams fatti (0.16.0); login Microsoft fatto in locale |
| 7 — file Teams | 7a, 7b, 7c fatti (tool MCP dei file e Office), solo per Lorenzo in locale |

## Ambienti

| Ambiente | Dettagli |
|---|---|
| Locale | `pnpm dev` (127.0.0.1:4100; `localhost` viene rimandato a 127.0.0.1 da `src/proxy.ts`, così i cookie di sessione non finiscono su `localhost` e Kong su `localhost:54321` non risponde 400 "Bad request" all'accesso Microsoft); Supabase locale con Docker (`pnpm exec supabase start`), Mailpit su 54324; utenti di test del seed (`admin@`, `pm@`, `tl@`, `af@`, `nessuno@asdp.test`, password in `supabase/seed.sql`). `admin@asdp.test` ha collegato l'account Microsoft di Lorenzo. Config Microsoft: `api.external_url = http://localhost:54321`, id e segreto in `supabase/.env` (gitignorato) |
| MCP locale | Server "ASDP Workspace (sviluppo)" in Claude Code Desktop; `asdp` registrato in Claude Code per questa cartella (scope local). Dopo nuovi tool il client va ricollegato |
| Cloud di test | Vercel `ds-tech4/asdp-workspace` (deploy automatico da `master`, anteprime spente), Supabase `uirrkpvkrhuvbobthrna` (eu-central-2). **In pausa dal 2026-11-20**. MCP cloud registrato come `asdp-cloud` (scope user) |
| GitLab | https://git.dstech.info, sandbox `asdp-sandbox/sandbox-test` (id 946, branch `main`), gruppo padre dei progetti creati dall'app `asdp-sandbox` (`GITLAB_PROJECTS_GROUP`). Token in `GITLAB_TOKEN` (`.env.local`, mai in chat) |
| Microsoft | App registration `ASDP` (tenant DST), redirect `http://localhost:4100/api/microsoft/callback` e `http://localhost:54321/auth/v1/callback`; variabili `MICROSOFT_*` solo in `.env.local` |
| Progetti di prova | PSW (Prova Setup Workspace, locale, con canale Teams di test): per Teams, SharePoint e file MCP. PFS (Portale Fornitori): Team reale con colleghi, solo lettura |

## Come riaccendere il cloud di test

Stato attuale: **spento** (in pausa dal 2026-11-20). L'URL risponde `503` e il DB non accetta
connessioni. Dati, configurazione Auth, variabili Vercel e webhook GitLab restano dove sono.

**Ordine**: prima Supabase (l'app senza DB non funziona), poi Vercel.

1. **Supabase** (`asdp workspace`, ref `uirrkpvkrhuvbobthrna`, organizzazione
   `iecnfhegsjtzgtffniyk`):
   - dashboard: https://supabase.com/dashboard/project/uirrkpvkrhuvbobthrna → **Restore
     project**;
   - oppure da un agente con l'MCP di Supabase: `restore_project` con `project_id`
     `uirrkpvkrhuvbobthrna`, poi `get_project` finché lo `status` è `ACTIVE_HEALTHY` (qualche
     minuto).
   - Piano free: un progetto in pausa si ripristina entro 90 giorni; dopo si possono solo
     scaricare i dati.
2. **Vercel** (team `ds-tech4`, progetto `asdp-workspace`, id `prj_EXSnu1hQSKrCZYYjcPpOLDo6GYZr`):
   - dashboard: https://vercel.com/ds-tech4/asdp-workspace → Settings → in fondo alla pagina
     generale, **Resume project** (o il banner "Project paused");
   - oppure da un agente con l'MCP di Vercel: `unpause_project` con `projectId`
     `prj_EXSnu1hQSKrCZYYjcPpOLDo6GYZr` e `teamId` `team_JrZrmmOJdQsgGH4Lg2vCfimm`.
   - Non serve un nuovo deploy: torna attivo l'ultimo deploy di produzione.
3. **Verifica**:
   - https://asdp-workspace.vercel.app/login si apre (non più `503`);
   - login con `l.belli@dstech.it` e apertura del progetto di prova `1234`;
   - MCP: in Claude Code `/mcp` → `asdp-cloud` connesso (se il token è scaduto, Authenticate di
     nuovo).
4. Finiti i test, **rispegnere**: `pause_project` su entrambi (Supabase: `project_id`
   `uirrkpvkrhuvbobthrna`; Vercel: stessi id del punto 2), o dalle dashboard (Supabase →
   Settings → General → Pause project; Vercel → Settings → Pause project). Aggiornare lo stato
   qui sopra.

Se nel frattempo ci sono migrazioni nuove: dopo il restore lanciare
`pnpm exec supabase db push --remote` (il CLI è già collegato al progetto) e, se è cambiato il
blocco `[remotes.test]` di `supabase/config.toml`, `pnpm exec supabase config push`. Il codice
nuovo arriva su Vercel con il merge su `master`.
