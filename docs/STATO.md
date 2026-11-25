# Stato del lavoro

> Diario operativo: dove siamo, cosa è in corso, cosa viene dopo. Va letto all'inizio di ogni
> sessione e aggiornato alla fine di ogni passo (anche a metà di un piano), così chi riprende in
> un'altra chat sa da dove ripartire.
> Architettura e milestone: `docs/ARCHITETTURA.md`. Cose da fare non pianificate: `TODO.md`.
> Rilasci: `CHANGELOG.md`.

**Ultimo aggiornamento**: 2026-11-25 — Lorenzo Belli con Claude Code

## Versione

- `0.1.0` (`package.json`, `CHANGELOG.md`), su `master` dal commit "Add app version and
  changelog". Tag git `0.1.0` su `master`: da fare dopo il merge.
- `0.2.0` (mappa del progetto e documento in vista unica) su `feature/vari-miglioramenti`: tag
  dopo il merge su `master`.

## Milestone

| # | Stato |
|---|---|
| 0, 1, 2a, 2b, 2c | Fatte |
| 2d — server MCP | Quasi fatta: login OAuth, tool `list_projects`, `get_project`, `list_documents`, `read_document`, `list_versions`, `update_document`. Mancano `create_document`, `.mcp.json` nel plugin `asdp`, verifica da Claude Desktop e claude.ai (dopo il deploy di prova) |
| 3 — gate e approvazioni | Da iniziare |

## In corso: deploy di prova su cloud

Ambiente **solo di test**: va spento (pausa) dopo le prove per non consumare risorse, e riacceso
quando serve. **Oggi è spento**: istruzioni in "Come riaccendere il cloud di test" più sotto.

- [x] Progetto Vercel `asdp-workspace` (team `ds-tech4`), deploy automatico da GitHub
  `Zzino440/asdp-workspace` branch `master`. URL: https://asdp-workspace.vercel.app (la protezione
  Vercel vale solo per le anteprime; la produzione è pubblica). Deploy di anteprima disattivati
  (`previewDeploymentsDisabled`, 2026-11-20): i push sugli altri branch non fanno build. Da
  rivedere quando si prepara la vera produzione.
- [x] Progetto Supabase `asdp workspace` (ref `uirrkpvkrhuvbobthrna`, eu-central-2), creato
  dall'integrazione Vercel, che ha già messo su Vercel le variabili Supabase (solo Production).
- [x] CLI Supabase collegato (`supabase link --project-ref uirrkpvkrhuvbobthrna`).
- [x] Migrazioni applicate con `supabase db push --remote` (5, nessun seed). Verificato: 12 tipi
  di documento, 72 permessi, RLS su tutte le tabelle.
- [x] Impostazioni Auth con `supabase config push`, configurate nel blocco `[remotes.test]` di
  `supabase/config.toml`: Site URL, Redirect URL, registrazione chiusa, server OAuth con
  registrazione dinamica (discovery verificata). Il template di invito non si può cambiare sul
  piano free senza SMTP → `TODO.md`.
- [x] Primo amministratore: `l.belli@dstech.it`, creato dalla dashboard Supabase e reso admin
  (`update public.profiles set is_admin = true where email = ...`). Altri admin: da Amministratore
  → Utenti nell'app, oppure dal Table Editor (`profiles.is_admin`) o dal SQL Editor di Supabase.
- [x] Variabili GitLab su Vercel: `GITLAB_URL`, `GITLAB_WEBHOOK_SECRET` (Production; il secret
  del cloud è diverso da quello locale e va usato per il webhook della sandbox), `GITLAB_TOKEN`
  (inserito a mano da Lorenzo).
- [ ] **Invito utenti sul cloud** ← punto in cui siamo. Il link dell'email standard di Supabase
  rimandava al login con la sessione nel frammento `#access_token` (il server non lo vede) →
  "credenziali non valide". Corretto (non committato): pagina pubblica `/auth/invito` che apre la
  sessione dal frammento e porta a `/imposta-password`; l'invito usa `redirectTo` verso quella
  pagina. Committato su `bugfix/various`. Da fare: merge su `master` (nuovo deploy, che include
  anche `GITLAB_TOKEN`), nuovo invito di prova.
