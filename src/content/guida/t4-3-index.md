Il Piano di lavoro divide una Feature in task: dice quali task servono per ogni User Story, in che ordine si fanno e quali vanno verificati per primi. Claude lo ricava dall'[Analisi Tecnica](/guida/t4-2) della stessa Feature, senza scrivere codice. Il TL lo approva al gate G2, nella stessa seduta dell'Analisi Tecnica.

## A cosa serve

- Tagliare il contratto tecnico in task piccoli, ognuno di al massimo 8 ore (salvo una convenzione diversa).
- Mettere i task in ordine, con le dipendenze anche tra User Story diverse.
- Indicare i **task di fondamenta** (schema dati, entità, firme delle API) e il **checkpoint** che li verifica prima di tutto il resto.
- Confrontare le ore dei task con le stime del backlog.
- Scrivere, una volta sola per la Feature, il **Contratto di esecuzione**: cosa può e non può fare chi sviluppa.

Il piano **non ridice** nulla dell'Analisi Tecnica: la cita.

## Prima di iniziare

- **L'Analisi Tecnica della Feature, senza domande D[N] aperte.** Con domande aperte Claude si ferma. Rispondi prima (vedi [Rispondere alle domande D[N]](/guida/domande-aperte)).
- **Le righe della Feature nel [Backlog](/guida/t4-1)**, con le stime.
- Se l'Analisi Tecnica cita un **progetto di dettaglio (T2.7)**, serve anche quello, con le sezioni citate: Claude lo legge dalla fonte, non dal riassunto.
- Consigliato: il [Contesto Tecnico](/guida/t2-4), per la struttura del codice e la dimensione tipica dei task.

## Come va la sessione con Claude

Lancia la skill `asdp:t4-3-index-work-plan` (vedi [Lanciare una skill](/guida/lanciare-skill)). Per esempio:

> Scomponi in task la Feature F02.

Claude trova da solo l'Analisi Tecnica e le righe del backlog. L'Analisi Tecnica è l'unica fonte tecnica: Claude non rilegge Analisi Funzionale e Architettura e non rivalida il contratto, lo taglia in task.

La skill **non chiede conferme intermedie**:

1. **Derivazione**: per ogni componente, endpoint, entità e schermata, i task che lo realizzano, segnando quelli di fondamenta.
2. **Ordine e checkpoint**: l'ordine di esecuzione e il criterio per verificare le fondamenta.
3. **Output**: il documento, con in testa task, ore e differenza rispetto al backlog.

Si ferma solo se l'Analisi Tecnica manca, ha domande aperte, o se i task richiedono un componente che l'Analisi Tecnica non prevede o formano un ciclo. In questi casi si corregge prima l'Analisi Tecnica.

> **Nota:** nel framework il prompt si ferma dopo la derivazione per far controllare copertura e grafo. Con la skill il controllo si fa sul documento, al G2.

## Cosa contiene

| Sezione | Cosa trovi |
|---|---|
| User Story | Le storie della Feature |
| Task Overview | Tutti i task: tipo, ore, dipendenze, riferimento all'Analisi Tecnica, fondamenta 🔨 |
| Ordine e checkpoint | Ordine di esecuzione e criterio di verifica delle fondamenta |
| Copertura ed effort | Copertura dell'Analisi Tecnica e confronto con le stime |
| Contratto di esecuzione | Le regole per chi sviluppa |
| Gate G2 | La checklist del TL |
| Registro rigetti | I task rifiutati da chi sviluppa, solo aggiunte |

### Il confronto con le stime

Se la stima del backlog è in giorni, Claude la converte in ore (8 ore al giorno) e la confronta. Se è in story point o manca, il confronto è "non calcolabile". Se la differenza supera il 25%, Claude propone una spiegazione ma **non ritocca i numeri**.

> **Nota:** nel framework il Contratto di esecuzione è ripetuto in ogni file di task. Con le skill sta una volta sola, qui.

## Quando è finito

Al gate **G2** il TL verifica, insieme all'Analisi Tecnica (vedi [Gate](/guida/gate)):

- ogni storia ha almeno un task, l'Analisi Tecnica è coperta al 100%, nessun componente in più;
- le schermate nuove sono raggiungibili (routing e menu hanno un task);
- nessun task oltre il limite di ore;
- i task di fondamenta sono giusti e vengono tutti prima del checkpoint;
- dipendenze reali e senza cicli;
- differenza con le stime coerente o motivata.

Se uno dei due documenti non passa, non passa il gate. Claude lascia il piano **In corso**: approva il TL (vedi [Stati e frontespizio](/guida/stati)). Dopo l'approvazione il piano è congelato.

## Errori tipici

- **Aggiungere al piano un componente che l'Analisi Tecnica non ha.** Si torna all'Analisi Tecnica.
- **Aggiustare le ore** per far tornare la stima. Lo scostamento si scrive e si motiva.
- **Lanciare la skill con domande D[N] ancora aperte.**

## Dopo

Con il G2 approvato si genera, una User Story alla volta, il file [Task + Scaffold](/guida/t4-3-part). Il TL compila l'esito del checkpoint quando le fondamenta sono pronte. Il registro rigetti lo scrivono chi sviluppa e il TL durante l'esecuzione.
