ASDP Workspace è il posto dove vivono i documenti ASDP dei tuoi progetti. Qui li trovi, li leggi, li modifichi e vedi a che punto è ogni fase. Questa pagina spiega le schermate principali e cosa l'app fa oggi.

## Dashboard

È la prima pagina dopo l'accesso e risponde a una domanda: cosa tocca a me? Raccoglie i progetti aperti di cui fai parte:

- **Tocca a te**: i documenti per cui ti hanno chiesto modifiche, con chi l'ha chiesto e il motivo, e i progetti in cui il prossimo passo spetta a un tuo ruolo.
- **In attesa di altri**: i tuoi documenti Completo che aspettano l'approvazione, con chi li approva.
- **Scadenze**: i tuoi documenti non ancora pronti con la scadenza passata o nei prossimi 7 giorni.
- **I tuoi progetti**: fase attuale, documenti pronti nella fase, prossimo passo e a chi tocca.

Un documento è "tuo" quando il tuo ruolo nel progetto può modificarne il tipo (se nessun ruolo può modificarlo, vale chi lo approva). È la stessa regola di «Tocca a te» nel Prossimo passo. Se qualcosa ti aspetta in Approvazioni, in alto c'è un avviso con il numero e il link.

## Elenco progetti

La pagina **Progetti** mostra solo i progetti di cui fai parte, con cliente, natura, stato, fase e versione del framework. Se non vedi un progetto, chiedi al PM di aggiungerti al team.

Solo l'amministratore crea un progetto nuovo.

## Creare e preparare un progetto

**Nuovo progetto** è una procedura in quattro passi. Si va avanti con **Avanti** e si torna a un passo già visto cliccandolo in alto:

1. **Progetto**: nome, codice, cliente e natura (Greenfield o Evolutiva); se vuoi anche una breve descrizione e le date di inizio e fine previste.
2. **Repository**: come avere la repo documenti e le repo di codice.
   - **Crea su GitLab**: l'app crea un gruppo per il progetto con la repo documenti `adsp`. È la scelta normale per un progetto nuovo.
   - **Collega una repo esistente**: per un'evolutiva o quando i documenti stanno già in una repo.
   - Per frontend e backend scegli **Nessuna**, **Nuova vuota** (solo con Crea su GitLab) oppure **Esistente**, indicando il percorso GitLab.
3. **Persone e Teams**: il PM e il TL del progetto e, dove disponibile, il Team in cui creare il canale del progetto. Puoi anche lasciare tutto per dopo.
4. **Riepilogo**: controlli le scelte, le correggi con **Modifica** e crei il progetto.

Se un passo non riesce, ad esempio GitLab o Teams non rispondono, il progetto viene creato lo stesso e un avviso dice cosa manca.

Nella pagina del progetto, a destra del percorso, compare poi **Area di lavoro**, visibile all'amministratore e al PM. Elenca solo i passi che mancano, ognuno con il link al posto dove si fa: repo, canale Teams (dove disponibile), PM e TL, primo passo del percorso (il Kickoff). Ogni passo si può rifare senza creare doppioni. Quando è tutto pronto sparisce.

Il canale Teams si crea in un Team che esiste già, con le cartelle Input cliente, Verbali e trascrizioni, Governance e Consegne. I documenti ASDP restano su GitLab. Subito dopo l'app propone come team del progetto i membri del Team che hanno un account nell'app. Gli altri li invita l'amministratore da Amministratore → Utenti.

## Pagina del progetto

Sotto il nome del progetto ci sono tre schede:

- **Percorso**: la mappa dei documenti al centro; a destra l'area di lavoro, il team e i collegamenti (repo su GitLab, cartelle Teams, come collegare Claude).
- **File**: i file della cartella Teams del progetto, dove disponibile.
- **Impostazioni** (amministratore e PM): dati del progetto, team, repository e cartelle Teams.

Il **Percorso** è la mappa dei documenti del progetto.

### Prossimo passo

In alto c'è il riquadro **Prossimo passo**: il primo documento non ancora pronto, a partire dalla fase attuale del progetto. Può dire due cose:

- **Crea** un documento che non esiste ancora: **Copia prompt per Claude** copia una richiesta pronta (progetto, skill, documenti da leggere dal connettore) da incollare in Claude con il plugin `asdp`.
- **Completa** un documento che esiste ma non è ancora Completo: **Apri documento**, oppure **Copia prompt** per farlo completare a Claude.

Se documenti di fasi precedenti non sono pronti, sotto il riquadro compare un avviso: cliccalo per aprire la prima fase con documenti da finire.

### Le fasi

Sotto ci sono tutte e cinque le fasi, una sotto l'altra. Ogni fase mostra quanti documenti sono pronti su quelli attesi, per esempio "2/3". Un documento è pronto quando è **Completo** o **Approvato** (vedi [Stati e frontespizio](/guida/stati)). **attuale** indica dove si trova il progetto; un segno di spunta indica una fase completa.

Le fasi complete sono chiuse, con un pallino colorato per lo stato di ogni documento; le altre sono aperte. Clicca il nome di una fase per aprirla o chiuderla.

Per ogni tipo di documento della fase vedi il documento, con versione e stato, se esiste; se manca, la skill da usare e **Copia prompt**.

Nella [Fase 4](/guida/fase-4) l'Analisi Tecnica, il Piano di lavoro e i Task + Scaffold sono raggruppati per Feature.

### Ricerca e altri file

La casella **Cerca un documento** filtra per nome, codice o titolo; premi **/** per andarci subito. **Reindicizza da GitLab** è il pulsante in alto a destra, accanto al nome del progetto. In fondo, **Altri file nella cartella del progetto** raccoglie i file che non corrispondono a un tipo di documento ASDP.

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

La voce **Approvazioni** del menu, con il numero dei documenti che ti aspettano, raccoglie quelli da approvare divisi per progetto, con filtri, e quelli approvati negli ultimi 30 giorni. Dettagli in [Gate](/guida/gate).

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
