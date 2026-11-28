# TODO — ASDP Workspace

Cose da fare non ancora pianificate in una milestone. Spostarle in `docs/ARCHITETTURA.md` (§7 o
§8) quando vengono prese in carico.

## Documenti ASDP e Teams (dopo 0.16.0)

- [ ] **Ricerca unica nel progetto**: una casella nell'intestazione del progetto che cerca insieme
  documenti ASDP (titolo, codice, percorso) e file Teams delle cartelle collegate.
- [ ] **"Documenti ASDP" nella scheda File**, accanto alle cartelle Teams, con l'albero per fase
  (si sovrappone in parte al Percorso: da valutare).
- [ ] **Pubblica via MCP** (`publish_document`) e **Rimuovi da Teams**.
- [ ] **GDPR**: la cartella del canale la vedono anche gli ospiti del cliente; inserire la
  pubblicazione nell'analisi per l'IT prima di aprirla ad altri utenti.
- [ ] **PDF su Vercel**: verificare dimensione della funzione e avvio a freddo di Chromium al
  primo deploy; ripiego: PDF convertito da SharePoint dal .docx (`downloadUrl(..., "pdf")`).

## Ambiente cloud di test

- [ ] **Email di invito sul progetto cloud.** Sul piano free con l'email predefinita di Supabase il
  template non si può cambiare (`config push` → `entitlement_required`), quindi l'invito usa il
  link standard (`{{ .ConfirmationURL }}`), gestito dalla pagina `/auth/invito` (sessione nel
  frammento `#access_token`). Resta il limite: l'email predefinita parte solo verso i membri
  dell'organizzazione Supabase, con un limite di poche email all'ora per tutto il progetto
  (errore `over_email_send_rate_limit`, provato il 2026-11-20). Per invitare colleghi: configurare un SMTP (es. Resend) e
  togliere l'override `[remotes.test.auth.email.template.invite]` da `supabase/config.toml`.

- [ ] **Riattivare i deploy di anteprima su Vercel** quando si prepara la vera produzione (oggi
  sono spenti: solo il push su `master` fa build e deploy). Come:
  - dashboard Vercel → team `ds-tech4` → progetto `asdp-workspace` → Settings → Git (o Build and
    Deployment) → riattivare i Preview Deployments;
  - oppure chiedere a Claude di farlo con l'MCP di Vercel: `update_project` su `asdp-workspace`
    (slug `ds-tech4`) con `previewDeploymentsDisabled: false`.

  Con le anteprime riattivate le variabili d'ambiente vanno messe anche sull'ambiente Preview
  (oggi sono solo Production) e i domini delle anteprime sono già tra i redirect ammessi di
  Supabase (`[remotes.test.auth]` in `supabase/config.toml`).

- [ ] **Token GitLab per i progetti veri.** Oggi `GITLAB_TOKEN` è un project access token della
  sola sandbox. Per più repo documenti serve un token di gruppo (o un service account) con
  ruolo Maintainer, che serve anche per creare i webhook in automatico.
- [ ] **Webhook vecchi al cambio di dominio.** Se cambia l'URL di produzione (es. dominio
  `dstech.it`), "Reindicizza" crea il nuovo webhook ma non toglie quello vecchio: va rimosso a
  mano da GitLab.

## Preparazione del progetto (0.12.0)

- [ ] **Membri GitLab dei gruppi creati.** L'app crea gruppo e repo col service account ma non
  aggiunge le persone: oggi le aggiunge a mano chi gestisce GitLab (TL/admin).
- [ ] **Team Microsoft nuovo per progetto**: serve `Team.Create`, nuovo consenso dell'IT. Oggi si
  crea solo un canale in un Team esistente.
- [ ] **Restyling generale dell'app** (richiesta di Lorenzo del 2026-11-26), dopo le priorità
  funzionali.

## Framework e permessi

- [ ] **Versione solo nel frontespizio, resti** (dopo `asdp` 0.17.0, 2026-11-27):
  - plugin `ao`: la stima PERT salva ancora `{progetto}-PERT-v0.1.md` / `.json`;
  - `linked_items` delle skill con nomi e versioni (`[T1.4 PrenotaSale v0.3]`) invece degli ID
    (GUIDA-FRONT riga 87);
  - progetti reali con file `-vX.Y` nella repo documenti: tenere il più recente, rinominato;
  - ~~le skill in aggiornamento mettono `stato: In corso` e svuotano l'approvazione: il server
    rifiutava il salvataggio a chi non approva~~: allineato il server (branch
    `feat/skill-approvati-t43`), le skill restano come sono.

