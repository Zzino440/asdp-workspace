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

## [0.22.3] 2026-11-27 — Consolidamento: errori gestiti, frontespizio robusto, test

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- Documenti: un frontespizio YAML non valido (es. chiave duplicata) o un file con BOM non
  bloccano più l'indice di tutto il progetto. Il file si indicizza senza frontespizio,
  «Reindicizza da GitLab» lo elenca, la pagina del documento mostra l'errore e non permette la
  modifica. Salvataggio e creazione rifiutano un YAML non valido.
- Documenti: rifiutato il salvataggio che toglie il frontespizio a un documento che lo aveva
  (es. testo troncato passato da Claude).
- Editor: se il testo non si può salvare solo nelle parti cambiate, si chiede conferma prima di
  salvarlo riscritto per intero (prima avveniva in silenzio).
- UI: pagine «Pagina non trovata» e «Qualcosa non ha funzionato» (con Riprova) in italiano al
  posto di quelle inglesi di Next; errore del layout principale gestito.
- GitLab: timeout di 30 s su ogni chiamata, così una pagina non resta in caricamento all'infinito.
- MCP: `read_document` aggiunge `front_matter_error` quando il YAML non è valido;
  `update_document` e `create_document` hanno i nuovi errori `invalid_front_matter` e
  `missing_front_matter`.
- Sviluppo: test unitari con Vitest (`pnpm test`) su salvataggio a blocchi, frontespizio, D[N] e
  gate; `splitFrontMatter` spostato in `src/lib/front-matter.ts`.

### Migrazioni e configurazione
- Nessuna. Nuova dipendenza di sviluppo `vitest`.

### Test eseguiti
- `pnpm test` (18 test), typecheck, lint e build; nel browser pagina 404 su un progetto
  inesistente e pagina documento di PSW che si apre come prima.

## [0.22.2] 2026-11-27 — Barra laterale: tolte le sottovoci di Progetti

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- UI, barra laterale: «Progetti» torna una voce semplice, evidenziata anche dentro un progetto.
  Tolte le sottovoci (progetti del team più quello aperto): la regola sembrava casuale e la
  lista, letta nel layout, restava vecchia fino al ricaricamento della pagina.

### Migrazioni e configurazione
- Nessuna.

### Test eseguiti
- Typecheck, lint e build; barra laterale controllata nel browser.

## [0.22.1] 2026-11-27 — Editor: elenchi e caselle come in lettura

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- UI, editor del documento: elenchi puntati e caselle delle domande hanno la stessa spaziatura
  della lettura (prima ogni voce aveva lo spazio di un paragrafo).

### Migrazioni e configurazione
- Nessuna.

### Test eseguiti
- Typecheck, lint e build.
- Browser in locale, PSW P1.3 in modifica: voce di elenco 42 px (lettura 40), casella 22 px
  (lettura 20, prima 47).

## [0.22.0] 2026-11-27 — Documento: indice sincronizzato e pannello riducibile

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- UI, documento: "In questa pagina" segue il testo mentre lo modifichi (titoli aggiunti, rinominati
  o tolti compaiono subito).
- UI, pannello a destra: si può ridurre a una colonnina di trattini (titoli e domande colorate per
  stato); passando sopra si apre il pannello completo sopra il testo, senza spostarlo. La scelta
  resta salvata nel browser. Tra 1024 e 1280 px la colonnina c'è sempre (prima l'indice spariva).
- Corretto: aprendo un documento dopo un altro l'indice poteva risultare vuoto o doppio, e salti e
  punto di lettura potevano usare il testo del documento precedente (Next lo tiene nascosto nella
  pagina).

### Migrazioni e configurazione
- Nessuna.

### Test eseguiti
- Typecheck, lint e build.
- Browser in locale, PSW P1.3: navigazione Kickoff → Requisiti (indice con 20 titoli, niente
  doppioni), pannello ridotto e aperto al passaggio del mouse sopra l'intestazione, salto da una
  voce e chiusura all'uscita del mouse, titolo aggiunto in modifica che compare nell'indice;
  1440 px e 1100 px.

## [0.21.2] 2026-11-27 — Documento: stesso punto tra lettura e modifica

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- UI, documento: passando da lettura a modifica (e ritorno con Annulla o Salva) il blocco in cima
  allo schermo resta nello stesso punto, anche sotto la barra dell'editor.
- UI, documento: doppio clic su un blocco del testo apre la modifica con il cursore in quel punto.
- UI, pannello a destra: domande e "In questa pagina" restano anche in modifica (il testo non
  cambia larghezza); il clic porta al titolo o alla domanda nell'editor, sotto la barra.

### Migrazioni e configurazione
- Nessuna.

### Test eseguiti
- Typecheck, lint e build.

## [0.21.1] 2026-11-27 — MCP: aggiornamento dei documenti sullo stesso file

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- MCP, istruzioni del server: quando una skill aggiorna un documento esistente lo salva sullo
  stesso file con `update_document` e porta `versione` da vX.Y a vX.Y+1, senza chiedere la
  modalità di salvataggio; `revision_save_mode` vale solo per il salvataggio locale. Allineato
  alle skill `p1-3` e `t1-4` del plugin `asdp` 0.16.2.

### Migrazioni e configurazione
- Nessuna.

### Test eseguiti
- Typecheck e lint.

## [0.21.0] 2026-11-27 — Domande D[N] evidenziate nel documento e nell'MCP

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- Domande D[N] con quattro stati, gli stessi della skill P1.3: Aperta (nessuna spunta),
  Rimandata all'analisi ("Da decidere in fase di analisi"), Risposta da applicare, Da correggere
  (più spunte o "Altro:" senza testo).
- UI, lettura del documento: ogni domanda D[N] è un riquadro colorato con il suo stato (giallo,
  grigio, blu, rosso) e le note "❓ Da chiarire" sono evidenziate e unite alla domanda che segue.
  Vale per ogni documento con D[N], anche nella guida.
- UI, intestazione del documento: riepilogo delle domande per stato, con link alla prima da
  correggere o aperta.
