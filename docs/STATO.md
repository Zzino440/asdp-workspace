# Stato del lavoro

> Diario operativo: dove siamo, cosa è in corso, cosa viene dopo. Va letto all'inizio di ogni
> sessione e aggiornato alla fine di ogni passo (anche a metà di un piano), così chi riprende in
> un'altra chat sa da dove ripartire.
> Architettura e milestone: `docs/ARCHITETTURA.md`. Cose da fare non pianificate: `TODO.md`.
> Rilasci: `CHANGELOG.md`.

**Ultimo aggiornamento**: 2026-11-20 — Lorenzo Belli con Claude Code

## Versione

- `0.1.0` (`package.json`, `CHANGELOG.md`), su `master` dal commit "Add app version and
  changelog". Tag git `0.1.0` su `master`: da fare dopo il merge.

## Milestone

| # | Stato |
|---|---|
| 0, 1, 2a, 2b, 2c | Fatte |
| 2d — server MCP | Quasi fatta: login OAuth, tool `list_projects`, `get_project`, `list_documents`, `read_document`, `list_versions`, `update_document`. Mancano `create_document`, `.mcp.json` nel plugin `asdp`, verifica da Claude Desktop e claude.ai (dopo il deploy di prova) |
| 3 — gate e approvazioni | Da iniziare |

## In corso: deploy di prova su cloud

Ambiente **solo di test**: va spento (pausa) dopo le prove per non consumare risorse, e riacceso
quando serve.

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
- [ ] Progetto di prova nell'app (repo documenti `l.belli/sandbox-test`), Reindicizza.
- [ ] Webhook GitLab della sandbox verso `https://asdp-workspace.vercel.app/api/gitlab/webhook`
  (secret = `GITLAB_WEBHOOK_SECRET`).
- [ ] Prova completa: login, progetto, documenti, modifica, versioni; MCP da Claude Code
  (`claude mcp add --transport http asdp https://asdp-workspace.vercel.app/api/mcp`), da Claude
  Desktop e da claude.ai (connettore personalizzato).
- [ ] `.mcp.json` con l'URL pubblico nel plugin `asdp` (repo `dst-claude-skills`).
- [ ] Spegnere dopo i test: pausa del progetto Supabase e del progetto Vercel.

## Dopo

1. `create_document` (decidere da dove prendere i template: plugin `asdp` o repo
   `dst-claude-skills`).
2. Milestone 3: gate e approvazioni (`submit_for_approval` via MCP).
3. Voci di `TODO.md`.

## Ambienti

| Ambiente | Dettagli |
|---|---|
| Locale | `pnpm dev -p 4100 -H 127.0.0.1`; Supabase locale con Docker (`pnpm exec supabase start`), Mailpit su 54324; utenti di test del seed (`admin@`, `pm@`, `tl@`, `af@`, `nessuno@asdp.test`, password in `supabase/seed.sql`). MCP locale: `asdp` registrato in Claude Code solo per questa cartella (scope local) |
| Cloud di test | Vercel `ds-tech4/asdp-workspace`, Supabase `uirrkpvkrhuvbobthrna` (vedi sopra) |
| GitLab | Istanza https://git.dstech.info, repo di prova `l.belli/sandbox-test` (id 946, branch `main`), documenti sotto `asdp/`. Token del service account in `GITLAB_TOKEN` (`.env.local`, mai in chat) |

## Note e problemi aperti

- Un deploy da push del commit `5e45134` è finito `BLOCKED` ("Vercel Account Unavailable");
  5 minuti dopo un nuovo deploy git dello stesso commit è passato. Causa non chiarita. Se un push
  viene di nuovo bloccato: collegare l'account GitHub all'account Vercel `lbelli-3732`
  (Account Settings → Authentication).
- Le funzioni Vercel girano in `iad1` (USA) e il DB è in `eu-central-2` (Zurigo): ogni richiesta
  fa avanti e indietro sull'Atlantico. Valutare la regione `fra1`.

- Claude Desktop (pannello Server MCP del tab Code) in locale ottiene l'URL di login ma non apre
  il browser, probabilmente perché il server OAuth è su `http://`: da riprovare sul cloud
  (`https`). Claude Code da terminale funziona.
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
