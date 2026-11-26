# Stato del lavoro

> Diario operativo: dove siamo, cosa è in corso, cosa viene dopo. Va letto all'inizio di ogni
> sessione e aggiornato alla fine di ogni passo (anche a metà di un piano), così chi riprende in
> un'altra chat sa da dove ripartire.
> Architettura e milestone: `docs/ARCHITETTURA.md`. Cose da fare non pianificate: `TODO.md`.
> Rilasci: `CHANGELOG.md`.

**Ultimo aggiornamento**: 2026-11-26 — Lorenzo Belli con Claude Code

## Versione

- Fino a `0.11.0` tutto su `master` e su `origin/master` (2026-11-26), tag `0.1.0`–`0.11.0`
  pushati (`0.9.0` su `61b3cee`, `0.10.1` su `32f810c`, `0.11.0` su `4a06c52`). Nessun altro
  branch aperto; worktree `claude/jolly-cerf-704e2e` eliminato.
- Restano da provare: `0.9.0` con un utente senza ruolo PM e i link GitLab; le scritture di
  `0.11.0` (7b) su una cartella Teams di test.
- `0.11.1` (migrazione `20261126161428_security_definer_execute.sql`: `EXECUTE` tolto ad `anon`
  sugli helper della RLS e a tutti i ruoli API sui trigger) su `master` (`1777f5a`), 2026-11-26:
  pushata, tag `0.11.1` fatto; applicata in locale, test verdi; da applicare sul cloud.
- Sandbox: T2.2 rimasto In corso, T3.1 In corso (modifiche richieste) dopo le prove di 0.8.0.
- `0.12.0` (creazione guidata del progetto e scheda "Prepara l'area di lavoro", vedi CHANGELOG)
  sul branch `feature/git-mic-integration`, 2026-11-26. Comprende le repo per numero
  (`gitlab_project_id`, migrazione `20261126190851_gitlab_project_id.sql` applicata in locale, da
  applicare sul cloud) e la repo documenti modificabile. Dopo il commit `45ea896` (non ancora
  committata): pagina del progetto a schede Percorso · File · Impostazioni con colonna destra
  (route group `progetti/[id]/(schede)/`, dialog Modifica sostituito da Impostazioni › Generale).
  Il dev server sulla 4100 (avviato fuori dalla sessione) non vedeva le route spostate:
  riavviarlo. Typecheck, lint, build e pgTAP ok;
  creazione GitLab provata in locale con gruppo padre `asdp-sandbox` (`GITLAB_PROJECTS_GROUP` in
  `.env.local`), progetto di prova PSW → `asdp-sandbox/psw/{adsp,fe,be}`. Restano da provare:
  creazione del canale Teams su un **Team di test** (mai quello di PFS), la proposta dei membri, la vista
  con `pm@` e `tl@`, `get_project.setup` via MCP. La pagina `/file/collega` restava su
  "Caricamento…" (anche col codice di prima): riavviare il dev server sulla 4100 prima di
  riprovare. Per il cloud: `GITLAB_PROJECTS_GROUP` su Vercel e un token di gruppo (vedi
  `TODO.md`, "Token GitLab per i progetti veri").
- Branch `feature/mcp-miglioramenti-teams`, 2026-11-26 (non committato): "Reindicizza da GitLab"
  tolto dal menu ⋯ e reso pulsante sempre visibile nell'intestazione del progetto
  (`progetti/[id]/reindex-button.tsx`), guide aggiornate. Scheda File: ricerca mentre si digita
  (`progetti/[id]/file-search.tsx`, debounce 300 ms, minimo 2 caratteri, Invio subito, Esc
  svuota). Typecheck, lint, build ok; non provato nel browser.
