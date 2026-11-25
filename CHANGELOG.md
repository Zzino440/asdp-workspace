# CHANGELOG — ASDP Workspace

> Registro delle modifiche all'app, in ordine cronologico inverso.
> Aggiungere una entry in cima a ogni rilascio, insieme all'incremento di `version` in
> `package.json`. Regole di versionamento in `AGENTS.md` ("Versions and changelog").

## Formato entry

```markdown
## [X.Y.Z] YYYY-MM-DD — titolo breve

**Autore**: [nome]

### Cosa è cambiato
- Descrizione sintetica, per area (UI, MCP, database, …)

### Migrazioni e configurazione
- Nuove migrazioni Supabase, variabili d'ambiente, impostazioni da fare a mano (o "Nessuna")

### Test eseguiti
- Cosa è stato verificato ed esito
```

---

## Storia

## [0.6.0] 2026-11-25 — Flusso di approvazione manuale

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **UI**: nella pagina del documento, accanto a **Tutti i dettagli**, i pulsanti del flusso di
  approvazione. Completo vale come "in approvazione".
  - **Segna come completo** (chi ha Modifica, da Da fare o In corso; valorizza `completato_il`).
  - **Approva** (chi ha Approva, da Completo): finestra con il gate del tipo di documento e la sua
    checklist obbligatoria; scrive `stato`, `approvato_da` (nome e ruolo), `approvato_il`,
    `versione_approvata`, `gate` ed `evidenza_approvazione` (di default `commit <id>`; per T1.4
    obbligatoria e scritta, è l'approvazione del PO cliente). Il commit elenca le voci spuntate.
  - **Richiedi modifiche** (da Completo) e **Revoca approvazione** (da Approvato): stato In corso,
    motivo obbligatorio nel messaggio di commit; la revoca svuota i dati di approvazione.
  - Sotto il titolo, per un documento Completo, "In attesa di" e l'approvatore.
  - Nell'editor di un documento Approvato, avviso che salvando torna In corso.
- **Documenti**: `saveDocument` applica la regola GUIDA-FRONT: se il testo di un documento
  Approvato cambia, il salvataggio lo riporta In corso e svuota i dati di approvazione (app e MCP,
  istruzioni MCP aggiornate). Nuovo `changeApproval` nel service layer; gate e checklist in
  `src/lib/gates.ts`; scrittura del frontespizio che conserva i commenti in
  `src/lib/front-matter.ts`, condivisa con «Tutti i dettagli».
- **Fix**: compilando un campo vuoto con commento (es. `gate:   # ...`) il valore non resta più
  attaccato al `#`.
- **Guida**: Gate, Stati e frontespizio, Come usare l'app aggiornate. Componente Textarea di
  shadcn aggiunto (non descritto in DESIGN.md).

### Migrazioni e configurazione
- Nessuna

### Test eseguiti
- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`: ok.
- In locale sulla sandbox GitLab, come `tl@asdp.test` su T2.2: revoca → segna come completo →
  approva (pulsante disabilitato finché la checklist non è completa) → modifica del testo
  (torna In corso, dati di approvazione svuotati) → richiedi modifiche. Frontespizio e messaggi
  di commit controllati su GitLab. Come `pm@asdp.test` (solo lettura su T2.2) nessun pulsante.
- Non provati: MCP `update_document` su un Approvato, evidenza obbligatoria di T1.4.

## [0.5.0] 2026-11-25 — Approvazione da «Tutti i dettagli»

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **UI**: in **Tutti i dettagli** chi ha il permesso Approva sul tipo di documento può scegliere
  lo stato **Approvato** e compilare Approvato da, Approvato il (con selettore data), Versione
  approvata ed Evidenza approvazione; può anche cambiare lo stato di un documento già Approvato.
  Per chi ha solo Modifica non cambia nulla: quei campi restano in sola lettura. Il controllo
  lato server (`saveDocument`) c'era già.
- **Guida**: pagine Stati e frontespizio, Gate e Come usare l'app allineate.

### Migrazioni e configurazione
- Nessuna

### Test eseguiti
- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`: ok.
- Prova nel browser con utenti approvatore e non approvatore: non fatta.

## [0.4.1] 2026-11-25 — Caselle spuntabili nell'editor visuale

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **UI**: in **Modifica testo** le voci `- [ ]` / `- [x]` (le opzioni delle domande D[N])
  mostrano una casella che si spunta con un clic, come in Notion o Typora. Invio su una voce con
  casella ne crea un'altra; Annulla annulla anche la spunta. Gli altri elenchi non cambiano.
  La casella ha lo stesso aspetto del Checkbox dell'app (bordo, sfondo e spunta con i token).
- **UI**: al salvataggio la riga `Altro: ___________` non diventa più `Altro: \_\_\_…`.
- **UI**: "In questa pagina" (documenti e Guida) evidenzia la sezione come nelle documentazioni:
  l'ultimo titolo salito sopra una linea sotto l'intestazione; negli ultimi pixel di scorrimento
  la linea scende fino al fondo dello schermo, così anche gli ultimi titoli si accendono uno alla
  volta, in ordine. Un clic su una voce la evidenzia finché non si scorre di nuovo. Prima a fine
  pagina restava ferma su una sezione precedente, perché gli ultimi titoli non arrivavano mai
  nella fascia in alto.
- **UI**: la barra laterale dell'app resta ferma mentre si scorre la pagina (prima scorreva via
  con il contenuto). In Modifica testo la barra dei pulsanti resta ancorata sotto l'intestazione
  del documento (prima la card con `overflow-hidden` la portava via).
