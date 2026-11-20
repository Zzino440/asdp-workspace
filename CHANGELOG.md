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
