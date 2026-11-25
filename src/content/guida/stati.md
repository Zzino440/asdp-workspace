Ogni documento ASDP ha uno **stato** che dice a che punto è, e un **frontespizio**: un blocco di dati in testa al file con identità, date, responsabilità e approvazione. L'app legge il frontespizio per mostrare stato, owner e scadenze nella mappa e nella pagina del documento.

## I quattro stati

| Stato | Cosa vuol dire | Chi lo mette |
|---|---|---|
| **Da fare** | Il documento è previsto ma nessuno ci lavora ancora | L'autore |
| **In corso** | Il documento è in lavorazione | L'autore. Le skill lasciano sempre In corso |
| **Completo** | Per l'autore il documento è finito e si può rivedere | L'autore |
| **Approvato** | Chi ne ha l'autorità l'ha approvato | Solo l'approvatore |

Claude non approva mai: al massimo propone Completo. L'approvatore giusto per ogni documento è in [Ruoli e approvazioni](/guida/ruoli).

Nell'app lo stato si cambia da **Tutti i dettagli**, se hai il permesso Modifica. Lì trovi Da fare, In corso e Completo. Approvato non si sceglie da quella finestra: arriverà con il flusso di approvazione.

## Il frontespizio

Il frontespizio vive dentro il file del documento, quindi stato e approvazione viaggiano con il documento anche fuori dall'app. Nella finestra **Tutti i dettagli** i campi sono divisi in cinque gruppi.

### Stato e date

- **Stato**: uno dei quattro stati.
- **Scadenza**: entro quando il documento deve essere pronto. La fissa il PM.
- **Creato il** e **Completato il**: le date reali. Confrontare scadenza e completamento mostra i ritardi.

### Responsabilità

- **Autore**: chi scrive il documento.
- **Ruolo owner**: il ruolo responsabile, per esempio AF o TL.
- **Versione**: la versione di questo documento (v0.1, v0.2…). Sale a ogni revisione.

### Approvazione

Resta vuoto finché il documento non è Approvato.

- **Approvato da**: nome e ruolo di chi ha approvato.
- **Approvato il**: la data.
- **Versione approvata**: quale versione è stata approvata.
- **Gate**: il punto di controllo superato, per esempio G1 (vedi [Gate](/guida/gate)).
- **Evidenza approvazione**: la prova, per esempio il riferimento al commit o alla firma del cliente.

### Identità

- **Titolo**, **Progetto**, **Cliente**.
- **ID** e **Documento padre**: identificano il documento e l'elemento a cui appartiene, per esempio una Feature dentro un'epica.
- **Fase ASDP**: la fase in cui nasce.
- **Natura intervento**: Greenfield (sistema nuovo) o Evolutiva (modifica di un sistema esistente).
- **Riferimento richiesta**: il ticket, l'email o il verbale da cui nasce.
- **Tipo backlog**, **Urgenza**, **Dimensione (giorni)**, **Story point**: solo per i documenti legati al backlog. Giorni e story point non si usano insieme: i giorni valgono per Feature ed epiche, gli story point solo per le User Story.
- **Elementi collegati**: i documenti o elementi da cui dipende, indicati per ID.

### Dati tecnici

**Versione frontespizio**, **Template di origine** e **Versione template** dicono da quale modello nasce il documento. Non si toccano a mano.

> **Nota:** le chiavi e i valori del frontespizio sono sempre in italiano, anche se il documento è scritto in un'altra lingua. L'app e gli strumenti del framework li leggono così.

## Dove si vedono nell'app

- **Sotto il titolo** del documento: Stato, Owner, Scadenza (in rosso se è passata) e Approvazione ("Da approvare" finché manca). Sotto, la versione e la data dell'ultimo aggiornamento.
- **Tutti i dettagli**: il pulsante accanto apre il frontespizio completo, diviso per gruppi. Ha un salvataggio suo, che cambia solo i dati e lascia il testo identico.
- **Nella mappa del progetto**: lo stato di ogni documento.

Alcuni campi sono in sola lettura: Versione frontespizio, Approvato da, Approvato il, Versione approvata, Evidenza approvazione, e lo Stato quando è Approvato. Tutta la finestra è in sola lettura se non hai il permesso Modifica, o mentre stai modificando il testo.

## Modificare un documento approvato

La regola del framework: **modificare un documento approvato invalida l'approvazione**. Lo stato torna a In corso, il blocco Approvazione si svuota e la versione sale. Poi il documento va riapprovato.

Le skill lo fanno da sole quando le rilanci in [aggiornamento](/guida/aggiornare-documento).

> **Attenzione:** oggi l'app non applica ancora questa regola in automatico. Se modifichi il testo di un documento Approvato, resta Approvato. Il salvataggio che toglie lo stato Approvato o cambia i dati di approvazione riesce solo a chi ha il permesso Approva su quel documento. Prima di modificare un documento approvato, parlane con chi lo approva.

Il ritorno automatico a In corso arriverà con il flusso di approvazione nell'app.