- [ ] **RACI del seed diverso dalla Guida ASDP** (`delivery-tech/DST-ASDP-Guida-Framework.md`
  §4.3, confronto del 2026-11-25). Da decidere con il team quale vale, poi correggere la
  migrazione dei permessi oppure la Guida:
  - T3.1 Risk Register: per la Guida lo produce il PM, nel seed ha "edit" il TL;
  - T4.1 Backlog: per la Guida lo produce il BA/AF, nel seed hanno "edit" AF e TL;
  - T1.4 Analisi Funzionale: per la Guida la approva il PO cliente dopo la revisione del TL,
    nel seed la approva il PM.
- [ ] **Divergenze Guida del framework ↔ plugin `asdp`** emerse scrivendo la Guida nell'app
  (2026-11-26; le pagine seguono il plugin e lo segnalano in nota). Da decidere col team:
  - NFR: per la Guida li raccoglie il TL nel workshop di Fase 2; nel plugin solo nel P1.3 (AF);
  - MoSCoW: per la Guida lo chiude il PM nel backlog; nel plugin si decide nella T1.4;
  - Contratto di esecuzione: per la Guida in ogni T4.3-part; nel plugin una volta nell'INDEX;
  - P1.3 non esiste nella Guida; T1.6 (firma del perimetro) e T2.3 assorbite dalle skill;
  - G1–G6 indicano sia i gate di Fase 4 sia gli artefatti di governance;
  - il kickoff della skill controlla 5 output obbligatori su 9.
- [ ] **Guida nell'app: cose che oggi non si possono fare** (le pagine lo dicono):
  - il guscio dell'app non è responsive (barra laterale fissa da 240 px).
