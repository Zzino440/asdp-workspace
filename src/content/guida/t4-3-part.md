Il file Task + Scaffold contiene i task di una User Story pronti per lo sviluppo. Per ogni task del [Piano di lavoro](/guida/t4-3-index) ci sono il codice scaffold, scritto secondo i pattern reali del progetto, e la Definition of Done, legata ai criteri di accettazione dell'[Analisi Tecnica](/guida/t4-2). Se ne fa uno per User Story, dopo l'approvazione del piano. Il TL lo approva al gate G3.

## A cosa serve

- Dare a chi sviluppa, persona o agente di coding, tutto quello che serve per una User Story, senza aprire l'intera Feature.
- Partire da codice che rispetta già il contratto tecnico e lo stile del progetto.

Le regole per chi sviluppa (il Contratto di esecuzione) non si ripetono qui: stanno una volta sola nel Piano di lavoro.

## Prima di iniziare

- **Il Piano di lavoro della Feature, approvato al G2.** Senza approvazione non si parte.
- **L'Analisi Tecnica** della Feature.
- **Il [Contesto Tecnico](/guida/t2-4)**, con gli esempi di codice reale.
- Se un task cita un **progetto di dettaglio (T2.7)**, servono le sezioni citate: lo scaffold di un meccanismo si scrive dalla sua fonte.
- Su un progetto esistente, **accesso al codice**: Claude legge i file da modificare. Senza accesso alla repository ti chiede un estratto.

## Come va la sessione con Claude

Lancia la skill `asdp:t4-3-part-task-scaffold` (vedi [Lanciare una skill](/guida/lanciare-skill)). Per esempio:

> Genera lo scaffold di F02-US01.

Se non indichi la User Story, Claude propone la prima, nell'ordine del piano, che non ha ancora il suo file.

> **Attenzione:** una User Story per volta, anche in giorni diversi. Generare il codice di tutte le storie in un colpo satura il contesto e peggiora proprio gli ultimi task.

Claude non chiede conferme intermedie:

1. **Legge solo quello che serve** per quella storia. Non rivalida il piano, che è già approvato.
2. **Genera i task** nell'ordine del piano, ciascuno con cosa implementare, i file da creare o modificare, il codice, la Definition of Done e le note.
3. **Scrive il file** della User Story.

Si ferma solo per un problema bloccante: un'invariante che rende impossibile un task, un elemento che manca nell'Analisi Tecnica, un task sbagliato nel piano. Il problema si corregge nell'Analisi Tecnica o nel piano, non qui.

## Cosa contiene

In testa: la User Story ("come… voglio… per…"), le fonti, il numero di task e le ore. Poi un blocco per ogni task:

| Parte | Cosa trovi |
|---|---|
| Implement | Cosa deve essere vero alla fine, in poche frasi |
| Files | File da creare o modificare |
| Code Scaffold | Il codice |
| Definition of Done | Quando il task è finito, legata a un criterio di accettazione |
| Note | Indicazioni per chi sviluppa |

In fondo, la checklist del **Gate G3**.

### Cosa garantisce la skill

- Usa **esattamente i task del piano**, nello stesso ordine.
- Non tocca le invarianti: componenti e file, API, modello dati, dipendenze tra task.
- Scrive codice completo. Dove manca una regola di business scrive la firma e un TODO che dice cosa manca e dove trovarlo.
- Sui file esistenti indica la modifica puntuale, non riscrive il file intero.
- Non scrive test funzionali o di integrazione: sono del QA. Gli unit test li scrive chi sviluppa.

## Quando è finito

Al gate **G3** il TL valida il codice (vedi [Gate](/guida/gate)):

- task, ordine, ore e dipendenze identici al piano;
- pattern, naming e layer conformi al Contesto Tecnico;
- file, firme e dati conformi all'Analisi Tecnica;
- codice compilabile, nessun segnaposto rimasto;
- gestione errori, validazione e autorizzazione come da Analisi Tecnica;
- nessun segreto o credenziale nel codice;
- ogni Definition of Done legata a un criterio di accettazione.

Claude lascia il file **In corso**: approva il TL (vedi [Stati e frontespizio](/guida/stati)).

## Errori tipici

- **Correggere qui un errore del piano.** Il piano è congelato dal G2: si corregge lì.
- **Generare tutte le storie insieme.**
- **Saltare il checkpoint** durante lo sviluppo.

## Dopo

Chi sviluppa riceve il Piano di lavoro e il file della sua User Story, e segue il Contratto di esecuzione:

1. esegue prima i task di fondamenta (🔨);
2. supera il checkpoint del piano;
3. esegue il resto.

Se il disegno non regge, rifiuta il task con un motivo e lo registra nel registro rigetti del piano. Il rifiuto torna al TL. Al massimo due cicli per task, poi il task passa a una persona. Per rigenerare il file dopo un rifiuto, vedi [Aggiornare un documento](/guida/aggiornare-documento).
