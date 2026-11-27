Un documento ASDP cambia più volte prima di essere approvato. Per aggiornarlo non si riparte da zero: si rilancia la stessa skill sul documento che esiste già. La skill entra in **modalità aggiornamento** (update mode): legge il documento com'è, con le tue modifiche, e cambia solo quello che serve.

## Quando serve

- Hai risposto ad alcune [domande D[N]](/guida/domande-aperte).
- È arrivato materiale nuovo: per esempio le note del workshop sui requisiti non funzionali, che vanno nei Requisiti Consolidati.
- È cambiato un documento a monte: un nuovo consolidato richiede di aggiornare l'Analisi Funzionale, una nuova Analisi Funzionale il backlog.
- Vuoi una correzione precisa e la chiedi in chat: "togli l'export", "sposta il caso d'uso F01-UC03 nella F02".

## Come lanciarlo

Indica a Claude il documento da aggiornare e cosa è cambiato. Se il documento è nell'app, Claude lo legge dal connettore nella versione più recente.

> Nel progetto ABC aggiorna l'Analisi Funzionale: i Requisiti Consolidati sono passati alla versione 0.3.

> Aggiorna il Risk Register del progetto ABC con la nuova Feature F05.

## Cosa fa la skill

- **Parte dal testo attuale.** Le modifiche fatte a mano restano, salvo quelle che il cambio rende incoerenti: la skill le elenca nel riepilogo finale.
- **Tiene fermi gli ID.** Requisiti, domande, casi d'uso, rischi, User Story e task mantengono il loro numero. Un elemento tolto viene ritirato con una traccia e il suo numero non si riusa.
- **Di norma aumenta la versione** del documento e annota cosa è cambiato, comprese le indicazioni date in chat.
- **Azzera l'approvazione.** Una nuova versione non è ancora approvata: lo stato torna a **In corso** e i dati di approvazione si svuotano, anche se la versione precedente era Approvata.
- **Rispetta i gate già superati** della Fase 4:
  - backlog dopo il gate G1: il CSV resta com'è, le variazioni diventano proposte da approvare;
  - Piano di lavoro dopo il G2 e Task + Scaffold dopo il G3: il documento è congelato. Una nuova versione si fa solo se la chiedi esplicitamente, e il gate va rifatto.

Nell'Analisi Funzionale il gate A si ripete solo se il cambio tocca la struttura, per esempio se aggiunge o toglie Feature.

## Come salvare la revisione

La revisione va sempre **sullo stesso file**: il nome del file non contiene la versione, che sta solo nel frontespizio. Le versioni precedenti restano in **Cronologia**, dove puoi aprirle e confrontarle.

**Con l'app** Claude salva l'aggiornamento sullo stesso documento e porta la versione da vX.Y a vX.Y+1, senza chiedere nulla.

**Con i file sul tuo computer** la skill chiede solo se alzare la versione:

| Opzione | Cosa fa |
|---|---|
| Sovrascrivi e incrementa | Sostituisce il file e porta la versione a vX.Y+1 |
| Stesso file, stessa versione | Sostituisce il file senza cambiare versione (correzione minore); nella Fase 4 solo prima del gate |

## Attenzione alle modifiche manuali

- **Una persona alla volta.** Se qualcuno salva il documento mentre Claude lo aggiorna, il salvataggio di Claude viene rifiutato ("il documento è cambiato dopo l'ultima lettura"). Chiedi a Claude di rileggerlo e riapplicare le modifiche: nessuno perde il proprio lavoro.
- **Copie locali.** In Claude Code lavora sul documento letto dall'app, non su una copia vecchia nella cartella: perderesti le modifiche fatte nel frattempo.
- **I requisiti si cambiano solo nel consolidato.** Una modifica a un requisito fatta a mano nell'Analisi Funzionale non regge: la skill ti rimanda ai Requisiti Consolidati.
- **Il CSV del backlog non si riordina** e un ID di User Story non si riassegna: è la chiave verso iceScrum.

> **Attenzione:** se il testo di un documento Approvato cambia, l'app lo riporta da sola a In corso e svuota l'approvazione. Un salvataggio che cambia a mano lo stato o i dati di approvazione riesce invece solo a chi ha il permesso di approvare quel documento: prima di aggiornare un documento approvato, parlane con chi lo approva. Vedi [Stati e frontespizio](/guida/stati).
