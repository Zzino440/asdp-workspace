Le parole che incontri nei documenti ASDP, nelle skill e nell'app, in ordine alfabetico. Ogni voce rimanda alla pagina che ne parla.

### A

- **AC (criteri di accettazione)**: le condizioni che dicono quando una funzionalità è fatta bene, scritte in forma Given/When/Then. Nascono nell'[Analisi Funzionale](/guida/t1-4).
- **ADR (Architecture Decision Record)**: una decisione architetturale scritta con le opzioni valutate e il perché della scelta. Le raccoglie l'[Architettura](/guida/t2-2).
- **AF (Analista Funzionale)**: traduce le esigenze del cliente in requisiti e scrive i documenti della Fase 1. Nel backlog compare come **BA** (Business Analyst). Vedi [Ruoli](/guida/ruoli).
- **Allegati**: i materiali di input del progetto, per esempio trascrizioni e offerte, raccolti nella cartella Allegati.
- **Approvato**: lo stato di un documento approvato da chi ne ha l'autorità. Vedi [Stati](/guida/stati).

### B

- **Backlog**: l'elenco delle User Story del progetto, derivato dall'Analisi Funzionale e pronto per iceScrum. Vedi [T4.1](/guida/t4-1).
- **Bisogno (BN)**: il perché di business sopra i requisiti, per esempio `BN-01`. Si definisce nei [Requisiti Consolidati](/guida/p1-3).

### C

- **Caso d'uso**: un'interazione di un attore con il sistema, con flusso e criteri di accettazione, per esempio `F01-UC01`. Vedi [T1.4](/guida/t1-4).
- **Completo**: lo stato di un documento che per l'autore è finito e si può rivedere. Vedi [Stati](/guida/stati).
- **Connettore**: il collegamento tra Claude e l'app, tramite MCP. Vedi [Collegare Claude](/guida/collegare-claude).
- **Cronologia**: lo storico delle versioni di un documento nell'app, con autore, data e canale (App, MCP, Git). Vedi [Come si usa questa app](/guida/come-usare-app).

### D

- **D[N] (domanda aperta)**: una domanda numerata che una skill lascia nel documento quando le fonti non bastano. Si chiude spuntando una casella. Vedi [Domande D[N]](/guida/domande-aperte).
- **Da fare**: lo stato di un documento previsto ma non ancora iniziato.
- **Definition of Done (DoD)**: i criteri per dire che una User Story è finita: task completati, test passati, review fatta. Nel gate G3 deve essere legata ai criteri di accettazione.
- **Definition of Ready (DoR)**: i criteri per dire che una User Story è pronta per lo sviluppo. Coincide con il [gate G3](/guida/gate).
- **Diretto**: la modalità di una skill che fa tutto in un passaggio, senza fermarsi al gate A. Vedi [Gate](/guida/gate).

### E

- **Epica**: una grande area funzionale che raggruppa più Feature. Nei progetti grandi analisi e backlog si lavorano un'epica alla volta.
- **Evolutiva**: un progetto che modifica un sistema esistente. Il contrario è greenfield.

### F

- **Feature**: un gruppo di casi d'uso con un'unica priorità, per esempio `F01`. È l'unità su cui si fanno analisi tecnica e piano di lavoro. Vedi [Fase 4](/guida/fase-4).
- **Frontespizio**: il blocco di dati in testa a ogni documento, con stato, versione, responsabilità e approvazione. Vedi [Stati e frontespizio](/guida/stati).

### G

- **Gate**: un punto di controllo in cui una persona decide se si va avanti. I gate A e B sono le pause delle skill; G1, G2 e G3 le approvazioni della Fase 4. Vedi [Gate](/guida/gate).
- **Given/When/Then**: il formato dei criteri di accettazione: dato un contesto, quando succede qualcosa, allora il risultato atteso.
- **Greenfield**: un progetto che costruisce un sistema nuovo.

### I

- **iceScrum**: lo strumento in cui si gestiscono backlog e sprint. Il backlog produce un CSV pronto per l'import. Vedi [T4.1](/guida/t4-1).
- **In corso**: lo stato di un documento in lavorazione. Le skill lasciano sempre questo stato.
- **Invarianti**: componenti, API e modello dati fissati nell'[Analisi Tecnica](/guida/t4-2). Chi sviluppa non li cambia: se servisse, rifiuta il task.

### K

- **Kickoff**: la riunione di avvio con il cliente. Il PM la prepara con il [Kickoff Pack](/guida/t0-1a) e ne scrive il [Verbale](/guida/t0-1).

### M

- **MCP (Model Context Protocol)**: il protocollo con cui Claude usa strumenti esterni. L'app espone un server MCP per leggere e salvare i documenti. Vedi [Collegare Claude](/guida/collegare-claude).
- **MoSCoW**: il metodo di priorità Must, Should, Could, Won't. Si assegna a ogni Feature nell'[Analisi Funzionale](/guida/t1-4) ed è l'unica priorità del percorso.

### N

- **NFR (requisiti non funzionali)**: le qualità richieste al sistema, come prestazioni, sicurezza, disponibilità, accessibilità. Si definiscono solo nei [Requisiti Consolidati](/guida/p1-3).

### P

- **Pilastri**: le parti in cui si costruisce un documento, una alla volta, con una pausa per decidere. Le skill li raggruppano in pochi gate.
- **Plugin**: il pacchetto che installa le skill in Claude. Le skill ASDP sono nel plugin `asdp`. Vedi [Collegare Claude](/guida/collegare-claude).
- **PM (Project Manager)**: guida il progetto e approva ai gate. Vedi [Ruoli](/guida/ruoli).
- **PO (Product Owner)**: la persona del cliente che decide perimetro e priorità e approva l'Analisi Funzionale. Vedi [Ruoli](/guida/ruoli).

### R

- **REQ**: l'ID di un requisito confermato, per esempio `REQ-04`. Non cambia mai. Vedi [P1.3](/guida/p1-3).
- **Risk Register**: il registro dei rischi del progetto, con punteggio, mitigazione e responsabile. Vedi [T3.1](/guida/t3-1).

### S

- **Scaffold**: lo scheletro di codice generato con l'AI per una User Story, da cui parte chi sviluppa. Vedi [T4.3-part](/guida/t4-3-part).
- **Skill**: un'istruzione pronta che insegna a Claude a produrre un documento ASDP. Vedi [Lanciare una skill](/guida/lanciare-skill).
- **Sponsor**: chi ha l'autorità decisionale dal lato cliente.
- **Sprint**: un'iterazione di sviluppo di durata fissa. L'analisi tecnica si fa per le Feature che entrano in uno sprint.

### T

- **TL (Tech Lead)**: il responsabile tecnico del progetto: architettura, analisi tecnica, piano di lavoro e validazione dello scaffold. Vedi [Ruoli](/guida/ruoli).

### U

- **Update mode (modalità aggiornamento)**: una skill rilanciata su un documento esistente, che cambia solo ciò che serve e tiene fermi gli ID. Vedi [Aggiornare un documento](/guida/aggiornare-documento).
- **User Story (US)**: una funzionalità vista da chi la usa, abbastanza piccola da stare in uno sprint, per esempio `F01-US01`. Vedi [T4.1](/guida/t4-1).

### W

- **Workshop L1, L2, L3**: le riunioni di analisi con il cliente, sempre più dettagliate. L1 su visione e perimetro, L2 sulle funzionalità di un'area, L3 sui casi d'uso di una funzionalità complessa. Vedi [Fase 1](/guida/fase-1).
