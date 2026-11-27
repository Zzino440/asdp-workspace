# TODO — ASDP Workspace

Cose da fare non ancora pianificate in una milestone. Spostarle in `docs/ARCHITETTURA.md` (§7 o
§8) quando vengono prese in carico.

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
- [ ] Gruppo di test `asdp-sandbox/psw` (progetto PSW nel DB locale) creato nelle prove di
  0.12.0: eliminarlo da GitLab quando non serve più.

## Framework e permessi

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
- [ ] **Dashboard «Tocca a me»** (milestone 3b). Confine con Approvazioni: Approvazioni tiene solo
  le decisioni di gate (da approvare, approvati); la Dashboard è la panoramica personale:
  - i miei documenti Completo in attesa di altri (e di chi);
  - i documenti rimandati a me con il motivo (serve un campo nell'indice: oggi il motivo è solo
    nel commit);
  - scadenze vicine o passate, avanzamento dei miei progetti per fase;
  - solo un contatore «N da approvare» con link ad Approvazioni (`listToApprove`), senza ripetere
    la coda.
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
- [ ] **Pubblica approvati** nella cartella collegata (milestone 6), copia DOCX/PDF con la versione
  nel nome. Come sopra.
- [ ] **Evidenza dell'approvazione del PO scelta da SharePoint**: un link da solo è debole (il file
  cambia o sparisce); serve una versione fissa del file o una copia in Storage. Da decidere col
  team. Con «Sostituisci» / «Carica nuova versione» (`0.15.0`) succede più spesso: stesso link,
  contenuto nuovo. Vale anche per la tracciabilità qui sopra.
- [ ] **7c, file come input delle skill**: opzione economica `get_project` che restituisce le
  cartelle collegate (Claude Desktop le legge col connettore M365); opzione completa tool MCP
  `list_project_files` / `read_project_file`. Bloccata dalla DPIA (dati dei clienti verso
  Anthropic).
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