- Stesso branch, 2026-11-26 (non committato): **Nuovo progetto a passi** (Progetto → Repository →
  Persone e Teams → Riepilogo, riepilogo dal vivo a destra da `lg`). Alla creazione si possono
  scegliere anche descrizione e date, repo FE/BE (nessuna, nuova o esistente), PM/TL e il Team
  per il canale. Migrazione `20261126211145_project_details.sql` (`description`, `start_date`,
  `end_date`), applicata in locale con `migration up` (niente reset, per tenere i dati locali);
  da applicare sul cloud. Descrizione e date si modificano in Impostazioni › Generale. Typecheck,
  lint e build ok. Provato in locale con admin: evolutiva con BE esistente e PM/TL, salvati
  correttamente (progetto di prova eliminato). Non provati: "Crea su GitLab" dal wizard (logica
  invariata, solo fe/be passati in modo nuovo) e il canale Teams (serve un Team di test).
  pgTAP: 7 test falliscono per i dati locali in più rispetto al seed (PSW e altri), non per la
  migrazione; da rilanciare dopo un `db reset`. Il guscio dell'app non è responsive (sidebar fissa
  da 240 px anche su mobile): voce in `TODO.md`.
- Branch `feature/miglioramenti-ui-ux`, 2026-11-26 (non committato): intestazione del progetto e
  schede sticky (`progetti/[id]/sticky-header.tsx`, altezza in `--project-header-h`; la colonna
  destra da `xl` si ancora sotto). Typecheck e lint ok, provato nel browser sulla 4100.
  Scheda File: tabella con altezza massima pari allo spazio sotto l'intestazione (minimo 16rem),
  scorre al suo interno con intestazione delle colonne fissa (`project-files.tsx`). CSS verificato
  nel browser; non provata con file reali (utente del browser senza account Microsoft).
  Scheda File: **selezione multipla** con checkbox (seleziona tutto, Maiuscolo+clic per un
  intervallo) e barra di gruppo al posto di Carica/Nuova cartella: Sposta ed Elimina su più
  elementi (`moveFiles`/`deleteFiles` in `progetti/file-actions.ts`, max 100, 4 alla volta, errori
  parziali riportati; nell'eliminazione un 404 conta come già eliminato). Funzione nuova → MINOR
  al rilascio. Typecheck, lint e build ok; **non provata end to end** (serve un utente con account
  Microsoft): provare su cartelle di prova di PSW.
  Ricerca file: Graph `search` è full-text (trovava tutto cercando "DST", nome del sito); ora
  `searchFolder` tiene solo i risultati col testo nel nome (fino a 200 letti, 50 mostrati).
  Typecheck e lint ok; non provata nel browser.
  **Pagina Progetti** come vista di portafoglio (2026-11-26, non committata, funzione nuova →
  MINOR): colonne Progetto (cliente · natura sotto), Stato, Fase con barra "pronti/attesi" della
  fase attuale, Attenzione (scaduti, in approvazione, manca PM/TL, Setup solo per admin/PM),
  Persone (PM e i miei ruoli), Fine (rossa se passata). Ricerca, filtro stato (default Attivi =
  non chiusi), "Solo i miei" (solo per chi vede progetti senza ruolo), ordinamento, riga
  cliccabile; filtri nell'URL. Letture in blocco con paginazione `.range()` (tetto `max_rows`
  1000). Calcolo dell'avanzamento estratto in `src/lib/phase-progress.ts`, usato anche dalla
  mappa. Tolta "ultima attività": `indexed_at` si riscrive a ogni Reindicizza. File:
  `progetti/page.tsx`, `progetti/projects-table.tsx`. Titolo e filtri sticky; tabella con
  altezza massima `max(16rem, 100dvh - 12rem)` e intestazione delle colonne fissa, come la
  scheda File (provato a 460 e 360 px di altezza). Typecheck, lint, build ok; provata nel
  browser con admin (filtri, ordinamento, ritorno indietro, x/y uguale alla mappa di PFS); non
  provata con `pm@`.

## Milestone

