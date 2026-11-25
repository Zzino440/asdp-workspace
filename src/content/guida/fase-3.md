La Fase 3 guarda avanti: cosa può far fallire il progetto, quanto pesa e chi se ne occupa. Il risultato è il [Risk Register](/guida/t3-1), un documento vivo che si aggiorna per tutta la durata del progetto.

## Obiettivo

Identificare in anticipo i rischi e definire come mitigarli, prima di pianificare il lavoro in [Preparazione delivery](/guida/fase-4).

## Chi è coinvolto

| Ruolo | Cosa fa |
|---|---|
| PM | Responsabile della fase: scrive il registro con il TL, decide le valutazioni, lo approva e lo condivide |
| TL | Porta i rischi tecnici e contribuisce alle mitigazioni |
| AF, QA | Consultati |
| Sponsor e PO del cliente | Ricevono il registro condiviso |

## I passi

### 1. Raccogliere il contesto

Servono l'[Analisi Funzionale](/guida/t1-4) e l'[Architettura](/guida/t2-2). Aiutano anche le note del PM su team, cliente e contratto, il kickoff e la stima d'offerta, se c'è.

### 2. Generare il registro

Il PM lancia `/asdp:t3-1-risk-register`. La skill raccoglie i rischi già individuati altrove (nel kickoff, nei rischi tecnici dell'Architettura, nei punti aperti e nelle assunzioni dell'Analisi Funzionale) e ne propone di nuovi.

Al **gate A** propone in chat, per ogni rischio: categoria, probabilità e impatto motivati, segnale di allarme, mitigazione e owner. Il PM corregge e decide. Poi la skill scrive il documento e lo controlla (**gate B**).

### 3. Condividere

Il PM approva il registro e lo condivide con sponsor e PO del cliente. La skill non approva: lo stato resta In corso finché il PM non lo condivide.

> **Nota:** il Risk Register è l'**unico punto in cui i rischi si valutano**. Kickoff, Architettura e Analisi Tecnica li individuano soltanto; backlog e Analisi Tecnica li citano per ID senza rivalutarli.

## Categorie e punteggio

I rischi si dividono in cinque categorie, sempre tutte presenti. Una categoria vuota dice il motivo.

| Categoria | Esempi |
|---|---|
| **T · Tecnici** | Complessità, integrazioni con sistemi esistenti, prestazioni, debito tecnico |
| **O · Organizzativi** | Competenze, turnover, comunicazione, priorità in conflitto |
| **B · Business e cliente** | Requisiti instabili, stakeholder non disponibili, aspettative non realistiche |
| **C · Contrattuali** | Perimetro che cresce, criteri di accettazione vaghi, penali, terze parti |
| **S · Sicurezza** | Dati sensibili, compliance, accessi non autorizzati |

Il punteggio è **probabilità × impatto**, ciascuno da 1 a 5:

| Punteggio | Livello | Cosa serve |
|---|---|---|
| 15 o più | Critico | Azione immediata |
| 10–14 | Alto | Piano di mitigazione obbligatorio |
| 5–9 | Medio | Monitoraggio attivo |
| sotto 5 | Basso | Accettabile |

Da 10 in su mitigazione e owner sono obbligatori. Le stime basate su ipotesi su team o cliente sono marcate come assunzioni.

## La fase è chiusa quando…

Dalla checklist del framework:

- [ ] Rischi identificati (tutte le categorie)
- [ ] Risk Register compilato
- [ ] Mitigazioni definite
- [ ] Condiviso con stakeholder

Vedi anche [Gate](/guida/gate).

## Errori tipici

| Errore | Meglio così |
|---|---|
| Fidarsi solo della lista proposta dall'AI | L'AI non conosce il cliente né le dinamiche interne: il PM integra con ciò che sa |
| Lasciare una categoria vuota senza spiegazione | Si scrive perché non ci sono rischi in quella categoria |
| Rischio alto senza mitigazione o owner | Da punteggio 10 entrambi sono obbligatori, con un'azione verificabile |
| Rivalutare i rischi in altri documenti | Si valutano solo qui; altrove si citano per ID |
| Riassegnare l'ID di un rischio superato | Gli ID non cambiano: il rischio resta, con stato Chiuso |
| Compilare il registro e dimenticarlo | Si fissa una frequenza di revisione e lo si aggiorna |
