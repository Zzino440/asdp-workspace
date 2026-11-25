Claude lavora sui progetti ASDP attraverso un **connettore** dell'app: un server MCP che gli permette di leggere i progetti e di leggere e salvare i documenti, con i tuoi permessi. Per lanciare le skill serve anche il plugin `asdp`. Questa pagina spiega i due modi per collegarti.

## Quale percorso scegliere

| Percorso | Per chi | Cosa serve |
|---|---|---|
| **A. claude.ai o Claude Desktop** | PM, AF, designer, chiunque | Solo il browser o l'app desktop, niente installazioni |
| **B. Claude Code** | TL, sviluppatori | Claude Code, il plugin `asdp` e il server MCP |

In entrambi i casi ti servono un account dell'app ASDP Workspace e l'indirizzo dell'app (chiedilo all'amministratore). L'indirizzo del server MCP è sempre:

```text
<indirizzo dell'app>/api/mcp
```

## Percorso A: claude.ai o Claude Desktop

1. In claude.ai o in Claude Desktop apri le impostazioni dei **connettori** e scegli di aggiungere un **connettore personalizzato**.
2. Dagli un nome riconoscibile, per esempio "ASDP Workspace", e incolla l'indirizzo del server MCP.
3. Avvia la connessione. Si apre la pagina di accesso dell'app: entra con il tuo account.
4. Nella pagina di consenso controlla che sia la tua app e scegli **Consenti**.
5. Torna in Claude: il connettore risulta collegato. In una nuova chat controlla che sia attivo.

> **Nota:** se non trovi l'opzione per aggiungere un connettore personalizzato, il tuo piano Claude o le impostazioni dell'organizzazione potrebbero non consentirlo. Chiedi all'amministratore Claude.

Con il solo connettore puoi interrogare lo stato dei progetti e leggere e aggiornare i documenti. Per **lanciare le skill** serve anche il plugin `asdp`: in Claude Desktop lo pubblica per tutti l'amministratore Claude dell'organizzazione. Non installarlo da copie passate a mano, altrimenti non ricevi gli aggiornamenti.

## Percorso B: Claude Code

1. Aggiungi una volta la marketplace delle skill DST:

   ```text
   /plugin marketplace add https://git.dstech.info/aiaiai/dst-claude-skills.git
   ```

2. Installa il plugin con le skill del framework:

   ```text
   /plugin install asdp@dst-claude-skills
   ```

   Se vuoi anche il comando "cosa faccio adesso?" (`/asdp-project:metodo`), installa pure `asdp-project@dst-claude-skills`.

3. Dal terminale registra il server MCP dell'app:

   ```text
   claude mcp add --transport http asdp <indirizzo dell'app>/api/mcp
   ```

4. In Claude Code scrivi `/mcp`, scegli `asdp` e poi **Authenticate**. Entra con il tuo account dell'app e scegli **Consenti**.
5. Apri Claude Code nella cartella del codice del progetto: le skill tecniche leggono il codice in locale e i documenti dall'app.

> **Attenzione:** alcune versioni del plugin `asdp` portano già con sé il server dell'app, che in `/mcp` compare come `asdp-workspace`. In quel caso salta il passo 3 e autentica quello: due server uguali danno strumenti doppi.

## Verifica che funziona

Scrivi a Claude:

> Elenca i miei progetti ASDP.

Claude risponde con i progetti a cui hai accesso, ognuno con il suo codice. Poi prova:

> Mostrami i documenti del progetto ABC e il loro stato.

Se vedi l'elenco, sei collegato.

## Cosa può fare Claude con il connettore

- Elencare i tuoi progetti e mostrare team, ruoli, documenti e il tuo livello di permesso su ogni tipo di documento.
- Leggere un documento e il suo storico delle versioni.
- Salvare le modifiche a un documento esistente.

Claude agisce **sempre come te**: vede e modifica solo quello che puoi vedere e modificare nell'app. Ogni salvataggio è un commit a tuo nome, visibile nella **Cronologia** del documento con il canale "MCP".

> **Nota:** la creazione di documenti nuovi dal connettore è in arrivo. Oggi una skill che produce un documento nuovo lo salva come file (Claude Code) o te lo restituisce in chat. Va poi aggiunto alla repo documenti del progetto da chi ha accesso a GitLab: l'app lo indicizza da sola.

## Problemi comuni

| Problema | Cosa fare |
|---|---|
| Claude non vede nessun progetto | Non fai parte del team del progetto: chiedi al PM o all'amministratore di aggiungerti. |
| "Non ha il permesso di modificare questo tipo di documento" | Il tuo ruolo nel progetto ha solo la lettura su quel documento. Vedi [Ruoli e approvazioni](/guida/ruoli). |
| "Il documento è cambiato dopo l'ultima lettura" | Qualcuno l'ha salvato nel frattempo. Chiedi a Claude di rileggerlo e riapplicare le modifiche. |
| "Solo un approvatore può cambiare lo stato Approvato" | Il salvataggio toccava lo stato o i dati di approvazione. Vedi [Stati e frontespizio](/guida/stati). |
| Il login non si apre o la sessione è scaduta | Ricollega il connettore; in Claude Code `/mcp` → **Authenticate**. |
| Ogni strumento compare due volte | Il server è registrato due volte: tienine uno solo. |
