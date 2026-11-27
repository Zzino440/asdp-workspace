La Fase 4 trasforma i requisiti approvati in lavoro eseguibile, pronto per chi sviluppa: persona o agente AI.

## Obiettivo

User Story pianificate, Feature analizzate e scomposte, codice di partenza (scaffold) validato dal TL. Si lavora su tre livelli:

| Livello | Cosa si fa | Documento |
|---|---|---|
| **Progetto** | Derivare e pianificare le User Story | [Backlog](/guida/t4-1) |
| **Feature** | Contratto tecnico e divisione del lavoro | [Analisi Tecnica](/guida/t4-2), [Piano di lavoro](/guida/t4-3-index) |
| **User Story** | Task e codice da eseguire | [Task + Scaffold](/guida/t4-3-part) |

## Chi è coinvolto

| Ruolo | Cosa fa |
|---|---|
| AF | Deriva il backlog dall'Analisi Funzionale |
| PM | Pianifica gli sprint, riconcilia con l'offerta, approva il backlog al gate G1 |
| TL | Scrive Analisi Tecnica, Piano di lavoro e scaffold; decide ai gate G2 e G3 |
| Sviluppatore o agente | Esegue i task |

## I passi

### 1. Backlog e gate G1

L'AF lancia `/asdp:t4-1-user-story-backlog` sull'[Analisi Funzionale](/guida/t1-4), con il [Risk Register](/guida/t3-1) se c'è. Ne escono il documento del backlog e un CSV pronto per l'import in iceScrum. Le stime le mette il team. Il PM pianifica, riconcilia con l'offerta e approva al **gate G1**; poi il backlog si congela.

Il backlog può partire anche prima che Fasi 2 e 3 siano finite, appena l'Analisi Funzionale è pronta. Quelle fasi restano da completare: servono ai passi successivi (vedi [Cosa si può fare in parallelo](/guida/percorso)).

> **Nota:** nella Guida del framework la priorità finale la chiude il PM nel backlog. Con le skill la priorità MoSCoW si decide solo nell'Analisi Funzionale, per Feature, con l'approvazione del PO; il backlog la copia. Per cambiarla si cambia l'Analisi Funzionale.

### 2. Analisi Tecnica, per Feature

Quando una Feature entra in sprint, non prima, il TL lancia `/asdp:t4-2-technical-analysis`. Usa backlog, Analisi Funzionale, [Architettura](/guida/t2-2) e [Contesto Tecnico](/guida/t2-4): senza Architettura non si parte. Componenti, API e modello dati diventano **invarianti**: chi esegue non può cambiarli.

### 3. Piano di lavoro e gate G2

Chiuse le [domande D[N]](/guida/domande-aperte) dell'Analisi Tecnica, il TL lancia `/asdp:t4-3-index-work-plan`: task, ordine, dipendenze, fondamenta con il loro checkpoint. Al **gate G2** il TL approva Analisi Tecnica e piano **nella stessa seduta**. È il gate che conta di più: un errore che lo supera si moltiplica nel codice generato.

### 4. Task + Scaffold e gate G3

Dopo il G2 il TL lancia `/asdp:t4-3-part-task-scaffold`, **una User Story alla volta**. Al **gate G3** valida il codice: compilabile, senza segnaposto, con la Definition of Done legata ai criteri di accettazione.

> **Nota:** la Guida riporta le regole per chi esegue (il Contratto di esecuzione) in ogni file di Task + Scaffold. Con le skill stanno una volta sola nel Piano di lavoro.

## Dopo il G3: l'esecuzione

Chi esegue riceve il piano e il file della sua User Story. Fa prima i task di fondamenta, poi il checkpoint, poi il resto. Se il disegno non regge, rigetta il task con un motivo e lo registra nel piano; decide il TL. Massimo due cicli, poi il task passa a una persona.

## La fase è chiusa quando…

**Backlog, una volta per progetto o release**

- [ ] Backlog derivato dall'Analisi Funzionale, copertura dei casi d'uso 100%
- [ ] Prioritizzazione e piano degli sprint
- [ ] Riconciliazione con la stima d'offerta, differenza motivata
- [ ] Gate G1: backlog approvato
- [ ] Import in iceScrum, baseline congelata

**Per ogni Feature entrata in sprint**

- [ ] Analisi Tecnica con invarianti precise e punti aperti chiusi
- [ ] Piano di lavoro senza cicli, fondamenta e checkpoint definiti
- [ ] Effort riconciliato con il backlog
- [ ] Gate G2: Analisi Tecnica e piano validati nella stessa seduta

**Per ogni User Story**

- [ ] Scaffold generato, compilabile, senza segnaposto
- [ ] Definition of Done legata ai criteri di accettazione
- [ ] Gate G3: scaffold validato

> **Nota:** l'import in iceScrum, l'export dei task e il Testbook del QA non hanno ancora una skill.

## Errori tipici

| Errore | Meglio così |
|---|---|
| Salvare il CSV riordinato in Excel | L'ordine delle righe resta fisso; si ordina solo nella vista |
| Aggiungere al piano un componente assente dall'Analisi Tecnica | Si torna all'Analisi Tecnica |
| Ritoccare le ore per far tornare le stime | Si scrive la differenza e la si motiva |