- UI, Percorso: conteggi e stato di ogni domanda con i quattro stati.
- UI, documento: l'etichetta "Risposta da applicare · copia prompt" copia la richiesta per Claude
  che applica le risposte, la stessa di "Applica N risposte" del Percorso.
- UI, pannello a destra: sezione "Domande" con lo stato di ognuna. Il clic porta alla domanda
  (con il suo "Da chiarire") appena sotto l'intestazione e la fa lampeggiare.
- MCP: `read_document` restituisce `questions`; ogni domanda ha `status` (aperta, rimandata,
  da_applicare, da_correggere) e, se da applicare, `answer` con l'opzione spuntata. Le istruzioni
  del server dicono cosa fare in ogni stato. `status` e `answer` compaiono anche in `get_project`
  e `list_documents`, per ogni documento dal suo prossimo salvataggio. `answered` resta com'era.

### Migrazioni e configurazione
- Nessuna.

### Test eseguiti
- Typecheck, lint e build.
- Browser in locale: Requisiti Consolidati di PFS e PSW (riquadri, contatore, pannello, salto e
  lampeggio a 800px e 1440px), Architettura di PFS senza D[N] invariata.
- Parser sui quattro stati (sei casi, compreso "Altro:" con e senza testo).
- MCP di sviluppo: `read_document` su PSW e PFS restituisce stato e risposta corretti.
- Browser: clic su "copia prompt" in D4 dei Requisiti di PSW, etichetta "Prompt copiato".

## [0.20.0] 2026-11-27 — Cambio di fase con conferma e ritorno indietro (admin)

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- UI, intestazione del progetto: "Passa alla Fase N" chiede conferma prima di cambiare fase.
- Nuovo "Torna alla Fase N-1" nell'intestazione, solo per l'admin, con conferma: nessun
  documento viene toccato, cambia solo la fase attuale e il prossimo passo.
- Percorso: quando un documento di una fase precedente non è più pronto (es. approvazione
  revocata), l'admin vede accanto all'avviso "Torna alla Fase X".
- Impostazioni › Generale: nella select "Fase corrente" le fasi precedenti sono disabilitate per
  chi non è admin.
- Database: il trigger `projects_phase_back` rifiuta il ritorno a una fase precedente a chi non è
  admin (prima lo poteva fare anche il PM dalle Impostazioni).

### Migrazioni e configurazione
- `20261127170350_phase_back_admin_only.sql` (da applicare sul cloud).

### Test eseguiti
- Typecheck, lint, build ok.
- pgTAP `project_phase.test.sql` ok (PM non torna indietro, PM va avanti, admin torna indietro).
  Gli altri test pgTAP falliscono sul DB locale per i dati in più rispetto al seed (conteggi),
  non per questa modifica.
- Browser (locale, PSW, admin): Fase 1 → "Torna alla Fase 0" con conferma; "Passa alla Fase 1"
  con Annulla (fase invariata) e conferma; avviso del Percorso con "Torna alla Fase 0" simulando
  nell'indice locale un documento di Fase 0 In corso (poi ripristinato). Non provato con un
  utente PM nel browser.

## [0.19.3] 2026-11-27 — Stessa intestazione in ogni stato del documento

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- UI, pagina del documento: Esporta e Teams in un solo menu (Scarica PDF/Word/Markdown; Su Teams:
  Apri il PDF/Word, Vedi nei File, Pubblica o Ripubblica su Teams). Un pallino sul pulsante dice
  se il documento è su Teams (verde) o se la copia va ripubblicata.
- "Su Teams" esce dalla riga dei dati: l'intestazione ha la stessa forma In corso, Completo e
  Approvato (Cronologia · Esporta · passo del flusso · Modifica testo).

### Migrazioni e configurazione
- Nessuna

### Test eseguiti
- Typecheck, lint, build ok.
- Browser (locale, PSW, admin): Kickoff Pack Approvato e pubblicato (menu con sezione Teams,
  finestra Ripubblica aperta e annullata) e Verbale In corso con la stessa intestazione.

## [0.19.2] 2026-11-27 — Intestazione del documento più ordinata

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- UI, pagina del documento: titolo e azioni sulla stessa riga (con un titolo lungo va a capo il
  titolo, non i pulsanti); tutte le azioni in un solo gruppo (Cronologia, Esporta, Segna come
  completo / Richiedi modifiche / Approva / Revoca, Pubblica su Teams, Modifica testo);
  stato, owner, scadenza, approvazione, versione e "Tutti i dettagli" su righe compatte.
  L'intestazione fissa è più bassa.
- Il titolo non si ripete nel testo quando il titolo del frontespizio aggiunge un suffisso al
  primo titolo del testo (es. "(TEST)").
- "Cos'è questo documento" nel percorso è un link discreto con icona.

### Migrazioni e configurazione
- Nessuna

### Test eseguiti
- Typecheck, lint, build ok.
- Browser (locale, PSW T0.1 Verbale Kickoff, utenti admin e PM): intestazione a 1600px e 768px
  senza sbordi, intestazione fissa scorrendo, indice delle sezioni ok, titolo non ripetuto.

## [0.19.1] 2026-11-27 — File bloccati da Office per il web

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- **File Teams, scritture**: dopo che un file è stato aperto in Word/Excel/PowerPoint per il web,
  SharePoint lo teneva bloccato per minuti anche dopo la chiusura e ogni scrittura (edit_*,
  caricamento, eliminazione, spostamento, rinomina) riceveva 423. Ora le richieste a Graph
  mandano `Prefer: bypass-shared-lock`, come fa l'interfaccia di SharePoint: il blocco rimasto
  dopo la chiusura non ferma più le scritture; un file ancora aperto in modifica resta rifiutato.
- **MCP**: `web_url` dei file apre in sola lettura (`action=view`), così guardare un file non lo
  blocca; il messaggio del file bloccato dice di chiuderlo e che gli altri tool non aggirano il
  blocco.
- **Scheda File**: messaggio del file bloccato più chiaro.

### Migrazioni e configurazione
- Nessuna.

### Test eseguiti
- Su PSW con `edit_word_file`: file aperto in Word per il web → 423; subito dopo la chiusura →
  salvato. Senza l'intestazione il blocco era rimasto oltre 10 minuti dopo la chiusura (non
  ripetuto come prova di controllo).
