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

## Sicurezza

- [ ] **Permessi di esecuzione delle funzioni `SECURITY DEFINER`** (segnalato dall'advisor di
  sicurezza di Supabase sul progetto cloud, 2026-11-20). Nuova migrazione che:
  - toglie `EXECUTE` a `public` e `anon` sulle funzioni helper della RLS (`is_admin`,
    `is_project_member`, `has_project_role`, `shares_project_with`, `is_any_project_pm`,
    `document_level`), lasciandolo ad `authenticated` perché le policy le usano;
  - toglie `EXECUTE` a `public`, `anon` e `authenticated` sulle funzioni di trigger
    (`handle_new_user`, `handle_user_invited`, `handle_user_sign_in`, `sync_user_ban`);
  - non tocca `rls_auto_enable`, che è di Supabase.

  Verifica: `pnpm exec supabase test db` verde, advisor senza i due avvisi per le nostre funzioni.

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
- [ ] **Approvazione assistita da AI e MCP** (milestone 3, passo 2; il flusso manuale c'è da
  0.6.0). Claude non approva mai: prepara, l'approvatore decide.
  - tool MCP `check_gate`: restituisce gate, checklist (`src/lib/gates.ts`) e documento, perché
    Claude prepari un esito voce per voce con le prove trovate nel testo;
  - tool MCP per i passi del flusso (`changeApproval`: complete, request_changes, approve, revoke),
    con `approve` solo per chi ha "approve" e dopo conferma esplicita dell'utente in chat;
  - nella finestra Approva: esito di Claude accanto a ogni voce della checklist, da spuntare a mano;
  - approvazione del cliente (T1.4) con upload dell'evidenza in Storage invece del testo libero.
- [ ] **Coda delle approvazioni** (pagina `/approvazioni`, oggi segnaposto): documenti Completo
  dove l'utente ha "approve", con link diretto al documento.