| # | Stato |
|---|---|
| 0, 1, 2a, 2b, 2c | Fatte |
| 2d — server MCP | Quasi fatta: login OAuth, tool `list_projects`, `get_project`, `list_documents`, `read_document`, `list_versions`, `update_document`, `create_document` (2026-11-25). Plugin `asdp` 0.15.0 con `.mcp.json` e skill che salvano dall'MCP sul branch `feature/asdp-mcp` (committato, non pushato). Manca la verifica da Cowork e chat di Claude Desktop sul cloud |
| 7 — file Teams/SharePoint | Sbloccata solo per Lorenzo in locale (consenso IT del 2026-11-26); per altri utenti o cloud serve prima l'analisi GDPR. 7a fatta in `0.10.0`; 7c (tool MCP dei file) in `0.12.0`, da provare su una cartella di test. Come riprendere: sezione "File di progetto da Teams/SharePoint" |
| 3 — gate e approvazioni | In corso: flusso manuale (0.6.0) e coda `/approvazioni` (0.7.0) fatti. Prossimi: approvazione assistita da AI/MCP, evidenza del cliente in Storage (vedi `TODO.md`) |

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
  "credenziali non valide". Corretto: pagina pubblica `/auth/invito` che apre la
  sessione dal frammento e porta a `/imposta-password`; l'invito usa `redirectTo` verso quella
  pagina. Su `master` (2026-11-26). Vercel era in pausa durante il push: dopo la riaccensione
  controllare che l'ultimo deploy sia `master` attuale, se no Redeploy. Da fare: nuovo invito di
  prova.
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

## Skill + connettore (2026-11-25)

**Decisione di Lorenzo**: claude.ai senza plugin non si usa. PM e AF lavorano in Claude Desktop
(Cowork o chat) con il plugin `asdp` installato dall'amministratore: skill, template e connettore
arrivano insieme dal plugin. Il problema vero era che le skill non sapevano del connettore e
salvavano su disco o in chat.

