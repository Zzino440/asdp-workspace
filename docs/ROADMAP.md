# Roadmap — priorità

> Lista ordinata delle cose da fare, una alla volta, dalla prima in alto. L'ordine lo decide
> Lorenzo. Quando una voce è fatta **e provata** si spunta (`[x]`) e si sposta in "Fatte" con
> versione e data.
>
> Gli altri file: `docs/STATO.md` dice dove siamo e cosa resta da provare; `TODO.md` raccoglie
> le idee non ancora messe in lista; `docs/ARCHITETTURA.md` §7 ha le milestone.
>
> Lista nata dall'analisi del 2026-11-28 (sicurezza e cloud esclusi).

## Da fare

### 1. [ ] Profilo progetto: Nuovo / Evolutiva

*Milestone 3b. La voce più importante per Lorenzo.*

- **Perché**: oggi tutti i progetti seguono lo stesso percorso completo. Un'evolutiva su un
  prodotto esistente non ha bisogno di tutti i passi di un progetto nuovo e, con 20 passi
  obbligatori, il percorso viene abbandonato.
- **Cosa**: due profili, **Nuovo** (il percorso di oggi) ed **Evolutiva** (un percorso ridotto).
  BugFix sarà il terzo profilo, più avanti.
- **Da decidere col team, prima del codice**: quali passi e documenti salta un'Evolutiva, e
  quali gate cambiano.
- **Dove**:
  - nuova migrazione: profilo su `projects` (default Nuovo) e, nel catalogo `document_types`,
    l'indicazione dei profili a cui vale ogni tipo;
  - scelta del profilo nel wizard (`src/app/(app)/progetti/nuovo/`) e in Impostazioni del
    progetto;
  - passi del Percorso filtrati per profilo in `src/lib/project-steps.ts` (`projectSteps`,
    `nextStep`), così mappa, dashboard e MCP restano allineati;
  - gate per profilo in `src/lib/gates.ts`, se cambiano;
  - `get_project` dell'MCP che espone il profilo (bump di versione e CHANGELOG, come da
    `AGENTS.md`);
  - Guida nell'app (`/guida`) con i due percorsi;
  - test pgTAP sulla nuova colonna e test unitari sul filtro.
- **Fatto quando**: un progetto Evolutiva mostra solo i suoi passi nel Percorso, nella dashboard
  «Tocca a me» e in `get_project`; un progetto Nuovo è uguale a oggi.

### 2. [ ] Provare e unire la pila `feat/`

- **Perché**: quattro versioni (0.25.0–0.28.0) sono su branch non uniti e non provate; ogni
  sviluppo nuovo si impila sopra cose non verificate.
- **Cosa**: checklist «Prova in locale della pila feat/» di `docs/STATO.md`, poi merge in
  `master` e tag `0.25.0`, `0.26.0`, `0.27.0`, `0.28.0`.
- **Fatto quando**: `master` contiene la pila, i tag sono pushati, "Da provare" è più corta.

### 3. [ ] RACI e divergenze Guida ↔ plugin, col team

- **Perché**: bloccano la migrazione dei permessi e rendono la Guida nell'app ambigua.
- **Cosa**: una riunione per decidere RACI di T3.1, T4.1, T1.4 e i punti di `TODO.md`
  ("Framework e permessi"). Può coincidere con la decisione sui passi dell'Evolutiva (voce 1).
- **Fatto quando**: decisioni scritte in `docs/STATO.md` ("Decisioni prese") e migrazione o
  Guida corretta.

### 4. [ ] Notifiche nell'app

- **Perché**: chi deve approvare o correggere un documento lo sa solo se apre la dashboard.
- **Cosa**: campanella nella barra laterale che legge `document_events` (in approvazione,
  approvato, modifiche richieste, D[N] risposte) con lo stato "letto" in una tabella nuova.
  Email come secondo passo; avvisi su Teams solo dopo l'analisi GDPR.
