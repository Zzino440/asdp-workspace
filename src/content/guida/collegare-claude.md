Claude lavora sui progetti ASDP con due cose che arrivano insieme nel plugin `asdp`: le **skill**, che producono i documenti del framework, e il **connettore** dell'app, un server MCP che gli permette di leggere i progetti e di leggere, creare e salvare i documenti con i tuoi permessi. Questa pagina spiega come collegarti.

## Quale percorso scegliere

| Percorso | Per chi | Cosa serve |
|---|---|---|
| **A. Claude Desktop** (Cowork o chat) | PM, AF, designer, chiunque | Claude Desktop con il plugin `asdp` |
| **B. Claude Code** | TL, sviluppatori | Claude Code con il plugin `asdp` |

In entrambi i casi ti serve un account dell'app ASDP Workspace (chiedilo all'amministratore).

## Percorso A: Claude Desktop

1. Il plugin `asdp` lo pubblica per tutti l'amministratore Claude dell'organizzazione: in Claude Desktop controlla che sia installato e attivo. Non installarlo da copie passate a mano, altrimenti non ricevi gli aggiornamenti.
2. Il plugin porta con sé il connettore, che compare come `asdp-workspace`. Al primo uso Claude ti chiede di collegarlo: si apre la pagina di accesso dell'app, entra con il tuo account.
3. Nella pagina di consenso controlla che sia la tua app e scegli **Consenti**.
4. Torna in Claude: il connettore risulta collegato. In una nuova chat o attività di Cowork controlla che sia attivo.

> **Nota:** se nella chat il connettore `asdp-workspace` non compare, aggiungilo a mano dalle impostazioni dei **connettori** come **connettore personalizzato**, con l'indirizzo `<indirizzo dell'app>/api/mcp`. Se l'opzione manca, chiedi all'amministratore Claude.

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
- Creare un documento nuovo e salvare le modifiche a uno esistente.

Claude agisce **sempre come te**: vede e modifica solo quello che puoi vedere e modificare nell'app. Ogni salvataggio è un commit a tuo nome, visibile nella **Cronologia** del documento con il canale "MCP".

Quando il connettore è collegato, di norma le skill salvano lì e il documento finisce nell'app. Se vuoi lavorare sui file, chiedi di salvare in locale. Se la cartella è un clone della repo documenti, la skill salva in locale da sola. Dopo il push l'app indicizza il file. Dal connettore non si cancellano file.

## Problemi comuni

| Problema | Cosa fare |
|---|---|
| Claude non vede nessun progetto | Non fai parte del team del progetto: chiedi al PM o all'amministratore di aggiungerti. |
| "Non ha il permesso di modificare questo tipo di documento" | Il tuo ruolo nel progetto ha solo la lettura su quel documento. Vedi [Ruoli e approvazioni](/guida/ruoli). |
| "Il documento è cambiato dopo l'ultima lettura" | Qualcuno l'ha salvato nel frattempo. Chiedi a Claude di rileggerlo e riapplicare le modifiche. |
| "Solo un approvatore può cambiare lo stato Approvato" | Il salvataggio toccava lo stato o i dati di approvazione. Vedi [Stati e frontespizio](/guida/stati). |
| Il login non si apre o la sessione è scaduta | Ricollega il connettore; in Claude Code `/mcp` → **Authenticate**. |
| Ogni strumento compare due volte | Il server è registrato due volte: tienine uno solo. |