- [x] `create_document` (app `0.4.0`): `createFile` in `src/lib/gitlab.ts`, `createDocument` in
  `src/lib/documents/`, tool MCP, istruzioni del server; migrazione
  `20261125211201_document_create.sql` (insert dell'indice per chi ha "edit") e test pgTAP.
  Provato in locale via MCP HTTP sulla sandbox (vedi CHANGELOG); file di prova rimossi
  (commit "Rimuove file di prova di create_document" sulla sandbox). Committato su `master`.
  Migrazione da applicare sul cloud (`supabase db push --remote`) alla prossima riaccensione.
- [x] Plugin `asdp` 0.15.0 (repo `dst-claude-skills`, branch `feature/asdp-mcp`, committato,
  non pushato): sezione "Where to read and save" in tutte le 10 skill (con l'MCP di norma si legge e
  si salva dal server; su file se l'utente lo chiede o se la cartella è un clone della repo
  documenti, poi push e reindicizzazione; niente modalità che cancellano il file), README,
  CHANGELOG. `claude plugin validate --strict` ok.
- [x] Guida: Collegare Claude (Desktop + plugin, Code per TL), Lanciare una skill §5, Aggiornare
  un documento. Committato su `master`.
- [ ] **Da fare in futuro**: prova sul cloud riacceso (OAuth di Desktop vuole https). Plugin dal
  branch, togliere `asdp-cloud`; in Cowork e nella chat di Desktop un T4.1 nuovo (CSV + md) e un
  aggiornamento di T1.4; controllare commit a nome dell'utente, mappa, nessun file locale in
  Cowork. Verificare anche se la chat di Desktop carica il server del plugin (se no, la Guida già
  dice di aggiungere il connettore a mano). Poi rispegnere.

## Desktop Extension di sviluppo (2026-11-25)

- [x] `mcpb/`: pacchetto `.mcpb` come quello di Tarko, con dentro solo `mcp-remote` 0.16.7
  (ponte stdio → `<url>/api/mcp`, login OAuth con ritorno su localhost). Chiede l'indirizzo
  all'installazione (default locale `http://127.0.0.1:4100/api/mcp`). Serve a provare l'MCP in
  locale da Claude Desktop, dove il collegamento diretto su `http://` non apre il login. Non
  tocca app né plugin. `mcpb validate` ok, `pack` ok (`mcpb/asdp-workspace-dev.mcpb`, non
  committato come `node_modules`). `mcpb` escluso da `tsconfig`. **Non committato**.
- [ ] Prova di Lorenzo: installarlo in Claude Desktop, login con un utente del seed, tool
  visibili (con il server del plugin disattivato).

## Blocco 1 (intuitività per PM/AF): mappa del percorso

- [x] Pagina progetto come mappa per fasi 0–4 (2026-11-25, branch `claude/jolly-cerf-704e2e`):
  catalogo dei tipi con skill × indice documenti, "Da creare" con la skill, tipi per-feature
  raggruppati per Feature (`F\d+` nel percorso), "Prossimo passo" (primo tipo per `sort_order`
  non Completo/Approvato), filtro lato client, "Reindicizza" nel menu `⋯`. Verificata in locale
  con `pm@asdp.test`. Aggiunto `src/components/ui/dropdown-menu.tsx` (shadcn). Su
  `feature/vari-miglioramenti` (commit `4420644`).
- [x] Seconda versione, più semplice (2026-11-25, feedback di Lorenzo: "poco chiara"): barra delle
  5 fasi cliccabili con nome (Guida §6–§10) e "x di y pronti", sotto una fase alla volta;
  prossimo passo in linguaggio semplice con "Apri documento"; niente percorsi e codici in vista;
  la ricerca mostra i risultati di tutte le fasi; "Altri file" chiuso in fondo.
- [x] Prossimo passo dalla fase attuale del progetto (2026-11-25, decisione di Lorenzo): primo
  passo aperto da `current_phase` in poi; i passi aperti delle fasi precedenti sono contati in un
  avviso a parte. Documenti senza `stato` contano come non pronti.
- [x] Documento in vista unica (2026-11-25, branch `feature/vari-miglioramenti`, commit
  `868481c` e `11961da`; le ultime correzioni non sono ancora committate). Lettura, modifica e
  versioni stanno sulla stessa pagina (`documenti/[...path]`);
  le route `modifica/` e `versioni/` sono state eliminate.
  - Editor visuale Milkdown (`documenti/milkdown-editor.tsx`).
  - Salvataggio a blocchi (`src/lib/markdown-splice.ts`): i blocchi non toccati restano identici
    al sorgente. Lo spike ha dato 24/24 identici al byte su template e output reali.
  - Frontespizio nel pannello laterale, con etichette in `FRONT_MATTER_LABELS`.
  - Layout rivisto il 2026-11-25, scelte di Lorenzo. A sinistra l'albero per fase (solo da 1280 px);
    intestazione fissa con percorso, titolo e riga di stato. A destra «In questa pagina»
    (`document-outline.tsx`), che lascia il posto ai pannelli «Dettagli» (campi chiave + «Dati
    tecnici») e «Cronologia». `PHASES` è stato spostato in `src/lib/labels.ts`. Verificato a 1440 e
    1100 px (commit `c88a440`).
  - Frontespizio rivisto il 2026-11-25, scelte di Lorenzo (commit `34b5978`). Sotto il titolo, sempre
    visibili: Stato, Owner, Scadenza (in rosso se scaduta) e Approvazione. Il pannello «Dettagli»
    non c'è più: «Tutti i dettagli» apre una finestra larga (`document-details.tsx`) con i temi a
    schede a sinistra (in riga sul telefono), i campi del tema su 3 colonne, un pallino sui temi
    con modifiche e un «Salva» suo, che cambia solo il frontespizio (messaggio "Aggiorna i dettagli:
    …"). Mentre si modifica il testo la finestra è in sola lettura; «Modifica» diventa «Modifica
    testo». Un campo svuotato ora si scrive `null`, come nei template. Si modificano solo i campi
    già presenti nel frontespizio: una scadenza mancante non si può aggiungere. Verificato sul
    T3.1: `gate` G3 e ritorno a `null`, diff di una riga ciascuno; la sandbox è al testo di
    partenza.
  - Bozza in `localStorage` per uscite e conflitti.
  - Versione `0.2.0` con voce in `CHANGELOG.md`.
  - Bozza superata (qualcuno ha salvato nel frattempo): si apre la versione nuova e a fianco si
    mostrano solo i blocchi cambiati dall'utente (`changedBlocks`), da riportare a mano. Così
    non si cancellano le modifiche degli altri.
  - Serializzatore con `-` per elenchi e separatori (stile dei template ASDP). Un blocco
    modificato viene comunque riscritto per intero: escape di `[`, tabelle allineate.
  - Verificato in locale con `pm@asdp.test`, compreso il conflitto con due schede (25/11,
    21:04–21:05). La sandbox è tornata al testo di partenza, salvo l'elenco di F01 nel T1.4, che
    ora usa `*` invece di `-` (stesso significato).
  - Non verificato: come appaiono nell'editor i commenti HTML del corpo (in lettura sono
    nascosti, in modifica si vedono come testo).
- Da decidere (Lorenzo): i campi "array" del frontespizio restano testo separato da virgole,
  senza chip (scelta per tenere il codice semplice).
- Da sistemare in `src/lib/documents/` (sessione del documento): `detectType` non riconosce i
  file `T4.3-F{nn}-US{nn}.md` (non iniziano con `T4.3-part`, cartella condivisa da 3 tipi) se
  il frontespizio non ha `template_origine: T4.3-part`: finiscono in "Altri file".

## Dopo: roadmap "usare il framework al meglio"

Decisa con Lorenzo il 2026-11-25 dopo un'esplorazione di app, plugin `asdp` e Guida. Il problema:
l'app mostra dove si trova il progetto ma non spiega il framework e non accompagna nel fare il
passo (lanciare la skill, rispondere alle D[N], approvare). Le skill si lanciano con **Claude +
connettore MCP** dentro Claude Desktop o Claude Code con il plugin `asdp`; le skill in cloud
vengono dopo.

1. **Guida al framework nell'app** (`/guida`) — fatta il 2026-11-26, versione `0.3.0`, commit
   `3ad2fe8`. 27 pagine (testi in `src/content/guida/`, registro in `src/lib/guida.ts`), link
   "Come si fa" dalla mappa e "Cos'è questo documento" dal documento. Verificata in locale
   (build, navigazione, link). Da fare: rilettura dei testi da parte di Lorenzo/team; divergenze
   Guida ↔ plugin in `TODO.md`.
2. **Ponte passo → Claude**: "Copia prompt per Claude" fatto in 0.12.0 (Prossimo passo e righe da
   creare della mappa, `src/lib/prompts.ts`); `create_document` già fatto (i template li porta la
   skill del plugin, l'app non ne ha copie). Restano `skill_name`/`per_feature` in `get_project`, tool `next_step`, prompt MCP per passo, istruzioni del server con la mappa
   fasi → skill → documenti; pagina "Collega Claude".
3. **Domande aperte D[N]**: estrazione nell'indexer, vista unica di progetto, risposta con un
   clic (scrive la casella nel Markdown), prompt pronto per rilanciare la skill in aggiornamento.
4. **Gate e approvazioni** (milestone 3): invio con checklist del gate, Approva / Richiedi
   modifiche che scrive il blocco Approvazione, coda in "Approvazioni", `submit_for_approval` via
   MCP; un Approvato modificato torna In corso.
5. **Dashboard "Tocca a me"**: per persona, passi, D[N], approvazioni e scadenze che la riguardano.
6. **Profilo progetto** (Nuovo / Evolutiva / BugFix, MATRIX TipoProgetto × Fasi) e fase
   modificabile dal PM: la mappa marca i passi che il profilo salta.
7. **Skill in cloud** (milestone 4) per chi non usa Claude.
8. Fuori dall'app, da decidere col team: allineare Guida e plugin (RACI di T3.1/T4.1, chi
   definisce gli NFR, doppio significato di G1/G2/G3, gerarchia degli ID).
9. Voci di `TODO.md`.

## File di progetto da Teams/SharePoint (milestone 7, in sospeso)

Decisioni del 2026-11-26 (richiesta di Lorenzo: meno dispersione per PM, TL e AF):

- Non si costruisce un gestore di file su GitLab: per Word ed Excel Git non ha diff né merge e
  non permette di modificarli nel browser. GitLab resta per i soli documenti ASDP.
- Navigatore unico per progetto con due sorgenti: documenti ASDP (GitLab) e file di progetto
  dalla cartella del canale Teams del progetto (SharePoint, Microsoft Graph, account Microsoft
  dell'utente), aperti in Office per il web. Quasi tutti i progetti hanno già un Team o un canale.
- Riservati: restano in Supabase Storage (su SharePoint li leggerebbero Copilot e i connettori M365).
- Aperto: clienti esterni (guest).
- App registration `ASDP` su Entra (solo organizzazione DST) fatta da Lorenzo, con redirect
  `http://localhost:4100/api/microsoft/callback`, segreto e permessi; variabili `MICROSOFT_*`
  solo in `.env.local`.
- **Consenso**: il tenant non permette il consenso degli utenti. L'IT (richiesta a
  helpdesk@dstech.it con il responsabile in copia) ha dato il consenso amministratore il
  2026-11-26 e il collegamento funziona. **Condizione dell'IT**: va bene finché la usa solo
  Lorenzo in locale. Prima di aprirla ad altri utenti o al cloud l'IT vuole un'analisi di
  gestione e rischi GDPR (vedi "Come riprendere").
- Prova nascosta in `0.8.1` (branch `feature/microsoft-integration`): migrazione
  `20261125231607_microsoft_accounts.sql` (refresh token per utente, RLS solo la propria riga;
  applicata in locale) e test pgTAP; `src/lib/microsoft.ts` (OAuth con state e PKCE, Graph con
  `fetch`); route `/api/microsoft/login` e `/callback`; pagina `/file-microsoft` (Team →
  cartelle dei canali → file in Office web, sola lettura). Senza
  `MICROSOFT_CLIENT_ID` pagina e route rispondono 404, quindi sul cloud non si vede. Aprire
  l'app da `localhost`, non da `127.0.0.1`. Dal 2026-11-26 è nel menu come "File Microsoft"
  con etichetta WIP (solo se `MICROSOFT_CLIENT_ID` c'è); typecheck, lint e build ok, non
  provata nel browser (Docker spento), non committata.
- Scelte tecniche: refresh token in tabella (non in cookie) perché i cookie non si scrivono nei
  Server Components e perché MCP e skill (7c) non hanno il browser; nessun permesso
  applicativo; niente MSAL, solo `fetch`. Il codice chiede oggi solo `offline_access User.Read
  Team.ReadBasic.All Files.ReadWrite.All Sites.ReadWrite.All` (`SCOPES` in
  `src/lib/microsoft.ts`): gli altri permessi dell'elenco si aggiungono a `SCOPES` quando
  servono, senza nuovo consenso se l'IT li ha già approvati.

### Come riprendere

1. [x] **Chiedere il consenso all'IT** (fatto il 2026-11-26). Da dire: app `ASDP` in
   Entra → Registrazioni app, cliccare "Concedi consenso amministratore per Dst" in
   Autorizzazioni API; solo permessi delegati, ognuno vede solo i file a cui ha già accesso su
   SharePoint; nessun permesso applicativo. Alternativa più restrittiva se la chiedono:
   `Sites.Selected` delegato, concesso sito per sito (un'operazione dell'IT per ogni progetto).
2. [x] **Provare il collegamento** (funziona, 2026-11-26) in locale: `pnpm dev -p 4100 -H 127.0.0.1` (riavviare se il
   vecchio processo sulla 4100 resta su "Caricamento…"), aprire
   un progetto con una cartella collegata, "Collega account Microsoft" con l'account DST.
   Atteso: i file nella card e una riga in `microsoft_accounts` (la pagina `/file-microsoft`
   usata per la prima prova è stata tolta in `0.10.1`). Il segreto del client scade (6 mesi dalla creazione): se il login
   dà errore sul segreto, crearne uno nuovo in Certificati e segreti.
2b. [ ] **Analisi GDPR per l'IT** (condizione per altri utenti e cloud). Flussi: metadati dei
   file e token passano dall'app, il contenuto va da SharePoint a Office web; con 7c il
   contenuto va ad Anthropic (USA). Rischi: trasferimenti extra UE (Vercel in `iad1` → spostare
   in `fra1`; Anthropic: DPA, SCC/DPF, conservazione), contratti dei clienti (sub-responsabili e
   AI, specie PA), refresh token che dà accesso a tutti i file dell'utente (cifrarlo a riposo,
   revoca alla rimozione), minimizzazione (solo cartelle dei progetti collegati, nessuna copia),
   registro dei trattamenti, informativa, DPIA per 7c. Proposta: approvare ora 7a/7b senza AI,
   7c dopo la DPIA e la verifica dei contratti.
3. [x] **7a, sfoglia nel progetto** (`0.10.0`, 2026-11-26): tabella `project_file_locations`
   (più cartelle per progetto, con etichetta); card "File di progetto" in
   `progetti/[id]/project-files.tsx` (schede per cartella, percorso, ricerca, Scarica, Copia
   link, Apri in SharePoint); pagina `progetti/[id]/file/collega` (Team → canale → cartella,
   solo PM/admin); azioni in `progetti/file-actions.ts`; Graph in `src/lib/microsoft.ts`. Token
   con scope `.default` (l'IT ha approvato tutto l'elenco, compresi `Channel.ReadBasic.All`,
   `Channel.Create`, `TeamMember.Read.All`). La ricerca di SharePoint cerca in tutta la raccolta
   e non dà il percorso: `searchFolder` rilegge i primi 25 risultati e tiene solo quelli nella
   cartella. Verificata in locale con l'account DST (seed `admin@asdp.test`, progetto PFS).
   Pagina di prova `/file-microsoft` e voce WIP tolte in `0.10.1` (duplicavano Collega e
   mostravano tutti i Team, contro la minimizzazione); l'account si vede e si scollega in fondo
   alla card. Scollega cancella il token nell'app, non lo revoca su Microsoft (consenso da
   myapps.microsoft.com o dall'IT): scriverlo così nell'analisi GDPR.
4. [x] **7b** (`0.11.0`, 2026-11-26): carica (sessione di Graph, il browser manda i byte
   direttamente a SharePoint; nome già presente → copia rinominata), nuova cartella, rinomina,
   sposta (dialogo che naviga le sottocartelle), elimina (cestino del sito). Componenti in
   `progetti/[id]/file-manager.tsx`, azioni in `progetti/file-actions.ts` (ogni elemento
   controllato con `itemInFolder`: niente fuori dalla cartella collegata), Graph in
   `src/lib/microsoft.ts`. Permessi: li decide SharePoint. Provati nel browser solo i dialoghi;
   le scritture vanno provate su una cartella di test (la cartella collegata a PFS in locale è
   un Team reale con colleghi). Da valutare: sostituire un file con una nuova versione.
5. [~] **7c**: file Teams come input delle skill, **solo dal connettore ASDP** (decisione di
   Lorenzo del 2026-11-26: non si conta sul connettore M365 di Claude, gli utenti potrebbero non
   averlo). Fatto in `0.12.0`, non committato, solo per Lorenzo in locale (registrato solo con
   `MICROSOFT_CLIENT_ID`): tool MCP `list/search/read_project_file(s)`, `create_project_folder`,
   `upload_project_file`, `move/copy/delete_project_file` sopra `src/lib/project-files.ts`
   (account Microsoft dell'utente da `microsoft_accounts`, solo cartelle collegate, `..` rifiutato;
   PDF e Office letti come testo con `unpdf`, gli Office convertiti in PDF da SharePoint);
   `get_project.setup.teams_folders`; "Copia prompt" di T0.1a, T0.1, P1.3 indica le cartelle
   (`TEAMS_INPUTS` in `src/lib/prompts.ts`). Typecheck, lint e build ok; **non ancora provato**:
   serve una cartella di test (Team di test con file finti .docx, .pdf, .vtt) collegata a un
   progetto di prova, MCP locale. Mai sulla cartella reale di PFS. Resta nell'analisi GDPR (DPIA:
   il contenuto dei file va ad Anthropic) prima di aprirlo ad altri o al cloud.
