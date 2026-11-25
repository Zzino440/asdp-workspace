La Fase 1 serve a capire cosa vuole il cliente e a scriverlo in modo strutturato. Dai workshop si arriva all'[Analisi Funzionale](/guida/t1-4), il documento su cui si basa tutto il resto.

## Obiettivo

Documentare i requisiti e ottenere dal cliente la validazione del perimetro: cosa è dentro e cosa è fuori.

## Chi è coinvolto

| Ruolo | Cosa fa |
|---|---|
| AF | Conduce i workshop, scrive Requisiti Consolidati e Analisi Funzionale |
| PO del cliente | Decide perimetro e priorità, approva l'Analisi Funzionale |
| TL | Revisione interna: integrazioni, vincoli, fattibilità |
| PM | Rivede i Requisiti Consolidati e risponde della fase |
| Designer | Esperienza utente, se c'è un'interfaccia |

## I workshop

Il framework prevede tre livelli di workshop, sempre registrati per avere la trascrizione.

| Livello | Con chi | Durata | Cosa ne esce |
|---|---|---|---|
| **L1 · Vision e perimetro** | Sponsor, PO | circa 2 ore | Visione, stakeholder, macro-funzionalità |
| **L2 · Scoperta delle Feature**, uno per area | PO, utenti di business | 2–4 ore per area | Feature con priorità, attori, dipendenze; se serve un L3 |
| **L3 · Dettaglio e validazione**, per le Feature complesse | PO, utenti chiave | 1h30–2h30 per Feature | Casi d'uso validati, criteri di accettazione Given/When/Then |

> **Attenzione:** non si entra in sala con tabelle vuote. Prima di L2 e L3 si porta una bozza con ciò che si sa già e le domande aperte.

## I passi

### 1. Requisiti Consolidati

Dopo ogni workshop l'AF passa trascrizioni e note alla skill `/asdp:p1-3-requirements-consolidation`. Ne esce il documento [Requisiti Consolidati](/guida/p1-3): bisogni, attori, requisiti, regole, vincoli e requisiti non funzionali (NFR), con le [domande aperte D[N]](/guida/domande-aperte) accanto all'elemento che chiariscono.

Si risponde alle domande e si rilancia la skill in [aggiornamento](/guida/aggiornare-documento), anche con le note dei workshop successivi.

> **Nota:** il passo P1.3 esiste solo con le skill, non nella Guida del framework. È anche **l'unico punto in cui si definiscono gli NFR**, comprese le risposte del workshop NFR. Vedi [il ciclo NFR](/guida/percorso).

### 2. Analisi Funzionale

L'AF lancia `/asdp:t1-4-functional-analysis` sui Requisiti Consolidati, il suo unico input. La skill lavora in due gate:

- **Gate A, struttura**: propone in chat perimetro, Feature, attori, casi d'uso e priorità MoSCoW. Si approva o si corregge riga per riga, prima che scriva.
- **Gate B, dettaglio**: scrive flussi, criteri di accettazione, regole e dipendenze, con i controlli.

> **Nota:** la Guida costruisce l'Analisi Funzionale per pilastri dopo ogni workshop e chiude con una checklist di firma del perimetro. Con le skill si parte dai Requisiti Consolidati, i due gate ne verificano i criteri e l'approvazione del PO vale come firma.

### 3. Revisione e approvazione

Il TL fa la revisione interna. Poi l'Analisi Funzionale va al PO del cliente per l'approvazione. Se cambia un requisito, si aggiornano prima i Requisiti Consolidati e poi l'Analisi Funzionale.

## La fase è chiusa quando…

Dalla checklist del framework:

- [ ] Brief di ingresso al workshop L1 prodotto, modalità della sessione decisa
- [ ] Workshop L1 completato
- [ ] Workshop L2 completati (tutti), ciascuno preparato in anticipo
- [ ] Workshop L3 completati per le Feature che lo richiedono, ciascuno preparato in anticipo
- [ ] Nessun punto aperto bloccante residuo
- [ ] Tracciabilità completa, senza elementi orfani non motivati
- [ ] Analisi Funzionale approvata, con verdetto "Pronto" e firma del perimetro

Con le skill il brief è assorbito nei Requisiti Consolidati e l'approvazione del PO sostituisce la firma.

## Errori tipici

| Errore | Meglio così |
|---|---|
| Il cliente cambia perimetro in workshop | Si ribadisce l'offerta: ciò che è fuori è una richiesta di modifica |
| L'AI fraintende un termine del dominio | Si corregge nel glossario prima di rilanciare |
| Lanciare l'Analisi Funzionale su trascrizioni grezze | Prima i Requisiti Consolidati: la skill si ferma e rimanda lì |
| Approvare con un punto aperto bloccante | Non si firma: il punto va chiuso, con un titolare e una data |

> **Nota:** l'analisi UX (user journey e wireframe) non ha ancora una skill.
