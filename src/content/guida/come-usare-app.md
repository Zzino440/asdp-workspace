ASDP Workspace è il posto dove vivono i documenti ASDP dei tuoi progetti. Qui li trovi, li leggi, li modifichi e vedi a che punto è ogni fase. Questa pagina spiega le schermate principali e cosa l'app fa oggi.

## Elenco progetti

La pagina **Progetti** mostra solo i progetti di cui fai parte, con cliente, natura, stato, fase e versione del framework. Se non vedi un progetto, chiedi al PM di aggiungerti al team.

Solo l'amministratore crea un progetto nuovo.

## Pagina del progetto

Si apre con il **Percorso ASDP**, la mappa dei documenti del progetto.

### Prossimo passo

In alto c'è il riquadro **Prossimo passo**: il primo documento non ancora pronto, a partire dalla fase attuale del progetto. Può dire due cose:

- **Crea** un documento che non esiste ancora, con il nome della skill che lo genera (per esempio `/asdp:t1-4-functional-analysis`).
- **Completa** un documento che esiste ma non è ancora Completo, con il pulsante **Apri documento**.

Se documenti di fasi precedenti non sono pronti, sotto il riquadro compare un avviso con il loro numero.

### Barra delle fasi

Sotto ci sono le cinque fasi. Ogni fase mostra quanti documenti sono pronti su quelli attesi, per esempio "2 di 3 pronti". Un documento è pronto quando è **Completo** o **Approvato** (vedi [Stati e frontespizio](/guida/stati)). L'etichetta **Fase attuale** indica dove si trova il progetto; un segno di spunta indica una fase completa.

Clicca una fase per vederne i documenti.

### Documenti di una fase

Per ogni tipo di documento della fase vedi:

- il documento, con versione e stato, se esiste;
- un riquadro tratteggiato **Non ancora creato**, con la skill da usare, se manca.

Nella [Fase 4](/guida/fase-4) l'Analisi Tecnica, il Piano di lavoro e i Task + Scaffold sono raggruppati per Feature.

### Ricerca e altri file

La casella **Cerca un documento** filtra per nome, codice o titolo. In fondo, **Altri file nella cartella del progetto** raccoglie i file che non corrispondono a un tipo di documento ASDP.

### Dati del progetto, team e repository

Sotto la mappa trovi i dati del progetto, il **Team** con i ruoli di ogni persona e le **Repository di codice** collegate (backend, frontend, altro). Le repository servono alle skill che leggono il codice. Team e repository li gestiscono il PM e l'amministratore.

## Pagina del documento

### Lettura

Sotto il titolo vedi i dati chiave: **Stato**, **Owner**, **Scadenza** (in rosso se scaduta) e **Approvazione**. A destra, **In questa pagina** elenca le sezioni del documento; a sinistra, sugli schermi larghi, c'è l'elenco degli altri documenti del progetto.

### Modifica del testo

**Modifica testo** apre un editor visuale nella stessa pagina. Scrivi una nota sulla modifica (facoltativa) e premi **Salva**: ogni salvataggio crea una nuova versione.

Le modifiche non salvate restano nel browser come bozza. Se nel frattempo qualcuno ha salvato una versione nuova, l'app non sovrascrive il suo lavoro: ti mostra le tue modifiche accanto alla versione nuova, da riportare dove servono.

### Tutti i dettagli

**Tutti i dettagli** apre i dati del frontespizio, divisi per tema: stato e date, responsabilità, approvazione, identità. Da qui cambi lo stato tra **Da fare**, **In corso** e **Completo**; chi ha il permesso Approva sceglie anche **Approvato** e compila i dati di approvazione. Il salvataggio crea una versione nuova senza toccare il testo.

### Approvazione

Accanto a **Tutti i dettagli** trovi i pulsanti del flusso di approvazione: **Segna come completo** per chi scrive, **Approva** e **Richiedi modifiche** per chi approva un documento Completo, **Revoca approvazione** su un documento Approvato. Come funziona: [Gate](/guida/gate).

### Cronologia

**Cronologia** elenca le versioni del documento con autore, data e canale (app, Claude o Git). Per ogni versione vedi cosa è cambiato rispetto alla precedente.

## Cosa fa l'app e cosa no

L'app conserva i documenti, le versioni e lo stato. **Le skill non partono dall'app**: si lanciano da Claude. Collegato all'app, Claude può leggere i documenti del progetto da usare come input e salvare quelli che produce.

- Per collegare Claude: [Collegare Claude](/guida/collegare-claude).
- Per usare una skill: [Lanciare una skill](/guida/lanciare-skill).

La voce **Approvazioni** del menu raccoglie i documenti Completo che puoi approvare, in tutti i tuoi progetti.

> **Nota:** la **Dashboard** è in arrivo.

## Permessi per ruolo

Tutti i membri del team vedono tutti i documenti del progetto. Chi può modificare e approvare dipende dal ruolo. Questi sono i permessi predefiniti del framework; l'amministratore può cambiarli.

| Documenti | Modifica | Approva |
|---|---|---|
| [Kickoff Pack](/guida/t0-1a), [Verbale Kickoff](/guida/t0-1) | TL | PM |
| [Requisiti Consolidati](/guida/p1-3), [Analisi Funzionale](/guida/t1-4) | AF | PM |
| [Architettura](/guida/t2-2), [Contesto Tecnico](/guida/t2-4) | — | TL |
| [Risk Register](/guida/t3-1) | TL | PM |
| [Backlog](/guida/t4-1) | AF, TL | PM |
| [Analisi Tecnica](/guida/t4-2), [Piano di lavoro](/guida/t4-3-index), [Task + Scaffold](/guida/t4-3-part) | — | TL |

Chi può approvare può anche modificare. Se hai più ruoli nel progetto, valgono tutti i permessi insieme.

> **Attenzione:** solo chi ha il permesso di approvare può impostare o togliere lo stato Approvato e i dati di approvazione, anche quando salva da Claude.