5b. [ ] **Altre funzioni Teams lungo il flusso ASDP** (mappa del 2026-11-26, ordine consigliato):
   - tracciabilità: nel documento i link ai file Teams da cui è nato (verbali, trascrizioni);
     solo file di Lorenzo, si può fare ora, insieme a 7b;
   - avviso nel canale del progetto quando un documento va in approvazione o è approvato
     (`ChannelMessage.Send`, già concesso); lo vedono altri, anche ospiti del cliente: provarlo
     solo su un Team di test e metterlo nell'analisi GDPR;
   - D[N] per il cliente pubblicate nel canale, risposte raccolte lì (milestone 5); come sopra;
   - pubblica approvati nella cartella collegata (milestone 6); come sopra;
   - evidenza dell'approvazione del PO scelta da SharePoint: un link da solo è debole (il file
     cambia o sparisce), serve versione fissa del driveItem o copia in Storage; da decidere col
     team;
   - creazione del progetto: scegliere Team e canale e proporre il team dai membri del Team
     (`TeamMember.Read.All`, già concesso);
   - dashboard "Tocca a me": file modificati di recente nei miei progetti;
   - più avanti, con nuovi permessi e DPIA: trascrizioni dei meeting come input di P1.3, l'app
     come scheda nel canale Teams.