- **Guida**: Rispondere alle domande D[N] dice che la casella si spunta anche da Modifica testo.
  PATCH: toglie un limite dichiarato nella Guida, senza nuove API.

### Migrazioni e configurazione
- Nessuna.

### Test eseguiti
- `tsc`, lint, build.
- In locale sulla T1.4 della sandbox (senza salvare): caselle visibili, spunta e Annulla, nella
  bozza solo la riga spuntata passa a `- [x]` e la lunghezza del testo resta uguale, `___` non
  viene più scappato, Invio crea una nuova casella, gli elenchi puntati restano uguali.
- Indice sull'Architettura della sandbox: scorrendo dall'alto al fondo a passi di 10–30 px le
  sezioni si accendono tutte in ordine (1 → 9, ADR-001 compreso); il clic su "8. Rischi tecnici"
  la evidenzia anche a fine pagina, la rotella torna a seguire lo scorrimento.
- A fine pagina la barra laterale dell'app resta visibile; in Modifica testo la barra dei
  pulsanti resta a filo sotto l'intestazione mentre si scorre.

## [0.4.0] 2026-11-25 — Creazione dei documenti dal connettore

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **MCP**: nuovo tool `create_document` (progetto, percorso, testo, messaggio facoltativo). Crea
  il file nella repo documenti con un commit a nome dell'utente (`Via: mcp`) e lo aggiunge
  subito all'indice. Il tipo si ricava come nell'indice (nome file, `template_origine`,
  cartella); serve il permesso di modifica su quel tipo. Rifiuta percorsi fuori da `docs_root` o
  non `.md`/`.csv`, tipi non riconosciuti, file già esistenti (rimanda a `update_document`) e,
  per chi non approva, documenti già Approvati o con i campi di approvazione pieni. I template
  restano nel plugin `asdp`.
