In un progetto ASDP ogni documento ha chi lo scrive e chi lo approva. Questa pagina riassume i ruoli, chi fa cosa sui documenti e quali permessi dà l'app a ogni ruolo. Su un progetto piccolo una persona può coprire più ruoli.

## I ruoli

| Ruolo | Cosa fa |
|---|---|
| **PM** (Project Manager) | Guida il progetto: tempi, costi, perimetro, rapporto con il cliente. Prepara il kickoff, tiene il Risk Register e approva il backlog. Autorizza il passaggio ai gate. |
| **AF** (Analista Funzionale) | Traduce le esigenze del cliente in requisiti chiari: facilita i workshop, scrive i Requisiti Consolidati e l'Analisi Funzionale, deriva il backlog. Nel backlog compare anche come **BA** (Business Analyst). |
| **TL** (Tech Lead) | Responsabile della qualità tecnica: architettura, contesto tecnico, analisi tecnica delle Feature, piano di lavoro e task. Valida lo scaffold. |
| **Designer** | Cura l'esperienza utente: wireframe, prototipi, design system. |
| **Developer** | Sviluppa partendo dai task e dallo scaffold validati dal TL. |
| **QA** | Prepara i test, li esegue e supporta il collaudo con il cliente. |
| **PO del cliente** (Product Owner) | Persona del cliente che decide perimetro e priorità. Valida l'Analisi Funzionale e l'accettazione finale. |
| **Sponsor** | Chi ha l'autorità decisionale dal lato cliente: escalation e firme di alto livello. |

PO del cliente e sponsor non sono utenti dell'app. La loro approvazione si registrerà come approvazione esterna, con il caricamento dell'evidenza (in arrivo).

## Chi scrive e chi approva

| Documento | Scrive | Approva |
|---|---|---|
| [Kickoff Pack](/guida/t0-1a) | PM | Nessuna approvazione formale: si porta al kickoff |
| [Verbale Kickoff](/guida/t0-1) | PM | PM, distribuendo il verbale |
| [Requisiti Consolidati](/guida/p1-3) | AF | Nessun gate formale; lo rivede il PM |
| [Analisi Funzionale](/guida/t1-4) | AF | PO del cliente, dopo una revisione interna del TL |
| [Architettura](/guida/t2-2) | TL | TL |
| [Contesto Tecnico](/guida/t2-4) | TL | TL |
| [Risk Register](/guida/t3-1) | PM, con il TL | PM; si condivide con sponsor e PO |
| [Backlog](/guida/t4-1) | AF | PM, al [gate G1](/guida/gate) |
| [Analisi Tecnica](/guida/t4-2) | TL | TL, al gate G2 |
| [Piano di lavoro](/guida/t4-3-index) | TL | TL, al gate G2, nella stessa seduta dell'Analisi Tecnica |
| [Task + Scaffold](/guida/t4-3-part) | TL | TL, al gate G3 |

## I permessi nell'app

Per ogni tipo di documento un ruolo ha uno di questi livelli:

| Livello | Cosa permette |
|---|---|
| **Nessuno** | Il documento non si vede |
| **Vede** | Lettura e cronologia |
| **Modifica** | Lettura e salvataggio, anche tramite Claude |
| **Approva** | Come Modifica, più lo stato Approvato e i dati di approvazione |

I permessi predefiniti seguono il framework:

| Documento | Modifica | Approva |
|---|---|---|
| Kickoff Pack, Verbale Kickoff | TL | PM |
| Requisiti Consolidati, Analisi Funzionale | AF | PM |
| Architettura, Contesto Tecnico | — | TL |
| Risk Register | TL | PM |
| Backlog | AF, TL | PM |
| Analisi Tecnica, Piano di lavoro, Task + Scaffold | — | TL |
| Allegati (input) | PM, TL, AF, Designer | — |

Tutti i ruoli vedono tutti i documenti. Developer e QA, di base, hanno solo la lettura.

Gli stessi permessi valgono nell'app e con Claude tramite il connettore. Chi lavora direttamente sulla repo documenti in GitLab, invece, segue i permessi di GitLab.

## Più ruoli nello stesso progetto

Una persona può avere più ruoli nello stesso progetto, per esempio AF e QA. In quel caso i permessi **si sommano**: su ogni documento vale il livello più alto tra i suoi ruoli.

I ruoli di una persona valgono progetto per progetto: si assegnano nel team di ciascun progetto.

## Chi cambia i permessi

L'amministratore dell'app può cambiare la matrice in **Amministrazione → Permessi**. Lo stesso schermo ha **Ripristina default framework**, che riporta tutti i livelli ai valori predefiniti. Le modifiche valgono per tutti i progetti.

## Differenze tra la Guida del framework e l'app

Su alcuni punti la Guida del framework, le skill e i permessi predefiniti dell'app non coincidono. Sono in discussione con il team:

> **Nota:** l'**Analisi Funzionale** la approva il PO del cliente, ma nell'app il PO non è un utente: il permesso Approva va al PM, che registrerà l'approvazione del cliente.

> **Nota:** per **Kickoff Pack** e **Requisiti Consolidati** il framework non prevede un'approvazione formale. L'app dà comunque al PM il livello Approva.

> **Nota:** sul **Risk Register** la Guida indica il TL solo come consultato, ma l'app gli dà il livello Modifica. Sul **Backlog** la Guida da una parte indica TL e AF come responsabili della Fase 4, dall'altra il TL solo come consultato; l'app dà Modifica a entrambi.

> **Nota:** la Guida colloca i **requisiti non funzionali** nel workshop dedicato della Fase 2. Con le skill si definiscono solo nei Requisiti Consolidati, che ricevono le note di quel workshop in aggiornamento.
