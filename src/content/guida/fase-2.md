La Fase 2 decide come sarà costruito il sistema. Traduce i requisiti, compresi quelli non funzionali, in decisioni tecniche motivate e in regole concrete per chi scrive il codice, persona o agente AI.

## Obiettivo

Definire l'architettura tecnica e le regole di sviluppo del progetto, in modo che la [Preparazione delivery](/guida/fase-4) possa applicarle senza rimetterle in discussione.

## Chi è coinvolto

| Ruolo | Cosa fa |
|---|---|
| TL | Responsabile della fase: scrive e approva Architettura e Contesto Tecnico |
| AF, Designer | Consultati sulle scelte che toccano funzionalità ed esperienza utente |
| Cliente (PO, IT) | Partecipa al workshop NFR e porta i vincoli infrastrutturali |
| PM | Autorizza il passaggio alla fase successiva |

## I passi

### 1. Architettura

Il TL lancia `/asdp:t2-2-architecture` sull'[Analisi Funzionale](/guida/t1-4), con i vincoli del kickoff e, in un'evolutiva, l'architettura o il codice esistente. Ne esce l'[Architettura](/guida/t2-2). La skill lavora in due gate:

- **Gate A, struttura e decisioni**: in chat propone vincoli, driver con i loro valori obiettivo, componenti, decisioni candidate con le opzioni e una raccomandazione. Qui decide il TL.
- **Gate B, documento**: integrazioni, sicurezza, decisioni, rischi tecnici e copertura delle Feature.

Il cuore del documento sono gli **ADR**, le decisioni architetturali: ognuna con contesto, opzioni, motivazione e compromessi accettati, e legata a un requisito. Le decisioni nascono "Proposte": la skill non le approva mai.

In un'evolutiva la skill documenta solo ciò che il cambiamento tocca.

### 2. Contesto Tecnico

Il TL lancia `/asdp:t2-4-technical-context` sul codice del progetto, oppure sull'Architettura se si parte da zero. Ne esce il [Contesto Tecnico](/guida/t2-4): stack, dove stanno i file, pattern per ogni livello, nomi, errori, sicurezza, test, regole ed esempi di codice reale.

È il riferimento che le skill di Fase 4 applicano per l'[Analisi Tecnica](/guida/t4-2) e lo [scaffold](/guida/t4-3-part). Se il codice mostra due modi diversi di fare la stessa cosa, decide il TL quale tenere.

> **Nota:** la Guida del framework prevede anche le Linee guida tecniche come documento separato. Con le skill sono assorbite nel Contesto Tecnico: ogni regola ha il suo perché in una riga.

### 3. Approfondimenti di disegno

Quando un meccanismo richiede più dettaglio di una decisione, l'Architettura lo segna "da progettare" e lo inserisce nella mappa degli approfondimenti, con le Feature che lo usano. Questi approfondimenti non hanno una skill dedicata: li scrive il TL prima delle Feature indicate.

## Il workshop NFR

Il workshop sui requisiti non funzionali raccoglie con il cliente prestazioni, sicurezza, disponibilità, integrazioni e scalabilità. Con le skill funziona così: se all'Architettura serve una qualità che nessuno ha dichiarato, la skill non la inventa ma la porta come domanda al workshop. Le risposte entrano nei [Requisiti Consolidati](/guida/p1-3), poi si aggiornano Analisi Funzionale e Architettura. Il ciclo completo è nel [percorso](/guida/percorso).

> **Nota:** nella Guida del framework gli NFR si definiscono in questo workshop, in Fase 2. Con le skill si definiscono solo nei Requisiti Consolidati.

## La fase è chiusa quando…

Dalla checklist del framework:

- [ ] Workshop NFR completato
- [ ] Architettura documentata
- [ ] ADR create
- [ ] Linee guida prodotte

Con le skill le linee guida sono il Contesto Tecnico. Entrambi i documenti li approva il TL. Vedi anche [Gate](/guida/gate).

## Errori tipici

| Errore | Meglio così |
|---|---|
| Inventare un NFR che il cliente non ha dato | Si porta come domanda al workshop NFR |
| Prendere una decisione senza dire a quale requisito risponde | Ogni decisione cita il requisito, la Feature o la regola da cui nasce |
| Descrivere l'esistente a memoria | In un'evolutiva si descrive solo ciò che documenti o codice confermano |
| Copiare pattern standard nel Contesto Tecnico | Pattern e regole vengono dal codice letto |
| Progettare nell'Architettura un meccanismo complesso | Si segna da progettare e va nella mappa degli approfondimenti |
