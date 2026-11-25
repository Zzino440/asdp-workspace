La Fase 0 trasforma un contratto firmato in un progetto che può partire. Il cuore è il kickoff con il cliente: non una presentazione, ma una sessione di lavoro da cui si esce con date, persone e impegni precisi.

## Obiettivo

Allineare team e cliente e ottenere tutto ciò che serve per avviare l'[Analisi](/guida/fase-1) senza ritardi. La regola guida è semplice: **un kickoff senza date confermate per i workshop successivi non è un kickoff completato**.

## Chi è coinvolto

| Ruolo | Cosa fa |
|---|---|
| PM | Responsabile della fase: prepara, facilita il kickoff, scrive e distribuisce il verbale |
| TL | Porta le questioni tecniche, avvia le richieste di accesso, individua vincoli tecnici |
| AF | Partecipa per capire il contesto funzionale e prepara il primo workshop di analisi |
| Cliente (sponsor, PO) | Conferma partecipanti e date, si impegna sulle risorse |

## I passi

### 1. Preparare il kickoff

Il PM raccoglie i documenti di pre-vendita (richiesta del cliente, offerta, contratto, email) e le sue note, poi genera il [Kickoff Pack](/guida/t0-1a) con la skill `/asdp:t0-1-kickoff` in modalità preparazione. Il pack è interno e segue l'ordine dell'agenda, quindi fa anche da agenda.

### 2. Fare il kickoff

Si conduce la riunione con la registrazione attiva, per avere la trascrizione. Il punto da non saltare è la **pianificazione dei workshop**.

### 3. Scrivere il verbale

Entro 24 ore il PM genera il [Verbale Kickoff](/guida/t0-1) con la stessa skill, in modalità verbale, dalla trascrizione e dal pack. Il verbale va al cliente e contiene solo ciò che è stato detto e deciso: date, nomi, decisioni, azioni.

In chiusura la skill controlla che il kickoff abbia prodotto cinque cose:

- la data del primo workshop di analisi (L1);
- i partecipanti al workshop L1, con nome e cognome;
- il referente IT del cliente;
- una timeline di progetto condivisa;
- l'impegno dello sponsor.

Se ne manca una, il kickoff non è chiuso: la skill dice cosa chiedere e a chi entro 48 ore.

> **Nota:** la Guida del framework prevede in questa fase anche il Project Charter e un documento di pilastri e vincoli architetturali. Con le skill non sono documenti separati: obiettivi, criteri di successo, timeline, vincoli e contesto tecnico stanno nel pack e nel verbale. Stack e pilastri tecnici si decidono nell'[Architettura](/guida/t2-2), i rischi nel [Risk Register](/guida/t3-1).

## La fase è chiusa quando…

Dalla checklist del framework:

- [ ] Kickoff effettuato
- [ ] Project Charter approvato
- [ ] Ambiente AI configurato
- [ ] Contesto tecnico di progetto (pilastri e vincoli) compilato
- [ ] Repository creato

Con le skill, Charter e contesto tecnico coincidono con il pack e il verbale. Il verbale distribuito dal PM è il punto di controllo della fase. Vedi anche [Gate](/guida/gate).

## Errori tipici

| Errore | Meglio così |
|---|---|
| "Ci risentiamo per fissare le date" | "Il workshop L1 è martedì alle 10, vi mando l'invito oggi." |
| "Qualcuno del business parteciperà" | Nomi precisi delle persone che partecipano ai workshop |
| "Vi faremo sapere per gli accessi" | Si chiede subito chi è il referente IT e lo si contatta il giorno dopo |
| Verbale dopo una settimana | Verbale distribuito entro 24 ore |
| Azioni generiche | Ogni azione ha chi, cosa e quando |
| Perimetro discusso ma non confermato | Si riepiloga e si chiede una conferma esplicita |

> **Attenzione:** se lo sponsor è assente o le risposte sulle risorse restano vaghe, è un segnale di rischio. Va chiesta una chiamata dedicata con lo sponsor prima di procedere.