- Typecheck, lint, build.

## [0.19.0] 2026-11-27 — Novità e attività nella scheda File

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- **Scheda File, novità**: pallino accanto ai file aggiunti o modificati nell'ultima ora e
  alle cartelle che contengono novità dell'ultima ora (con il numero nel tooltip).
- **Scheda File, colonna Modificato** come su SharePoint: "Pochi secondi fa", "12 minuti fa",
  "3 ore fa", "Ieri alle 14:32", "Lunedì alle 09:10" nell'ultima settimana, poi "20 novembre"
  (con l'anno se diverso); data e ora complete nel tooltip (`modifiedLabel` in `src/lib/time.ts`).
  Per le cartelle data e autore sono quelli dell'ultima modifica al contenuto (sottocartelle
  comprese, dall'attività degli ultimi 30 giorni), con il nome dell'elemento nel tooltip; anche
  l'ordinamento per "Modificato" usa questa data.
- **Scheda File, vista Attività** per ogni cartella collegata (interruttore File | Attività, con
  il numero di attività degli ultimi 7 giorni): chi ha aggiunto, modificato, spostato,
  rinominato o eliminato cosa, anche direttamente da Teams/SharePoint. Raggruppata per giorno,
  con ricerca (file, cartella, persona) e filtri Tutti/Solo io, tipo di azione e periodo (oggi,
  7, 30 giorni). Ogni riga apre il file in Office web o la cartella nella vista File.
- Dati dall'API `activities` di Microsoft Graph (v1.0) sulla cartella collegata e sulle
  sottocartelle: nessuna tabella nuova, si vede solo ciò a cui l'utente ha accesso. Salvataggi
  ripetuti dello stesso file entro un'ora diventano una riga sola.

### Migrazioni e configurazione
- Nessuna.

### Test eseguiti
- Typecheck, lint, build.
- Nel browser su PSW: vista Attività con creazioni, modifiche ed eliminazioni reali (anche di
  cartelle), filtri "Eliminati" e periodo; pallini sulle cartelle con novità e sui file aggiunti.
  Prova su PSW con un file di test creato, rinominato, spostato in `Consegne` ed eliminato:
  spostamento ("da cartella principale") ed eliminazione visibili; creazione e rinomina di un
  file poi eliminato non arrivano da Graph (l'elemento non esiste più). Paginazione di Graph
  verificata (fino a 5 pagine lette). Non provati: rinomina di un file che resta, "Solo io" con
  un secondo utente.

## [0.18.0] 2026-11-27 — Ripiego sulle skill locali per i file Teams

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- **MCP, nuovi tool**: `get_project_file_link` (link temporaneo per scaricare il file originale,
  con etag) e `create_project_upload_link` (link di caricamento: con etag una nuova versione del
  file, rifiutata se nel frattempo è cambiato; senza etag un file nuovo, rifiutato se il nome
  esiste). I byte vanno e vengono con `curl` direttamente da SharePoint, senza passare dal modello.
- **MCP, istruzioni del server**: prima i tool strutturati (`read_project_file`, `edit_*`,
  `create_office_file`); se non bastano e c'è una shell, scarica, lavora con le skill locali
  (docx, pptx, xlsx, pdf) e ricarica. Senza shell lo dice all'utente.
- **AGENTS.md**: ogni modifica al server MCP alza `version` nella stessa modifica.

### Migrazioni e configurazione
- Nessuna

### Test eseguiti
- Typecheck, lint, build ok.
- Su PSW, `Input cliente/T2.2 – Architettura — Portale Fornitori.docx`: download con il link,
  riga nuova nella tabella §1 in revisione con la skill docx (validazione ok), caricamento con
  etag (HTTP 200, etag 3 → 4), rilettura con `read_project_file` ok; caricamento con etag vecchio
  rifiutato (conflitto), file nuovo con nome esistente rifiutato.
- Stesso file, prima della modifica: `edit_word_file` con `find_replace`, `set_cell`,
  `insert_after` e `track_changes` (etag 2 → 3) e rilettura ok.

## [0.17.0] 2026-11-27 — Word, Excel e PowerPoint via MCP nelle cartelle Teams

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- **MCP, `read_project_file`**: Word a blocchi numerati (titoli, stili, tabelle con righe e
  colonne), PowerPoint per slide (forme con id, paragrafi, note), Excel per foglio dall'API
  Workbook (celle per riga, formule, tabelle; `sheet` e `range` opzionali). Restituisce l'`etag`.
  Gli altri formati come prima.
- **MCP, nuovi tool**: `create_office_file` (.docx da Markdown, .xlsx da fogli e righe con
  formule, .pptx da scaletta con grafica di base); `edit_word_file` (sostituisci/inserisci/elimina
  blocchi, celle, trova e sostituisci; `track_changes` per le revisioni di Word a nome
  dell'utente); `edit_powerpoint_file` (testi delle forme, note, duplica/sposta/elimina slide,
  sezioni tenute in ordine); `edit_excel_file` (intervalli, formule, fogli, righe di tabella, sul
  file aperto). Word e PowerPoint si salvano solo se l'`etag` è ancora quello letto (nuova
  versione su SharePoint).
- **MCP, `copy_project_file`**: `new_name` per creare un file nuovo da uno esistente; attende la
  fine della copia e restituisce il file; rifiuta un nome già presente nella destinazione.
- Limite di Word e PowerPoint portato a 50 MB (altri formati 10 MB).
- Codice in `src/lib/office/` (pacchetti OOXML con fflate e xmldom, Excel con Graph);
  `src/lib/project-files.ts` e `src/lib/mcp/server.ts` come adapter. Export Word: costruttore
  senza frontespizio condiviso (`markdownDocx`).
- Tutto solo con la funzione Microsoft attiva (oggi solo Lorenzo in locale).

### Migrazioni e configurazione
- Nessuna migrazione. Dipendenze nuove: `@xmldom/xmldom`, `pptxgenjs`, `fflate` (prima solo
  indiretta).

### Test eseguiti
- Typecheck, lint, build.
- Moduli Office in locale (script fuori repo): .docx generato, letto, modificato in modo diretto e
  con revisioni; .pptx generato, testi/note cambiati, slide duplicata, spostata, eliminata; .xlsx
  generato con formula. Tutti aperti con LibreOffice (revisioni visibili, slide corrette) e con
  Word, PowerPoint ed Excel desktop via COM senza errori (8 revisioni riconosciute, formula
  calcolata).
- **Da fare**: prova end to end via MCP sulla cartella Teams di PSW (Excel dall'API Workbook,
  etag e conflitti, file reali con stili e logo, apertura in Office per il web).

## [0.16.0] 2026-11-27 — Esporta e Pubblica su Teams i documenti ASDP

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- **Documento → Esporta**: scarica il documento in PDF, Word o Markdown. PDF e Word hanno
  un'intestazione leggibile (progetto, cliente, versione, stato, approvazione) al posto del
  frontespizio YAML e la scritta "Bozza – non approvato" se il documento non è Approvato; il
  Markdown è il file sorgente così com'è. Non usa Microsoft: vale per tutti, anche sul cloud.
- **Documento Approvato → Pubblica su Teams** (solo con livello "approve", funzione Microsoft
  attiva e una cartella Teams collegata): copie nei formati scelti in `ASDP/Fase N - …/` della
  cartella del progetto, con nome stabile. Ripubblicare sostituisce i file (stesso link, versioni
  su SharePoint). Sotto il titolo, "Su Teams" con i link ai file e "Da ripubblicare" quando il
  documento è cambiato dopo la pubblicazione.
- Motore unico in `src/lib/documents/export/` (registro dei formati), pubblicazione in
  `src/lib/documents/publish.ts`, route `GET /api/documents/export`.
- **Documento → ritorno al progetto**: sopra il titolo un pulsante «← Nome progetto» al posto del
  link grigio; breadcrumb con separatori più chiari e il tipo di documento evidenziato.
- **Barra laterale → I miei progetti**: sotto «Progetti» i progetti non chiusi in cui sei nel team,
  più quello aperto, evidenziato anche dentro documenti e file; un clic porta al Percorso.
- Decisione: i documenti ASDP restano su GitLab (spostarli su SharePoint è bloccato dal GDPR,
  rompe i permessi RLS e l'evidenza delle approvazioni); su Teams vanno solo copie.

### Migrazioni e configurazione
- Migrazione `20261127114831_document_publications.sql` (tabella `document_publications`, RLS:
  lettura come l'indice, scrittura con "approve"): applicata in locale, da applicare sul cloud.
- Dipendenze nuove: `remark-rehype`, `rehype-stringify`, `docx`, `puppeteer-core`,
  `@sparticuz/chromium` (+ `@types/mdast`). PDF con Chromium headless: su Vercel quello di
  `@sparticuz/chromium` (`outputFileTracingIncludes` in `next.config.ts`), in locale il Chrome
  installato (`CHROME_PATH` per un percorso diverso).

### Test eseguiti
- Typecheck, lint, build ok; pgTAP `document_publications` 5/5.
- Esporta in locale (pm@, sandbox): T2.2 e T3.1 in PDF, Word e Markdown, risposta 200 con tipo e
  nome file giusti. Apertura dei file da verificare da Lorenzo.
- Pubblica su Teams: **non provata** (serve un Team di test).

## [0.15.0] 2026-11-27 — File Teams: sostituire con una nuova versione

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- **File del progetto, Carica**: se un file scelto ha lo stesso nome di uno nella cartella, l'app
  chiede **Sostituisci** (nuova versione dello stesso file: nome e link restano, SharePoint tiene
  la precedente nella cronologia delle versioni) o **Mantieni entrambi** (copia "nome 1.docx",
  come prima). Una scelta per tutto il gruppo di file.
- **Menu ⋯ di un file → Carica nuova versione**: il file scelto dal computer sostituisce il
  contenuto; serve la stessa estensione.
- **Trascina per caricare**: i file trascinati dal computer sulla card della cartella aperta si
  caricano lì, con lo stesso flusso di Carica (avanzamento, Sostituisci / Mantieni entrambi).
  Mentre si trascina, la card mostra un overlay con la cartella di destinazione ("Trascina qui",
  poi "Rilascia per caricare"); fuori dalla card il rilascio è bloccato. Le cartelle trascinate
  sono saltate con un avviso. Non attivo nei risultati di ricerca.
- **Menu ⋯ di un file → Cronologia versioni**: pannello laterale con le versioni del file come su
  SharePoint (numero, autore, ora, dimensione), raggruppate per giorno; l'attuale si apre in
  Office web, le precedenti si scaricano. Solo consultazione. Graph: `listVersions`, `downloadUrl`
  con la versione, azione `fileVersions` (controlla con `itemInFolder`); componente shadcn `Sheet`.
- **Tasto destro su un file o una cartella**: menu come su SharePoint con Apri (file in Office web,
  cartella nella card), Scarica e Copia link (solo file) e le stesse azioni del ⋯. Le voci sono
  definite una volta e condivise tra i due menu (`ItemRow` in `file-manager.tsx`); componente
  shadcn `ContextMenu`. Agisce sull'elemento cliccato, non sulla selezione.
- Graph: `createUploadSession` con `conflictBehavior` `rename` o `replace`; nuova azione
  `startNewVersion` (controlla con `itemInFolder` che il file sia nella cartella collegata).
- Il tool MCP di caricamento non cambia (con un nome già presente fallisce).

### Migrazioni e configurazione
- Nessuna

### Test eseguiti
- Typecheck, lint e build ok (il lint globale falliva per i file generati nel worktree
  `microsoft-registration-integration-6c1a37`, rimosso perché già in `master`).
- Non provato nel browser con SharePoint: da provare su una cartella di test.
- Trascinamento: overlay provato nel browser con eventi simulati (entrata nella finestra, sopra la
  card, uscita); rilascio reale dal computer e caricamento non provati.
- Cronologia versioni: provata nel browser su un .docx reale di PFS (10 versioni, confrontabili
  con SharePoint); "Scarica" di una versione vecchia risponde col redirect di Graph.
- Tasto destro: provato nel browser su file e cartella di PFS (menu, Cronologia versioni, Apri
  cartella) e il ⋯ ancora funzionante; Rinomina, Sposta, Elimina dal menu non eseguiti (Team reale).

## [0.14.0] 2026-11-26 — Percorso: stati, domande D[N] e attività recente

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- **Scheda Percorso, righe dei documenti**: owner e scadenza (rossa se passata e il documento non è
  pronto), numero di domande D[N] aperte e con risposta da applicare, badge "Modifiche richieste"
  (motivo al passaggio del mouse).
- **Domande D[N]** sotto la riga del documento ("Vedi le domande"): aperte o con risposta, e
  "Applica le risposte" che copia la richiesta per rilanciare la skill in aggiornamento. Nella T1.4
  le D[N] copiate dal consolidato si mostrano come "punti aperti dal consolidato", senza pulsante:
  si rispondono nei Requisiti Consolidati.
- **Modifiche richieste**: se il documento del Prossimo passo è stato rimandato, il motivo del
  revisore compare nella card.
- **Attività recente** nella colonna destra: ultimi salvataggi dei documenti (chi, cosa, quando,
  "con Claude" se via MCP), con la stessa visibilità dei documenti.
- Indice: le D[N] si ricavano dal testo (`src/lib/questions.ts`) a ogni indicizzazione e salvataggio.
  Ogni commit di app e MCP finisce in `document_events`; il webhook GitLab registra i push diretti
  (commit senza trailer `Via:`).
- Guida, "Rispondere alle domande D[N]": dice dove si vedono le domande nell'app.
- **MCP**: `get_project` dà anche descrizione e date, skill e `per_feature` per ogni tipo, `next_step`
  (il prossimo passo come nella mappa, con la skill) e `behind` (passi arretrati); per ogni documento
  owner, scadenza, domande D[N] e `changes_requested`. `list_projects` dà descrizione e date.
  `list_documents` ha gli stessi dati dei documenti. `list_versions` dà il messaggio completo del
  commit (es. il motivo di una richiesta di modifiche). Nuovo tool `list_activity` (ultimi
  salvataggi del progetto). Istruzioni del server aggiornate. Il calcolo dei passi è in
  `src/lib/project-steps.ts`, usato dalla mappa e dall'MCP.
- **Progetti, colonna Team** (prima "Persone"): PM e TL per nome, numero di persone e i tuoi
  ruoli ("Tu: Designer"); al passaggio del mouse tutto il team con i ruoli. Prima mostrava solo il
  PM e i tuoi ruoli come badge senza etichetta.

### Migrazioni e configurazione
- `20261126224116_percorso_activity.sql`: colonna `documents.questions`, tabella
  `document_events` con RLS (lettura come `documents`, inserimento con "edit" sul tipo). Da
  applicare sul cloud; dopo, "Reindicizza" sui progetti per riempire le domande. L'attività parte
  dai salvataggi successivi alla migrazione.

### Test eseguiti
- Typecheck, lint, build ok.
- pgTAP: `document_events.test.sql` 5/5; gli altri fallimenti (7) sono quelli già noti dei dati
  locali in più rispetto al seed.
- Parser D[N] su casi di prova: nessuna casella, "Da decidere", "Altro" vuoto e più caselle →
  aperta; opzione o "Altro" con testo → con risposta.
- Browser con `pm@asdp.test` su PFS (sandbox): owner e scadenza nelle righe,
  "Richiedi modifiche" sul T3.1 → badge e voce in Attività, poi riportato a Completo; riquadro D[N]
  con dati simulati nell'indice locale (azzerati da Reindicizza).
- Webhook locale con push simulato: commit diretto registrato come "git", commit con `Via: app`
  saltato.
- MCP locale (`admin@asdp.test`): `create_document` di un P1.3 di prova con D[N] su PFS (indice e
  Attività "via mcp" ok); `get_project`, `list_documents`, `list_activity`, `list_versions`: prossimo
  passo e arretrati uguali alla mappa, motivo della richiesta di modifiche in `list_versions`.

## [0.13.0] 2026-11-26 — Nuovo progetto a passi, portafoglio progetti e file in blocco

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- **Nuovo progetto a passi**: Progetto → Repository → Persone e Teams → Riepilogo, con riepilogo
  dal vivo a destra (da `lg`). Alla creazione si scelgono anche descrizione e date, repo FE/BE
  (nessuna, nuova o esistente), PM/TL e il Team per il canale. Descrizione e date si modificano in
  Impostazioni › Generale.
- **Pagina Progetti come portafoglio**: colonne Progetto (cliente · natura), Stato, Fase con barra
  "pronti/attesi", Attenzione (scaduti, in approvazione, manca PM/TL, Setup per admin/PM),
  Persone, Fine (rossa se passata). Ricerca, filtro stato (default Attivi), "Solo i miei",
  ordinamento, riga cliccabile, filtri nell'URL; titolo e filtri sticky, tabella con intestazione
  fissa. Calcolo dell'avanzamento in `src/lib/phase-progress.ts`, condiviso con la mappa.
- **Pagina del progetto**: intestazione e schede sticky; la colonna destra (da `xl`) si ancora
  sotto.
- **Scheda File**: tabella con altezza limitata e intestazione fissa; selezione multipla con
  checkbox (seleziona tutto, Maiuscolo+clic per un intervallo) e barra di gruppo con Sposta ed
  Elimina su più elementi (max 100, errori parziali riportati). Ricerca mentre si digita
  (debounce 300 ms, minimo 2 caratteri) e solo sui nomi dei file (Graph `search` è full-text).

### Migrazioni e configurazione
- `20261126211145_project_details.sql`: colonne `description`, `start_date`, `end_date` su
  `projects` (con controllo fine ≥ inizio). Applicata in locale, da applicare sul cloud.

### Test eseguiti
- `tsc --noEmit`, `lint`, `build` ok.
- Nuovo progetto a passi provato in locale con admin (evolutiva con BE esistente e PM/TL).
  Pagina Progetti provata nel browser con admin (filtri, ordinamento, ritorno indietro).
- Non provati: "Crea su GitLab" dal wizard, canale Teams (serve un Team di test), azioni di gruppo
  sui file e ricerca con un account Microsoft reale, viste con `pm@`/`tl@`. pgTAP non rilanciato:
  7 test falliscono per i dati locali in più rispetto al seed (serve un `db reset`).

## [0.12.0] 2026-11-26 — Creazione guidata del progetto e preparazione dell'area di lavoro

**Autore**: Lorenzo Belli con Claude Code

### Cosa è cambiato
- **Nuovo progetto**: form in tre sezioni (progetto, repository, dopo la creazione), codice
  suggerito dal nome. Con "Crea su GitLab" l'app crea il gruppo del progetto sotto
  `GITLAB_PROJECTS_GROUP` con la repo documenti `adsp` (README con le cartelle del framework) e,
  a scelta, `fe` e `be` vuote, registrate come repo di codice; poi webhook. "Collega una repo
  esistente" resta come prima.
- **Pagina del progetto**: scheda "Prepara l'area di lavoro" per admin e PM con i passi mancanti
  (repo documenti, repo di codice, canale Teams, PM e TL, collegamento di Claude con i comandi di
  clone per il TL, primo passo Kickoff). Ogni passo è idempotente; la scheda sparisce quando è
  tutto pronto e, dopo la Fase 0, compare solo se manca la repo documenti. Repo su GitLab solo
  dall'admin; una repo documenti già collegata non si cambia, e non si collega da qui una repo
  che ha già dei file o che è di un altro progetto.
- **Teams** (solo con `MICROSOFT_CLIENT_ID`): nella pagina di collegamento, scelto il Team,
  "Crea il canale del progetto" crea (o riusa) il canale, le cartelle Input cliente, Verbali e
  trascrizioni, Governance, Consegne e lo collega; poi "Gestisci team" si apre con i membri del
  Team che hanno un account nell'app.
- **MCP**: `get_project` restituisce `setup` (`teams_folder`, `missing`); le istruzioni del server
  dicono di segnalare all'utente la repo documenti mancante (l'unico passo che blocca il
  salvataggio) e di citare gli altri solo se servono.
- **Repo per numero**: le repo GitLab si identificano dal numero (`gitlab_project_id`), che non
  cambia se la repo viene spostata o rinominata. Il percorso resta per i link: "Reindicizza" lo
  riallinea da GitLab, per la repo documenti e per le repo di codice, e compila il numero dei
  progetti esistenti. Il webhook riconosce la repo dal numero (dal percorso solo se il numero
  manca). Le repo create dall'app salvano subito il numero.
- **Modifica progetto**: admin e PM possono cambiare la repo documenti. L'app la verifica su
  GitLab (repo, branch, non già di un altro progetto), ricrea il webhook e reindicizza; il
  webhook sulla repo vecchia va tolto a mano.
- **Pagina del progetto a schede**: intestazione compatta con le schede Percorso, File e
  Impostazioni (URL `/progetti/[id]`, `/file`, `/impostazioni`). In Percorso la mappa sta al centro
  e una colonna destra (da 1280 px; sotto, una riga da tre) mostra area di lavoro (solo passi aperti),
  team e collegamenti. Le modifiche (dati del progetto, che prima erano nel dialog Modifica, team,
  repository, cartelle Teams) sono tutte in Impostazioni. File mostra solo i file.
- **Percorso come timeline**: tutte le fasi in un elenco, chiuse quelle complete (con i pallini di
  stato dei documenti), aperte le altre; niente più caselle da selezionare. "Copia prompt per
  Claude" nel Prossimo passo e sulle righe da creare (richiesta pronta con progetto, skill e
  connettore; se il browser non permette gli appunti il prompt si apre per copiarlo a mano).
  L'avviso dei documenti arretrati apre la prima fase da finire; `/` porta sulla ricerca;
  Reindicizza è nel menu ⋯ accanto al nome del progetto.
- **MCP, file Teams del progetto** (solo con `MICROSOFT_CLIENT_ID`, oggi solo in locale): nuovi tool
  `list_project_files`, `search_project_files`, `read_project_file` (testo; PDF e Office estratti
  come testo), `create_project_folder`, `upload_project_file` (solo file di testo, non
  sovrascrive), `move_project_file` (anche rinomina), `copy_project_file`, `delete_project_file`
  (cestino SharePoint). Agiscono con l'account Microsoft collegato dall'utente nell'app e solo
  dentro le cartelle collegate al progetto (percorsi relativi, `..` rifiutato). `get_project.setup`
  restituisce anche `teams_folders` (etichetta, link, sottocartelle base); le istruzioni del server
  dicono dove cercare gli input del cliente e di spostare o eliminare solo su richiesta esplicita.
  Servizio in `src/lib/project-files.ts`; nuova dipendenza `unpdf`.
- **Prompt con le cartelle Teams**: con una cartella Teams collegata, "Copia prompt" di Kickoff
  Pack, Verbale Kickoff e Requisiti Consolidati indica a Claude le cartelle da leggere (Input
  cliente; Verbali e trascrizioni; entrambe).
- **Suggerimenti delle repo**: nei campi del percorso GitLab (Nuovo progetto, Impostazioni ›
  Generale, aggiunta di una repo di codice) mentre scrivi compaiono le repo che l'app vede
  (ricerca di GitLab). Resta possibile scrivere il percorso a mano.
- **Indice**: una repo documenti senza la cartella `asdp/` vale come vuota (prima Reindicizza dava
  errore); repo o branch inesistenti restano un errore.
- **Guida**: sezione "Creare e preparare un progetto" in "Come si usa questa app".

### Migrazioni e configurazione
- `20261126190851_gitlab_project_id.sql`: colonna `gitlab_project_id` su `projects` e
  `project_repositories`. Da applicare sul cloud, poi "Reindicizza" sui progetti esistenti.
- Nuova variabile `GITLAB_PROJECTS_GROUP` (gruppo padre GitLab). Il token GitLab deve poter creare
  sottogruppi e project sotto quel gruppo. Senza variabile si può solo collegare una repo esistente.

### Test eseguiti
- `tsc --noEmit`, `lint`, `build` ok; `supabase test db` 52/52.
- Repo per numero: Reindicizza su PFS (sandbox spostata in `asdp-sandbox/sandbox-test`) → numero
  946 salvato, 4 documenti; su PSW → 952 per adsp, 953 e 954 per fe e be. Nel dialog un percorso
  inesistente viene rifiutato con "Repo non trovata su GitLab o non accessibile all'app".
- Schede: provate con build di produzione su `localhost:4102` (admin) a 1440 e 1100 px su PSW
  (Fase 0, area di lavoro 3/5) e PFS (Fase 2, senza area di lavoro): scheda attiva, File,
  Impostazioni; la pagina documento resta senza schede. Non provate con `pm@` e `tl@`.
- In locale con `admin@asdp.test` e gruppo padre di test `asdp-sandbox`: creato il progetto PSW
  con fe e be. Su GitLab ci sono `asdp-sandbox/psw/{adsp,fe,be}` privati su `main`, il README con
  autore l'utente e le repo collegate nell'app. Scheda con i passi 1–2 fatti; Reindicizza su repo
  senza `asdp/` → 0 file, nessun errore. Scheda assente su PFS (Fase 2, repo collegata), presente
  su APA (Fase 1, senza repo).
- Non provati: creazione del canale Teams e proposta dei membri (serve un Team di test; la pagina
  di collegamento restava su "Caricamento…" anche con il codice di prima), vista con `pm@`/`tl@`,
  `get_project` via MCP.

## [0.11.1] 2026-11-26 — Permessi delle funzioni security definer

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **Database**: le funzioni helper della RLS (`is_admin`, `is_project_member`, `has_project_role`,
  `shares_project_with`, `is_any_project_pm`, `document_level`) si possono eseguire solo da
  utenti autenticati, non più da `anon`; le funzioni di trigger (`handle_new_user`,
  `handle_user_invited`, `handle_user_sign_in`, `sync_user_ban`) da nessun ruolo dell'API.
  Risolve gli avvisi dell'advisor di sicurezza di Supabase.

### Migrazioni e configurazione
- `20261126161428_security_definer_execute.sql`: da applicare sul cloud
  (`supabase db push --remote`).

### Test eseguiti
- `supabase test db`: 7 file, 52 test, tutti verdi (nuovo `security_definer_execute.test.sql`).
- Trigger su `auth.users` come `supabase_auth_admin`: il profilo viene creato.
- Typecheck, lint, build.

## [0.11.0] 2026-11-26 — Gestione dei file di progetto (7b)

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **UI, progetto**: nella card File di progetto **Carica** (più file insieme, con avanzamento) e
  **Nuova cartella**; su ogni file e cartella il menu "…" con **Rinomina**, **Sposta** (scelta
  della cartella di destinazione navigando) ed **Elimina** (nel cestino del sito SharePoint).
- **Microsoft Graph**: si agisce come l'utente, quindi SharePoint decide chi può scrivere; l'app
  limita il dove: solo dentro la cartella collegata al progetto (ogni elemento è riletto e
  controllato). Il caricamento usa una sessione di Graph: i byte vanno dal browser direttamente
  a SharePoint, senza passare dall'app. Con un nome già presente SharePoint crea una copia
  rinominata, non sovrascrive.

### Migrazioni e configurazione
- Nessuna.

### Test eseguiti
- Typecheck, lint, build; nel browser in locale: barra e dialoghi nella card.

## [0.10.1] 2026-11-26 — Account Microsoft nella card, via la pagina di prova

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **UI**: tolte la pagina di prova `/file-microsoft` e la voce "File Microsoft" (WIP) del menu.
  I file si vedono ora solo nel progetto, e solo quelli delle cartelle collegate.
- **UI, progetto**: in fondo alla card File di progetto compare "Microsoft: nome · **Scollega**",
  anche quando Microsoft dà errore. Scollega cancella il token salvato dall'app; non lo revoca su
  Microsoft (il consenso si toglie da myapps.microsoft.com o lo toglie l'IT).
- Il login Microsoft senza pagina di ritorno porta a `/progetti`.
- PATCH e non MINOR: chiude una prova e completa il collegamento che c'era già.

### Migrazioni e configurazione
- Nessuna.

### Test eseguiti
- Typecheck, lint, build; nel browser in locale: menu senza voce, `/file-microsoft` 404, riga
  dell'account nella card, Scollega.

## [0.10.0] 2026-11-26 — File di progetto da Teams nella pagina del progetto

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **UI, progetto**: card **File di progetto** (milestone 7a, sola lettura). Mostra le cartelle
  Teams/SharePoint collegate al progetto come schede: percorso navigabile, ricerca nella cartella
  e nelle sottocartelle, colonne Nome / Modificato da / Modificato / Dimensione, icone per tipo,
  apertura in Office per il web, **Scarica**, **Copia link**, **Apri in SharePoint**. Senza
  account Microsoft collegato propone "Collega account Microsoft"; un errore di Microsoft resta
  nella card e non blocca la pagina.
- **UI, collegamento**: pagina **Collega una cartella di Teams** (PM e admin): Team → canale
  (anche privati e condivisi) → sottocartella, con un nome nel progetto. **Scollega** toglie la
  cartella dal progetto senza toccare Teams.
- **Microsoft Graph**: i token chiedono `.default`, cioè i permessi approvati dall'IT; la ricerca
  tiene solo i file dentro la cartella collegata (SharePoint cerca in tutta la raccolta); il login
  torna alla pagina di partenza (`next`, solo percorsi interni).
- Tutto resta visibile solo dove c'è `MICROSOFT_CLIENT_ID` (oggi solo in locale).

### Migrazioni e configurazione
- Migrazione `20261126153839_project_file_locations.sql`: cartelle collegate al progetto (le
  vedono i membri, le cambiano PM e admin, via RLS).

### Test eseguiti
- Typecheck, lint, build; test RLS pgTAP (`project_file_locations.test.sql` compreso).
- In locale con un account DST reale: collegamento Team → canale → cartella, card con le
  cartelle, sottocartella e percorso, ricerca con colonna Cartella, download (redirect al file).

## [0.9.0] 2026-11-26 — Pagina del progetto più chiara e modificabile

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **Intestazione del progetto**: sotto il nome cliente, natura, fase corrente (con nome) e
  versione del framework; pulsante "Modifica" per admin e PM.
- **Modifica progetto** (nuova): nome, cliente, natura, stato, fase corrente e versione del
  framework si cambiano da un dialog (prima non si potevano cambiare dall'app). Repo documenti,
  branch e cartella restano fissi.
- **Passa alla fase successiva**: quando tutti i documenti della fase corrente sono Completo o
  Approvato, admin e PM vedono "Passa alla Fase N+1" nell'intestazione.
- **Team**: elenco delle persone con i ruoli per tutti; la matrice dei ruoli si apre da
  "Gestisci team" (admin e PM). Avviso compatto se manca PM o TL.
- **Repository**: una card con la repo documenti (percorso, branch, cartella) e le repo di
  codice, con link a GitLab; "Collega repository" in un dialog. Al collegamento l'app controlla
  su GitLab che repo e branch esistano e, se non li trova, avvisa senza bloccare.
- Tolta la card "Dati del progetto": i dati sono ora nell'intestazione e nella card Repository.
  Team e Repository affiancati sotto il Percorso ASDP, che resta invariato.

### Migrazioni e configurazione
- Nessuna (la RLS `projects_update` permetteva già la modifica ad admin e PM).

### Test eseguiti
- `tsc --noEmit`, `pnpm lint`, `pnpm build`: ok.
- In locale (seed, utente PM su PFS): Modifica → Fase 3 → intestazione e prossimo passo
  aggiornati, compare "Passa alla Fase 4"; clic → Fase 4; riportato a Fase 2. Collegata una repo
  inesistente con GitLab non raggiungibile → salvata con avviso entro 5 s, poi scollegata.
  "Gestisci team" → Salva senza modifiche → il dialog si chiude.
- Non provati: utente senza ruolo PM (solo lettura) e link a GitLab (GitLab non raggiungibile).

## [0.8.1] 2026-11-26 — Prova nascosta del collegamento Microsoft

**Autore**: Lorenzo Belli

PATCH e non MINOR: la funzione è nascosta (fuori dal menu e disattivata senza variabili), nessun
cambiamento visibile per gli utenti.

### Cosa è cambiato
- **Microsoft Graph** (milestone 7, in sospeso per il consenso dell'IT): "Collega account
  Microsoft" con OAuth (state e PKCE) e pagina di prova `/file-microsoft`, che mostra i Team
  dell'utente e i file dei canali in sola lettura e li apre in Office per il web.
  Pagina e route rispondono 404 se manca `MICROSOFT_CLIENT_ID`.

### Migrazioni e configurazione
- Migrazione `20261125231607_microsoft_accounts.sql`: tabella `microsoft_accounts` (refresh
  token per utente, RLS solo la propria riga).
- Variabili facoltative `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`
  (oggi solo in `.env.local`; sul cloud non vanno messe finché la funzione è in sospeso).

### Test eseguiti
- Typecheck, lint, build.
- Test RLS pgTAP (`supabase test db`), compreso `microsoft_accounts.test.sql`.
- In locale: la pagina mostra "Collega account Microsoft" e Microsoft accetta la richiesta di
  login; con l'account DST compare "L'approvazione è necessaria" (consenso dell'IT da chiedere).
- Senza `MICROSOFT_CLIENT_ID`: `/file-microsoft` e `/api/microsoft/login` rispondono 404.

## [0.8.0] 2026-11-25 — Approvazioni più funzionali

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **UI, Approvazioni**: due schede.
  - **Da approvare**: documenti divisi per progetto (in alto i progetti con scaduti o attese più
    lunghe), filtri per progetto e gate, ordinamento per attesa, scadenza o tipo. Ogni riga:
    gate, da quanti giorni aspetta (da `completato_il`, altrimenti dall'ultimo salvataggio),
    scadenza in rosso se passata, autore, pulsante **Rivedi**. Analisi Tecnica e Piano di lavoro
    della stessa Feature, entrambi Completo, su una riga sola (G2).
  - **Approvati**: ultimi 30 giorni, con chi ha approvato, data e versione.
- **UI**: numero dei documenti da approvare accanto alla voce **Approvazioni** del menu.
- **UI**: dopo **Approva** o **Richiedi modifiche**, la pagina del documento propone il prossimo
  documento da approvare (o dice che la coda è vuota).
- **Documenti**: `listApproved` nel service layer; `featureOf` spostato in `src/lib/features.ts`.
- **Guida**, `TODO.md`, ARCHITETTURA: confine tra Approvazioni (decisioni di gate) e la futura
  Dashboard (panoramica personale).

### Migrazioni e configurazione
- Nessuna

### Test eseguiti
- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`: ok.
- In locale sulla sandbox: come TL coda con il solo T2.2 e badge 1; come admin due documenti,
  badge 2, filtro per gate, Approva sul T2.2 → proposto il Risk Register, Richiedi modifiche sul
  Risk Register → "Non hai altri documenti da approvare" e badge sparito; scheda Approvati con
  T2.2 e Verbale kickoff.
- Non provato: riga unica del G2 (nessun T4.2/T4.3-INDEX sulla sandbox).

## [0.7.0] 2026-11-25 — Coda delle approvazioni

**Autore**: Lorenzo Belli

### Cosa è cambiato
- **UI**: la voce **Approvazioni** del menu non è più un segnaposto. Elenca i documenti Completo
  che l'utente può approvare, in tutti i suoi progetti: titolo con link al documento, progetto,
  gate, autore, data di completamento.
- **Documenti**: `listToApprove` nel service layer (indice filtrato dalla RLS, tenuti i documenti
  dove l'utente ha "approve").
- **Guida**: Gate e Come usare l'app citano la coda.

### Migrazioni e configurazione
- Nessuna

### Test eseguiti
- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`: ok.
- In locale come `tl@asdp.test`: il T2.2 Completo di Portale Fornitori compare con link e gate.
- Non provato: utente senza "approve" (coda vuota).

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