- **MCP**: le istruzioni del server dicono di leggere e salvare di norma dal server quando una
  skill ASDP scrive un file `asdp/...`; su file locale solo se lo chiede l'utente o se la
  cartella è un clone della repo documenti (poi il push e l'indicizzazione).
- **Guida**: Collegare Claude descrive Claude Desktop (Cowork o chat) con il plugin `asdp`, che
  porta skill e connettore; Lanciare una skill e Aggiornare un documento dicono che con il
  connettore il documento, nuovo o esistente, di norma finisce nell'app, e che resta possibile
  lavorare sui file con il push e la reindicizzazione.

### Migrazioni e configurazione
- `20261125211201_document_create.sql`: chi ha il permesso di modifica su un tipo può inserire la
  riga d'indice di quel tipo (prima solo PM e admin). Da applicare sul cloud con
  `pnpm exec supabase db push --remote`.
- Va insieme al plugin `asdp` 0.15.0 (skill che salvano dal connettore).

### Test eseguiti
- `tsc`, lint, build; `supabase test db` (37 test, nuovo `document_create.test.sql`).
- In locale via MCP HTTP sulla sandbox: creazione da PM (commit "Crea …", in indice e in
  Cronologia), rifiuto per chi ha solo la lettura, per un non membro, per un percorso fuori,
  un tipo ignoto, un file esistente e, da TL con solo modifica su T0.1a, per un documento
  Approvato. File di prova poi rimossi dalla sandbox.
- Non provato: Cowork e chat di Claude Desktop con il plugin (serve il cloud di test).

## [0.3.0] 2026-11-26 — Guida al framework

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **Guida** (nuova voce della barra laterale, al posto di "Libreria framework"): 27 pagine in
  stile documentazione, con indice a sinistra, "In questa pagina" a destra e
  Precedente/Successivo. Sezioni: Inizia qui (cos'è ASDP, come si usa l'app, il percorso), le
  5 fasi, una pagina per ogni documento (con riquadro Fase, Chi scrive, Chi approva, Input,
  Skill, Output), Lavorare con Claude (collegare Claude, lanciare una skill, domande D[N],
  aggiornare un documento), Riferimento (ruoli, stati e frontespizio, gate, glossario). Dove la
  Guida del framework e le skill divergono, le pagine descrivono il funzionamento con le skill e
  lo segnalano in una nota.
- **Pagina progetto**: "Come si fa" accanto alla skill nel prossimo passo e nei documenti da
  creare; "Cosa si fa in questa fase" sopra l'elenco della fase.
- **Documento**: "Cos'è questo documento" nel percorso in alto.
- Roadmap "usare il framework al meglio" in `docs/STATO.md` e `docs/ARCHITETTURA.md`.

### Migrazioni e configurazione
- Nessuna. I testi sono in `src/content/guida/`, il registro delle pagine in `src/lib/guida.ts`.

### Test eseguiti
- `tsc --noEmit`, `lint`, `build` ok; le 27 pagine della guida sono prerenderizzate.
- Browser in locale: navigazione tra le pagine con l'indice "In questa pagina" aggiornato, link
  "Come si fa" dalla mappa del progetto PFS, link interni dei testi tutti verso pagine esistenti.

## [0.2.0] 2026-11-25 — Mappa del progetto e documento in vista unica

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **Pagina progetto**: in cima c'è la mappa del percorso ASDP per fasi 0–4. Mostra i documenti
  attesi, anche quelli ancora da creare (con la skill che li produce), lo stato e il prossimo
  passo. Si possono filtrare. "Reindicizza" ora sta nel menu `⋯`.
- **Documento**: lettura, modifica e versioni stanno nella stessa pagina. Le pagine separate
  "Modifica" e "Versioni" non ci sono più.
  - Editor visuale (Milkdown) con una barra essenziale.
  - Salvando si riscrivono solo i blocchi cambiati: le parti non toccate restano identiche nel
    commit, compresi commenti, tabelle e domande D[N].
  - Layout a tre colonne, come GitBook e Confluence:
    - a sinistra l'albero dei documenti del progetto per fase, con pallino di stato e i
      documenti ancora da creare in grigio;
    - al centro il testo;
    - a destra «In questa pagina», l'indice delle sezioni che evidenzia quella corrente.
  - Intestazione fissa con percorso (progetto › fase › tipo), titolo mostrato una volta sola e
    una riga con stato, versione, autore e ultimo aggiornamento.
  - Sotto il titolo, sempre visibili: stato, owner, scadenza (in rosso se scaduta) e
    approvazione.
  - «Tutti i dettagli» apre una finestra con il frontespizio completo, a schede per tema (stato e
    date, responsabilità, approvazione, identità, dati tecnici), etichette in italiano e campi data.
    Ha un «Salva» suo che cambia solo il frontespizio, senza entrare in modifica del testo. Un
    campo svuotato diventa `null`, come nei template.
  - Pannello «Cronologia» con le versioni; cliccandone una, il diff compare al posto del testo.
- **Modifiche non salvate**: indicatore e conferma prima di uscire dalla pagina. La bozza resta
  nel browser e si può riprendere. Se qualcuno ha salvato nel frattempo, si apre la versione
  nuova e a fianco compaiono le parti cambiate nella bozza, da riportare: le modifiche degli altri
  non vengono cancellate.
- Il messaggio di commit diventa una "nota sulla modifica" facoltativa.

### Migrazioni e configurazione
- Nessuna migrazione.
- Dipendenze aggiunte: `@milkdown/kit`, `unified`, `remark-parse`.
- Dipendenze tolte: `@uiw/react-codemirror`, `@codemirror/lang-markdown`.

### Test eseguiti
- Round-trip dell'editor su 24 documenti (template delle skill `asdp` e output reali delle
  skill):
  - senza modifiche, 24/24 identici al byte;
  - con una modifica, 24/24 con diff limitato al blocco toccato.