6. [ ] **Cloud**: URI di produzione `https://<app>/api/microsoft/callback` nell'app registration
   (oggi `REDIRECT_URI` è fisso su localhost in `src/lib/microsoft.ts`), variabili
   `MICROSOFT_*` su Vercel, `supabase db push --remote` per la migrazione.
7. [ ] Da decidere: clienti esterni (guest).

## Ambienti

| Ambiente | Dettagli |
|---|---|
| Locale | `pnpm dev -p 4100 -H 127.0.0.1`; Supabase locale con Docker (`pnpm exec supabase start`), Mailpit su 54324; utenti di test del seed (`admin@`, `pm@`, `tl@`, `af@`, `nessuno@asdp.test`, password in `supabase/seed.sql`). MCP locale: `asdp` registrato in Claude Code solo per questa cartella (scope local) |
| Cloud di test | Vercel `ds-tech4/asdp-workspace`, Supabase `uirrkpvkrhuvbobthrna`. **In pausa dal 2026-11-20**: per riaccenderlo vedi "Come riaccendere il cloud di test" |
| GitLab | Istanza https://git.dstech.info, repo di prova `asdp-sandbox/sandbox-test` (id 946, branch `main`; spostata da `l.belli/sandbox-test` il 2026-11-26, percorso e numero aggiornati nel DB locale; sul cloud di test, dopo `db push` della migrazione di 0.12.0, basta "Reindicizza": GitLab segue il percorso vecchio e l'app salva numero e percorso nuovo), documenti sotto `asdp/`. Token del service account in `GITLAB_TOKEN` (`.env.local`, mai in chat) |

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
  (2026-11-20). Su `master`; sul cloud riacceso sbloccare `belluzzino@gmail.com` (confermato
  senza accesso) con "Reimposta password", o eliminarlo e reinvitarlo.
- Sulla porta 4100 è rimasto un `node.exe` appeso (vecchio dev server): chiuderlo prima di
  riavviare `pnpm dev`.