- [x] Progetto di prova nell'app (repo documenti `l.belli/sandbox-test`), Reindicizza.
- [x] **Webhook GitLab automatico**, provato il 2026-11-20: chiamata con secret giusto → 200
  `{"indexed":1}`, sbagliato → 401; commit diretto sulla sandbox (`2a20c422`) indicizzato dal
  webhook in circa un secondo. Sulla sandbox restano due commit di prova (`ce286c53`,
  `2a20c422`) che si annullano a vicenda. Lo crea l'app alla creazione del
  progetto e a ogni "Reindicizza" (`ensureProjectWebhook` in `src/lib/documents/`), verso
  `https://$VERCEL_PROJECT_PRODUCTION_URL/api/gitlab/webhook` con `GITLAB_WEBHOOK_SECRET`.
  Il token della sandbox è un project access token Maintainer (ok). Deployato; con "Reindicizza"
  l'app ha creato il webhook sulla sandbox (verificato su GitLab, 2026-11-20).
- [ ] **Prova completa** ← punto in cui siamo. Fatti (2026-11-20): login, progetto, documenti,
  webhook; MCP dal cloud configurato e funzionante da Claude Code da terminale e da Claude
  Desktop (tab Code), registrato come `asdp-cloud` (scope user:
  `claude mcp add --scope user --transport http asdp-cloud https://asdp-workspace.vercel.app/api/mcp`).
  Provato anche il connettore personalizzato su claude.ai.
- [ ] `.mcp.json` nel plugin `asdp` (repo `dst-claude-skills`): preparato sul branch
  `feature/asdp-mcp`, commit `8c2c3b6` (non pushato). Server `asdp-workspace` verso l'URL di prova, `asdp`
  0.14.0, README e CHANGELOG del plugin, `claude plugin validate` ok. **Non portarlo su `main`**
  finché l'URL è quello del server di prova (verrà spento): aggiornare l'URL quando ci sarà la
  produzione vera. Per provarlo prima: installare il plugin dal branch (o caricarlo in locale) e
  togliere `asdp-cloud` per non avere i tool doppi.
- [x] Spento dopo i test (2026-11-20): progetto Supabase e progetto Vercel in pausa. Per
  riaccenderlo vedi "Come riaccendere il cloud di test" qui sotto.

### Come riaccendere il cloud di test

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

## Blocco 1 (intuitività per PM/AF): mappa del percorso

- [x] Pagina progetto come mappa per fasi 0–4 (2026-11-25, branch `claude/jolly-cerf-704e2e`):
  catalogo dei tipi con skill × indice documenti, "Da creare" con la skill, tipi per-feature
  raggruppati per Feature (`F\d+` nel percorso), "Prossimo passo" (primo tipo per `sort_order`
  non Completo/Approvato), filtro lato client, "Reindicizza" nel menu `⋯`. Verificata in locale
  con `pm@asdp.test`. Aggiunto `src/components/ui/dropdown-menu.tsx` (shadcn). Non mergiata.
- [x] Seconda versione, più semplice (2026-11-25, feedback di Lorenzo: "poco chiara"): barra delle
  5 fasi cliccabili con nome (Guida §6–§10) e "x di y pronti", sotto una fase alla volta;
  prossimo passo in linguaggio semplice con "Apri documento"; niente percorsi e codici in vista;
  la ricerca mostra i risultati di tutte le fasi; "Altri file" chiuso in fondo.
  con `pm@asdp.test`. Aggiunto `src/components/ui/dropdown-menu.tsx` (shadcn). Su `feature/vari-miglioramenti`
  (commit `4420644`).
- [x] Documento in vista unica (2026-11-25, branch `feature/vari-miglioramenti`, non
  committato). Lettura, modifica e versioni stanno sulla stessa pagina (`documenti/[...path]`);
  le route `modifica/` e `versioni/` sono state eliminate.
  - Editor visuale Milkdown (`documenti/milkdown-editor.tsx`).
  - Salvataggio a blocchi (`src/lib/markdown-splice.ts`): i blocchi non toccati restano identici
    al sorgente. Lo spike ha dato 24/24 identici al byte su template e output reali.
  - Frontespizio nel pannello laterale, con etichette in `FRONT_MATTER_LABELS`.
  - Bozza in `localStorage` per uscite e conflitti.
  - Versione `0.2.0` con voce in `CHANGELOG.md`.
  - Verificato in locale con `pm@asdp.test`: sulla sandbox ci sono due commit di prova che si
    annullano a vicenda (25/11, 20:56 e 20:57).
  - Da provare: un conflitto reale (commit su GitLab mentre si modifica).