- **Fatto quando**: un «Richiedi modifiche» compare come notifica all'autore, un documento
  Completo all'approvatore.

### 5. [ ] Ponte passo → Claude

*Milestone 2f.*

- **Perché**: PM e AF lavorano in Claude Desktop con il plugin; oggi collegarlo lo sa fare solo
  Lorenzo.
- **Cosa**: pagina «Collega Claude» con le istruzioni passo passo; un prompt MCP per ogni passo
  del Percorso (parte da `next_step` di `get_project` e da `src/lib/prompts.ts`).
- **Fatto quando**: un collega collega Claude da solo e avvia un passo dal prompt.

### 6. [ ] Guscio responsive

- **Perché**: la barra laterale resta larga 240 px anche sul telefono (a 375 px restano circa
  100 px di contenuto); approvare e rispondere alle D[N] sono azioni da telefono.
- **Cosa**: barra laterale a scomparsa sotto `md` e padding più piccolo in
  `src/app/(app)/layout.tsx`.
- **Fatto quando**: dashboard, documento e approvazioni si usano a 375 px.

### 7. [ ] Approvazione assistita da Claude

*Milestone 3, passo 2. Claude prepara, l'approvatore decide.*

- **Cosa**: tool MCP `check_gate` (gate e checklist da `src/lib/gates.ts` più il documento);
  nella finestra Approva l'esito di Claude accanto a ogni voce, da spuntare a mano. Dettagli e
  passi successivi (tool per `changeApproval`, evidenza in Storage) in `TODO.md`.
- **Fatto quando**: un approvatore vede l'esito di Claude voce per voce prima di decidere.

### 8. [ ] Ricerca unica nel progetto

- **Cosa**: casella nell'intestazione del progetto che cerca titolo, codice e percorso dei
  documenti nell'indice Supabase; i file Teams in un secondo momento.
- **Fatto quando**: si trova un documento per codice o titolo senza aprire il Percorso.

### 9. [ ] Descrizione e date nell'intestazione del progetto

- **Cosa**: mostrare i dati di `project_details` (già in `get_project` dell'MCP) in testa al
  progetto. Lavoro piccolo.

### 10. [ ] Toast di conferma in tutte le schermate

- **Cosa**: oggi i toast (`sonner`) ci sono solo nella pagina del documento; le altre schermate
  mostrano un testo accanto ai pulsanti. Uniformare.

### 11. [ ] Riquadri D[N] e "Da chiarire" anche in modifica

- **Cosa**: plugin di decorazioni ProseMirror che riusa `questionsOf`, senza toccare il Markdown
  salvato. **Solo se** la prova della pagina del documento conferma che serve.

### 12. [ ] Tipi Supabase generati

- **Perché**: oggi le query non sono tipizzate; una migrazione può rompere una query senza che
  `tsc` se ne accorga.
- **Cosa**: `supabase gen types` → tipo `Database` nei client di `src/lib/supabase/`, controllo in
  CI.

### 13. [ ] Test end-to-end minimi

- **Perché**: la lista "Da provare" di `docs/STATO.md` è lunga e tutta a mano.
- **Cosa**: 3–4 test Playwright sui flussi principali (accesso, apri e salva un documento,
  approva) con gli utenti del seed.

### 14. [ ] pgTAP indipendenti dai dati locali

- **Cosa**: oggi 7 test falliscono per i conteggi se ci sono dati oltre il seed. Conteggi
  filtrati sugli id del seed, così il risultato vale senza `db reset`.

### 15. [ ] Reindicizzazione più leggera

- **Cosa**: dal webhook aggiornare solo i file cambiati invece di tutta la repo.

## Rimandate di proposito

- Restyling generale, app desktop (Electron), PWA: dopo le priorità funzionali.
- Teams per altri utenti, avvisi nel canale, D[N] al cliente: dopo l'analisi GDPR per l'IT
  (`TODO.md`, "File di progetto da Teams").

## Fatte

_(ancora nessuna)_
