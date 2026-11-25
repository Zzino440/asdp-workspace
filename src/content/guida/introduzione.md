ASDP (AI-Assisted Software Development Process) è il metodo con cui DST porta un progetto software dal contratto firmato al codice pronto da sviluppare. Dice cosa si produce in ogni fase, chi lo produce, chi lo approva e in che ordine. L'AI fa il lavoro di stesura; le persone decidono e approvano.

## Perché esiste

I progetti vanno in difficoltà quasi sempre per gli stessi motivi: requisiti poco chiari, decisioni tecniche prese tardi o mai scritte, rischi scoperti a sviluppo avviato. ASDP li affronta con tre scelte:

- **Ogni fase produce documenti precisi**, sempre con la stessa struttura. Chi arriva dopo sa dove trovare cosa.
- **Ogni documento nasce da quello prima**: l'analisi funzionale dai requisiti, l'architettura dall'analisi, il backlog dall'analisi, e così via. Niente si inventa a metà strada.
- **Le decisioni importanti passano da un controllo** (un [gate](/guida/gate)) prima di andare avanti. Correggere su carta costa poco; correggere nel codice costa molto.

## L'idea di base

Il lavoro ruota attorno a tre elementi.

| Elemento | Cosa fa |
|---|---|
| **Documenti per fase** | Ogni fase ha i suoi documenti, con un codice (per esempio [T1.4](/guida/t1-4) per l'Analisi Funzionale). Vivono in questa app, con versioni e cronologia. |
| **Skill AI** | Per ogni documento c'è una skill: un insieme di istruzioni che Claude segue per produrlo dagli input giusti. Vedi [Lanciare una skill](/guida/lanciare-skill). |
| **Persone** | Danno gli input, rispondono alle domande aperte ([D[N]](/guida/domande-aperte)), correggono e approvano. La skill non approva mai. |

> **Nota:** l'AI può fraintendere i termini del dominio del cliente o non conoscere il contesto. Ogni documento prodotto da una skill va letto e corretto da chi ne è responsabile.

## Le 5 fasi in breve

| Fase | Cosa si fa | Documenti principali |
|---|---|---|
| [0 · Setup progetto](/guida/fase-0) | Si prepara e si fa il kickoff con il cliente | [Kickoff Pack](/guida/t0-1a), [Verbale Kickoff](/guida/t0-1) |
| [1 · Analisi](/guida/fase-1) | Si raccolgono e si chiariscono i requisiti, poi si scrive cosa farà il sistema | [Requisiti Consolidati](/guida/p1-3), [Analisi Funzionale](/guida/t1-4) |
| [2 · Architettura](/guida/fase-2) | Si prendono le decisioni tecniche e si fissano le regole del codice | [Architettura](/guida/t2-2), [Contesto Tecnico](/guida/t2-4) |
| [3 · Rischi](/guida/fase-3) | Si valuta cosa può andare storto e chi se ne occupa | [Risk Register](/guida/t3-1) |
| [4 · Preparazione delivery](/guida/fase-4) | Si crea il backlog e, Feature per Feature, si prepara il lavoro per lo sviluppo | [Backlog](/guida/t4-1), [Analisi Tecnica](/guida/t4-2), [Piano di lavoro](/guida/t4-3-index), [Task + Scaffold](/guida/t4-3-part) |

Dopo la Fase 4 si passa all'esecuzione: ogni User Story si sviluppa a partire dai suoi task e dallo scaffold, il codice di partenza validato dal Tech Lead. L'ordine completo è nel [percorso in 5 fasi](/guida/percorso).

## I ruoli in una riga

- **PM (Project Manager)**: guida il progetto, il kickoff, i rischi e approva il backlog.
- **AF (Analista Funzionale)**: traduce le esigenze del cliente in requisiti e analisi funzionale.
- **TL (Tech Lead)**: decide l'architettura, prepara il lavoro tecnico e valida lo scaffold.
- **Designer**: cura l'esperienza utente nelle fasi di analisi e architettura.
- **Sviluppatore**: realizza le User Story partendo da task e scaffold.
- **QA**: verifica che i rilasci rispettino i requisiti.
- **PO del cliente**: decide perimetro e priorità e approva l'Analisi Funzionale.

Il dettaglio di chi scrive e chi approva ogni documento è in [Ruoli e approvazioni](/guida/ruoli).

## Da dove iniziare

**Se sei PM.** Leggi la [Fase 0](/guida/fase-0) per il kickoff e la [Fase 3](/guida/fase-3) per i rischi. Poi il [Backlog](/guida/t4-1), che approvi al gate G1. Per seguire l'avanzamento: [Come si usa questa app](/guida/come-usare-app) e [Stati e frontespizio](/guida/stati).

**Se sei AF.** Parti dalla [Fase 1](/guida/fase-1): i [Requisiti Consolidati](/guida/p1-3) sono il tuo primo documento, l'[Analisi Funzionale](/guida/t1-4) il principale. Impara a gestire le [domande D[N]](/guida/domande-aperte).

**Se sei TL.** Leggi la [Fase 2](/guida/fase-2) e la [Fase 4](/guida/fase-4). Sono le tue: [Architettura](/guida/t2-2), [Contesto Tecnico](/guida/t2-4), [Analisi Tecnica](/guida/t4-2) e i [gate](/guida/gate) G2 e G3.

**Se sviluppi.** Leggi [Task + Scaffold](/guida/t4-3-part) e il [Piano di lavoro](/guida/t4-3-index): dicono cosa puoi cambiare e cosa no. Poi [Collegare Claude](/guida/collegare-claude).

Per tutti: le parole che non conosci sono nel [glossario](/guida/glossario).