- [x] **Dashboard «Tocca a me»** (milestone 3b): fatta in 0.26.0. Il motivo del rimando si legge
  da `document_events` (non è servito un campo nell'indice). Resta per dopo: file Teams modificati
  di recente (milestone 7, sotto) e un contatore «Tocca a te» nella barra laterale, se serve
  (oggi c'è solo quello di Approvazioni: calcolarlo a ogni pagina costa una lettura per progetto).
- [ ] **Approvazione assistita da AI e MCP** (milestone 3, passo 2; il flusso manuale c'è da
  0.6.0). Claude non approva mai: prepara, l'approvatore decide.
  - tool MCP `check_gate`: restituisce gate, checklist (`src/lib/gates.ts`) e documento, perché
    Claude prepari un esito voce per voce con le prove trovate nel testo;
  - tool MCP per i passi del flusso (`changeApproval`: complete, request_changes, approve, revoke),
    con `approve` solo per chi ha "approve" e dopo conferma esplicita dell'utente in chat;
  - nella finestra Approva: esito di Claude accanto a ogni voce della checklist, da spuntare a mano;
  - approvazione del cliente (T1.4) con upload dell'evidenza in Storage invece del testo libero.

## File di progetto da Teams (milestone 7)

Mappa del 2026-11-26 (dettagli in `docs/STATO.md`, "File di progetto da Teams/SharePoint"). Oggi
l'integrazione vale solo per Lorenzo in locale: quello che tocca altre persone o l'AI aspetta
l'analisi GDPR per l'IT.

- [ ] **Tracciabilità**: nel documento ASDP (P1.3, T1.4) i link ai file Teams da cui è nato
  (verbali, trascrizioni). Solo file di Lorenzo: si può fare subito.
- [ ] **Analisi GDPR per l'IT** (condizione per altri utenti e cloud): flussi, trasferimenti extra
  UE (Vercel `iad1` → `fra1`, Anthropic), contratti dei clienti, refresh token (cifrarlo a
  riposo; Scollega lo cancella nell'app ma non lo revoca su Microsoft), minimizzazione, registro
  dei trattamenti, informativa, DPIA per l'AI. Deve includere le voci qui sotto.
- [ ] **Avviso nel canale Teams** quando un documento va in approvazione o è approvato
  (`ChannelMessage.Send`, già concesso). Lo vedono altri, anche ospiti del cliente: prima un
  Team di test, poi solo dopo l'analisi GDPR.
- [ ] **Domande aperte D[N] nel canale** (milestone 5): pubblicarle per il cliente e raccogliere
  lì le risposte. Come sopra.
- [ ] **Evidenza dell'approvazione del PO scelta da SharePoint**: un link da solo è debole (il file
  cambia o sparisce); serve una versione fissa del file o una copia in Storage. Da decidere col
  team. Con «Sostituisci» / «Carica nuova versione» (`0.15.0`) succede più spesso: stesso link,
  contenuto nuovo. Vale anche per la tracciabilità qui sopra.
- [ ] **Cronologia versioni, seguiti** (oggi solo consultazione, `0.15.0`): **Ripristina** una
  versione (`restoreVersion` di Graph, crea una versione nuova); **nomi alle versioni**
  ("Inviata al cliente", "Approvata dal PO") in una tabella Supabase, con filtro per nascondere i
  salvataggi automatici: base per l'evidenza del PO qui sopra; **cosa è cambiato** tra due
  versioni (diff del testo; verificare se `?format=pdf` funziona anche sulle versioni).
- [ ] **7c per altri utenti**: i tool MCP dei file e degli Office ci sono (0.12.0, 0.17.0, 0.18.0)
  ma valgono solo per Lorenzo in locale. Aprirli ad altri dopo la DPIA (il contenuto dei file del
  cliente va ad Anthropic).
- [ ] **Importa da link via MCP**: tool che risolve un link di condivisione OneDrive/SharePoint
  incollato in chat (Graph `/shares/{id}/driveItem`) e copia il file in una cartella collegata al
  progetto, così poi si legge con `read_project_file`. Risolve i colleghi che passano link
  OneDrive. Stessi vincoli GDPR.
- [ ] **Creazione del progetto da Teams**: scegliere Team e canale e proporre il team dai membri
  del Team (`TeamMember.Read.All`, già concesso).
- [ ] **Dashboard «Tocca a me»**: file modificati di recente nei miei progetti.
- [ ] **Più avanti** (nuovi permessi e DPIA): trascrizioni dei meeting Teams come input di P1.3;
  l'app come scheda nel canale Teams del progetto.
- [ ] **Cloud**: URI di produzione nell'app registration (oggi `REDIRECT_URI` fisso su
  localhost), variabili `MICROSOFT_*` su Vercel, migrazioni sul progetto remoto.

## Interfaccia

- [ ] **Guscio dell'app responsive**: in `src/app/(app)/layout.tsx` la sidebar resta larga 240 px
  anche sul telefono (a 375 px al contenuto restano circa 100 px). Serve una sidebar a scomparsa
  (menu) sotto `md` e un padding più piccolo.
- [ ] **Riquadri D[N] e "Da chiarire" anche nell'editor** (dopo 0.22.1 la spaziatura è uguale
  alla lettura, i colori no): plugin di decorazioni ProseMirror che riusa `questionsOf`, senza
  toccare il Markdown salvato. Da decidere dopo la prova della pagina del documento.
- [ ] Descrizione e date del progetto (migrazione `project_details`) da mostrare
  nell'intestazione del progetto (in `get_project` dell'MCP ci sono da 0.14.0).

## Distribuzione

- [ ] **App desktop (Electron) — valutata il 2026-11-26: valore basso, non farla ora.**
  L'accesso continuo al file system è già coperto da altri canali: Claude Desktop/Code lavorano
  sui file locali e salvano via MCP; le modifiche locali ai documenti passano da clone → push →
  webhook; i file non ASDP stanno su SharePoint/Teams (milestone 7). Una cartella locale
  osservata dall'app creerebbe una terza copia dei documenti, con conflitti e un canale che
  aggira le approvazioni.
  - Se il team chiede solo un'app installabile o notifiche: **PWA** (manifest, icone, push).
  - Ripensare a un guscio Electron sottile (progetto separato che carica l'URL dell'app, mai
    Next.js impacchettato: segreti e MCP restano sul server) solo se emerge un caso concreto
    che richiede programmi locali (es. aprire file in VS Code, lanciare `git` sul PC).

## Codice da sistemare

- [x] **File T4.3 per US non riconosciuti**: `T4.3-F{nn}-US{nn}.md` ora vale `T4.3-part` anche senza
  `template_origine` (branch `feat/skill-approvati-t43`).
- [ ] **Blocco di Word per il web su elimina/sposta/rinomina**: oggi `Prefer: bypass-shared-lock`
  scavalca il blocco anche con il file aperto, senza avviso. Fare prima la chiamata senza
  intestazione e, sul 423, chiedere conferma e riprovare (`force` nell'MCP, dialog nell'app).
