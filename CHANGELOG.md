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