- Da decidere (Lorenzo): i campi "array" del frontespizio restano testo separato da virgole,
  senza chip (scelta per tenere il codice semplice).
- Da sistemare in `src/lib/documents/` (sessione del documento): `detectType` non riconosce i
  file `T4.3-F{nn}-US{nn}.md` (non iniziano con `T4.3-part`, cartella condivisa da 3 tipi) se
  il frontespizio non ha `template_origine: T4.3-part`: finiscono in "Altri file".

## Dopo

1. `create_document` (decidere da dove prendere i template: plugin `asdp` o repo
   `dst-claude-skills`).
2. Milestone 3: gate e approvazioni (`submit_for_approval` via MCP).
3. Voci di `TODO.md`.

## Ambienti

| Ambiente | Dettagli |
|---|---|
| Locale | `pnpm dev -p 4100 -H 127.0.0.1`; Supabase locale con Docker (`pnpm exec supabase start`), Mailpit su 54324; utenti di test del seed (`admin@`, `pm@`, `tl@`, `af@`, `nessuno@asdp.test`, password in `supabase/seed.sql`). MCP locale: `asdp` registrato in Claude Code solo per questa cartella (scope local) |
| Cloud di test | Vercel `ds-tech4/asdp-workspace`, Supabase `uirrkpvkrhuvbobthrna`. **In pausa dal 2026-11-20**: per riaccenderlo vedi "Come riaccendere il cloud di test" |
| GitLab | Istanza https://git.dstech.info, repo di prova `l.belli/sandbox-test` (id 946, branch `main`), documenti sotto `asdp/`. Token del service account in `GITLAB_TOKEN` (`.env.local`, mai in chat) |

## Note e problemi aperti

- Un deploy da push del commit `5e45134` è finito `BLOCKED` ("Vercel Account Unavailable");
  5 minuti dopo un nuovo deploy git dello stesso commit è passato. Causa non chiarita. Se un push
  viene di nuovo bloccato: collegare l'account GitHub all'account Vercel `lbelli-3732`
  (Account Settings → Authentication).
- Le funzioni Vercel girano in `iad1` (USA) e il DB è in `eu-central-2` (Zurigo): ogni richiesta
  fa avanti e indietro sull'Atlantico. Valutare la regione `fra1`.

- Claude Desktop (pannello Server MCP del tab Code) in locale ottiene l'URL di login ma non apre
  il browser (server OAuth su `http://`). Sul cloud (`https`) funziona: per provare Desktop usare
  il cloud.
- Sulla sandbox il commit `3b4ecf38` (prova MCP prima della correzione di `read_document`) ha tolto
  i commenti GUIDA-FRONT dal frontespizio di `asdp/risks/T3.1-RISK_REGISTER.md`: da ripristinare
  se serve.
- Invito sul cloud: con il template standard di Supabase il link porta la sessione nel frammento
  `#access_token=…`, che il server non vede (si finiva sul login con "credenziali non valide").
  Corretto con la pagina `/auth/invito` (legge il frammento, apre la sessione, manda a imposta
  password) e `redirectTo` nell'invito. Aggiunti in Amministratore → Utenti "Reinvia invito"
  (utente non confermato) / "Reimposta password" (confermato) ed "Elimina". Provati in locale
  (2026-11-20). Da pubblicare; poi sbloccare `belluzzino@gmail.com` (confermato senza accesso)
  con "Reimposta password", o eliminarlo e reinvitarlo.
- Correzione invito e gestione utenti committate su `bugfix/various` (`7d8dbce`, `f793b45`): da
  portare su `master` per il deploy.
- Sulla porta 4100 è rimasto un `node.exe` appeso (vecchio dev server): chiuderlo prima di
  riavviare `pnpm dev`.
