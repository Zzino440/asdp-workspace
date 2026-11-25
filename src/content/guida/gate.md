Un **gate** è un punto di controllo: il lavoro si ferma finché una persona non decide che si può andare avanti. In ASDP ce ne sono di due tipi. I **gate A e B** sono le pause di una skill durante la conversazione con Claude. I **gate del framework** sono le approvazioni: a fine fase e, nella Fase 4, i gate G1, G2 e G3.

## I gate A e B delle skill

| Gate | Quando | Cosa fai tu |
|---|---|---|
| **A, struttura** | Prima di scrivere. Claude propone in chat, sotto il titolo **AZIONE RICHIESTA**, tabelle brevi con le scelte principali, e si ferma | Approvi, correggi righe precise o chiedi di spostare un elemento |
| **B, documento** | Dopo aver scritto. Claude controlla il documento intero e riporta l'esito con i conteggi | Leggi il riepilogo e, se serve, chiedi correzioni |

Il gate A è il più importante: un errore nella struttura si propagherebbe a tutto il documento. Una risposta vaga come "più o meno va bene" non basta: Claude ti chiede quali righe.

Con la modalità `diretto` la skill salta il gate A e fa tutto in un passaggio: le lacune diventano [domande D[N]](/guida/domande-aperte).

### Dove si ferma ogni skill

| Skill | Dove si ferma |
|---|---|
| Kickoff, Requisiti Consolidati | Non ha gate A e B: scrive il documento in un passaggio |
| [Analisi Funzionale](/guida/t1-4) | Gate A sulla struttura e gate B |
| [Architettura](/guida/t2-2) | Gate A su struttura e decisioni, poi gate B |
| [Contesto Tecnico](/guida/t2-4) | Gate A solo se c'è da decidere su pattern e incoerenze, poi gate B |
| [Risk Register](/guida/t3-1) | Gate A sui rischi e la loro valutazione, poi gate B |
| [Backlog](/guida/t4-1) | Non si ferma: le anomalie finiscono nel documento |
| [Analisi Tecnica](/guida/t4-2) | Tre sessioni, con una pausa dopo ogni gruppo di pilastri; la prima è la più importante |
| [Piano di lavoro](/guida/t4-3-index), [Task + Scaffold](/guida/t4-3-part) | Solo se manca un input o c'è un problema bloccante |

## I gate della Fase 4: G1, G2, G3

| Gate | Cosa si approva | Chi approva | Quando è superato |
|---|---|---|---|
| **G1** · Backlog approvato | Il [Backlog](/guida/t4-1) | PM | Ogni caso d'uso è coperto da User Story, nessuna storia è orfana, le differenze con l'offerta sono spiegate, il piano degli sprint sta nella capacità del team |
| **G2** · Feature pronta | [Analisi Tecnica](/guida/t4-2) e [Piano di lavoro](/guida/t4-3-index) di una Feature | TL | Componenti, API e dati sono precisi, tutto è coperto da task, i task non hanno dipendenze circolari, il checkpoint è definito, l'effort torna con il backlog |
| **G3** · Scaffold validato | I [Task + Scaffold](/guida/t4-3-part) di una User Story | TL | Il codice compila, non ci sono segnaposto, la Definition of Done è legata ai criteri di accettazione, la sicurezza è a posto. È anche la Definition of Ready della storia |

**G2 si fa in una sola seduta.** Il TL valida insieme Analisi Tecnica e Piano di lavoro: due pagine senza codice, dove correggere costa poco. Un errore che passa il G2 si moltiplica in tutti i file di codice generati dopo.

Dopo il gate il documento diventa la base congelata: il backlog dopo il G1, il piano dopo il G2, i task dopo il G3. Per cambiarlo serve una nuova versione e il gate va rifatto (vedi [Aggiornare un documento](/guida/aggiornare-documento)).

## I gate di fine fase

| Fase | Gate | Chi approva | Cosa controllare |
|---|---|---|---|
| [0 · Setup](/guida/fase-0) | Kickoff approvato | PM | Kickoff fatto, verbale distribuito |
| [1 · Analisi](/guida/fase-1) | Requisiti validati | PO del cliente | Nessuna domanda aperta bloccante, ogni requisito coperto, Analisi Funzionale approvata |
| [2 · Architettura](/guida/fase-2) | Architettura approvata | TL | Requisiti non funzionali definiti, architettura con le decisioni (ADR), contesto tecnico pronto |
| [3 · Rischi](/guida/fase-3) | Risk Register condiviso | PM | Rischi in tutte le categorie, mitigazioni e responsabili, registro condiviso con sponsor e PO |
| [4 · Preparazione delivery](/guida/fase-4) | G1, G2, G3 | PM e TL | Vedi sopra |

> **Nota:** nella Guida del framework le sigle G1–G6 indicano anche gli strumenti di governo del PM: registro di rischi e problemi, stato avanzamento, minuta, Gantt, staffing, kickoff pack. Non sono gate. In questa app G1, G2 e G3 indicano sempre i gate della Fase 4.

## Le approvazioni nell'app

L'approvazione si fa dalla pagina del documento, con i pulsanti accanto a **Tutti i dettagli**. **Completo** vuol dire "pronto da approvare": non serve un passaggio in più.

| Passo | Chi | Cosa succede |
|---|---|---|
| **Segna come completo** | Chi ha il permesso Modifica | Lo stato passa a Completo; sotto il titolo compare "In attesa di" e l'approvatore |
| **Approva** | Chi ha il permesso Approva | Si apre la checklist del gate del documento: Approva si abilita solo con tutte le voci spuntate. L'app scrive nel frontespizio stato Approvato, chi, quando, la versione, il gate e l'evidenza |
| **Richiedi modifiche** | Chi ha il permesso Approva | Lo stato torna In corso. Il motivo è obbligatorio e resta nel commit, in **Cronologia** |
| **Revoca approvazione** | Chi ha il permesso Approva | Lo stato torna In corso e i dati di approvazione si svuotano, con il motivo nel commit |

L'evidenza, se la lasci vuota, è il riferimento alla versione approvata (`commit …`). Per l'[Analisi Funzionale](/guida/t1-4) l'approvazione è del PO del cliente: il PM la registra e l'evidenza va scritta (per esempio l'email o il verbale).

Ogni passo è una versione nuova a nome di chi lo fa. Chi approva può anche correggere i dati di approvazione da **Tutti i dettagli**, o chiedere a Claude collegato di aggiornare il frontespizio.

### La pagina Approvazioni

La voce **Approvazioni** del menu mostra accanto il numero di documenti che ti aspettano. La pagina ha due schede:

- **Da approvare**: i documenti Completo che puoi approvare, divisi per progetto, con gate, da quanti giorni aspettano, scadenza (in rosso se passata) e autore. Puoi filtrare per progetto e per gate e ordinare per attesa, scadenza o tipo di documento. **Rivedi** apre il documento: si approva sempre dopo averlo letto. Analisi Tecnica e Piano di lavoro della stessa Feature stanno su una riga sola, perché il G2 si fa in una seduta.
- **Approvati**: i documenti approvati negli ultimi 30 giorni, con chi li ha approvati e quale versione.

Dopo **Approva** o **Richiedi modifiche** la pagina del documento ti propone il prossimo documento da approvare, così smaltisci la coda senza tornare all'elenco.

> **Nota:** sono in arrivo l'upload dell'evidenza del cliente e l'aiuto di Claude per controllare la checklist del gate.