- In locale con `pm@asdp.test` sul progetto Portale Fornitori (sandbox GitLab):
  - mappa del progetto;
  - modifica e salvataggio del T1.4: diff di una riga, tabella intatta;
  - conferma all'uscita con modifiche;
  - bozza ripresa dopo l'uscita e salvata, con la sandbox riportata al testo di partenza;
  - conflitto con due schede: salvataggio rifiutato, bozza conservata, versione nuova con le
    proprie modifiche a fianco, quelle dell'altra scheda intatte;
  - finestra dei dettagli del T3.1: `gate` impostato e svuotato, diff di una riga ciascuno.
- `tsc --noEmit`, `eslint . --ignore-pattern ".claude/**"` e `pnpm build` ok. `pnpm lint` da
  solo fallisce perché analizza anche i worktree di Claude in `.claude/worktrees/`.

## [0.1.0] 2026-11-20 — Prima versione

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **Base**: login con Supabase Auth, area autenticata con barra laterale, tema scuro dal design
  system Stitch.
- **Amministrazione**: utenti su invito (email, imposta password, sospensione), progetti, team con
  ruoli ASDP, matrice ruoli e permessi per tipo di documento con ripristino dei default del
  framework.
- **Documenti da GitLab**: repo documenti e cartella per progetto, repo di codice collegate,
  indice dei documenti (webhook GitLab e bottone "Reindicizza"), elenco per fase con stato,
  vista del documento con frontespizio e Markdown.
- **Modifica**: editor sorgente (CodeMirror) con anteprima e frontespizio come form, commit a
  nome dell'utente con trailer `Via: app`, conflitti rilevati con `last_commit_id`.
- **Versioni**: storico di ogni documento con autore e canale (App, MCP, Git) e diff rispetto alla
  versione precedente.
- **Server MCP** (`/api/mcp`): login OAuth tramite Supabase Auth con pagina di consenso nell'app;
  tool `list_projects`, `get_project`, `list_documents`, `read_document`, `list_versions`,
  `update_document`, con gli stessi permessi della UI (RLS).
- **Regole**: solo chi ha "approve" può mettere o togliere lo stato Approvato e cambiare i campi
  di approvazione del frontespizio, da UI e da MCP.
- Versione dell'app mostrata nella barra laterale e comunicata ai client MCP.

### Migrazioni e configurazione
- Migrazioni `20261120000000_core` → `20261122000000_document_edit`.
- Variabili d'ambiente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `GITLAB_URL`, `GITLAB_TOKEN`, `GITLAB_WEBHOOK_SECRET`.
- Supabase: server OAuth attivo con registrazione dinamica dei client (`[auth.oauth_server]` in
  locale, dalla dashboard in cloud); template email di invito da copiare in cloud.

### Test eseguiti
- Test RLS pgTAP (amministrazione, documenti, modifica dell'indice).
- Verifica nel browser di amministrazione, documenti, editor, conflitti e versioni sulla sandbox
  GitLab `l.belli/sandbox-test`.
- MCP da Claude Code da terminale: login OAuth, lettura e salvataggio di documenti, rifiuti per
  permessi, campi di approvazione e conflitti. Esito soddisfacente.
- Limite noto: da Claude Code nell'app desktop il login all'MCP in locale non apre il browser;
  da verificare con un URL `https` (deploy di prova).
