Un progetto ASDP attraversa cinque fasi, dal kickoff al lavoro pronto per lo sviluppo. Ogni fase produce documenti che fanno da input alla successiva. Questa pagina mostra le fasi, i documenti e l'ordine in cui si fanno.

## Le fasi e i documenti

| Fase | Documento | Chi lo scrive | Chi approva |
|---|---|---|---|
| [0 · Setup progetto](/guida/fase-0) | [T0.1a Kickoff Pack](/guida/t0-1a) | PM | Nessuna approvazione formale |
| | [T0.1 Verbale Kickoff](/guida/t0-1) | PM | PM (verbale distribuito) |
| [1 · Analisi](/guida/fase-1) | [P1.3 Requisiti Consolidati](/guida/p1-3) | AF | Nessun gate formale; lo rivede il PM |
| | [T1.4 Analisi Funzionale](/guida/t1-4) | AF | PO del cliente, dopo la revisione interna del TL |
| [2 · Architettura](/guida/fase-2) | [T2.2 Architettura](/guida/t2-2) | TL | TL |
| | [T2.4 Contesto Tecnico](/guida/t2-4) | TL | TL |
| [3 · Rischi](/guida/fase-3) | [T3.1 Risk Register](/guida/t3-1) | PM, con il TL | PM |
| [4 · Preparazione delivery](/guida/fase-4) | [T4.1 Backlog](/guida/t4-1) | AF | PM, al gate G1 |
| | [T4.2 Analisi Tecnica](/guida/t4-2), una per Feature | TL | TL, al gate G2 |
| | [T4.3-INDEX Piano di lavoro](/guida/t4-3-index), uno per Feature | TL | TL, al gate G2 |
| | [T4.3-part Task + Scaffold](/guida/t4-3-part), uno per User Story | TL | TL, al gate G3 |

Ogni documento si produce con una skill dedicata: la trovi nella pagina del documento. I ruoli completi sono in [Ruoli e approvazioni](/guida/ruoli).

## L'ordine dei passi

1. **Verbale del kickoff.** Fissa date, persone, decisioni e azioni.
2. **Requisiti Consolidati (P1.3).** Mettono in ordine quello che il cliente ha detto, verbale compreso.
3. **Analisi Funzionale (T1.4).** Nasce solo dai Requisiti Consolidati: è il suo unico input.
4. **Architettura (T2.2).** Parte dall'Analisi Funzionale e dai suoi requisiti non funzionali.
5. **Contesto Tecnico (T2.4).** Si ricava dal codice esistente; in un progetto nuovo, dall'Architettura.
6. **Risk Register (T3.1).** Usa Analisi Funzionale e Architettura.
7. **Backlog (T4.1).** Deriva le User Story dall'Analisi Funzionale e si approva al gate G1.
8. **Per ogni Feature che entra in sprint:**
   1. Analisi Tecnica (T4.2);
   2. Piano di lavoro (T4.3-INDEX);
   3. gate **G2**: T4.2 e piano si approvano insieme, nella stessa seduta;
   4. Task + Scaffold (T4.3-part), una User Story alla volta;
   5. gate **G3** per ogni User Story.
9. **Sviluppo** della User Story.

Questo è l'**ordine consigliato**: è quello che l'app propone come Prossimo passo. I [gate](/guida/gate) sono spiegati nella pagina dedicata.

## Cosa si può anticipare

Alcuni documenti non dipendono da quelli della fase prima. Il caso più comune è il **Backlog**: richiede solo l'Analisi Funzionale, quindi si può avviare appena è pronta, senza aspettare Architettura, Contesto Tecnico e Risk Register.

Le Fasi 2 e 3 però **non si saltano**: restano nel percorso e prima o poi vanno completate. Alcuni passi successivi non partono senza:

| Per fare | Serve prima |
|---|---|
| [Backlog (T4.1)](/guida/t4-1) | [Analisi Funzionale](/guida/t1-4) |
| [Risk Register (T3.1)](/guida/t3-1) | Analisi Funzionale e [Architettura](/guida/t2-2) |
| [Analisi Tecnica (T4.2)](/guida/t4-2) | Backlog e Architettura |
| [Piano di lavoro (T4.3-INDEX)](/guida/t4-3-index) | Analisi Tecnica della stessa Feature |
| [Task + Scaffold (T4.3-part)](/guida/t4-3-part) | Piano di lavoro e [Contesto Tecnico](/guida/t2-4) |

Nella mappa del progetto il passo consigliato resta in alto. Sotto, **Puoi anticipare** elenca i passi che si possono fare già adesso. Anticipare un documento non cambia la fase del progetto: la fase avanza solo con **Passa alla Fase N**, quando quella attuale è completa. Accanto a un documento che non si può ancora fare compare **Serve prima**, con i documenti mancanti.

> **Nota:** se il backlog nasce prima del Risk Register, le User Story non sono ancora collegate ai rischi. Quando il registro è pronto, rilancia la skill del backlog sul backlog esistente, prima del gate G1: collega le storie ai rischi senza cambiare gli ID. Dopo il G1 il CSV non si tocca più e Claude elenca i collegamenti da fare a mano.

> **Nota:** l'Analisi Tecnica si fa quando la Feature entra in sprint, non prima. Un contratto tecnico scritto con molto anticipo invecchia male.

## Il ciclo dei requisiti non funzionali

I requisiti non funzionali (NFR: prestazioni, sicurezza, disponibilità, volumi…) si definiscono in un solo posto: i [Requisiti Consolidati](/guida/p1-3). Gli altri documenti li riprendono e non ne aggiungono di nuovi. Il ciclo è questo:

1. Durante l'Architettura, la skill segnala le qualità che servono alle decisioni tecniche ma che nessuno ha dichiarato. Diventano **domande per il workshop NFR**, non requisiti inventati.
2. Si fa il **workshop NFR** con il cliente.
3. Le note del workshop entrano nei **Requisiti Consolidati**, in modalità aggiornamento.
4. Si aggiorna l'**Analisi Funzionale**, che riporta gli NFR.
5. Si rivede l'**Architettura**.

> **Nota:** la Guida del framework raccoglie gli NFR nel workshop della Fase 2. Con le skill il workshop resta, ma le risposte tornano sempre nei Requisiti Consolidati.

## Le revisioni a cascata

Quando un documento a monte cambia, quelli a valle vanno aggiornati, nello stesso ordine del percorso. Le skill hanno una modalità aggiornamento: ripartono dal documento esistente, comprese le tue modifiche a mano, e cambiano solo ciò che serve. Vedi [Aggiornare un documento](/guida/aggiornare-documento).

Regole da ricordare:

- **Si parte sempre dalla fonte.** Un requisito nuovo o cambiato si scrive prima nei Requisiti Consolidati, poi si aggiorna l'Analisi Funzionale. La skill dell'analisi funzionale non accetta requisiti nuovi detti in chat.
- **Gli identificativi non cambiano mai.** Requisiti, domande D[N], casi d'uso e User Story mantengono il loro ID, anche quando vengono ritirati. I documenti a valle li citano.
- **Dopo un gate il documento si congela.** Dopo il G1 le variazioni al backlog diventano proposte da approvare. Dopo il G2 il piano cambia solo con una nuova versione chiesta esplicitamente, e il G2 va rifatto. Lo stesso vale per i Task + Scaffold dopo il G3.

> **Attenzione:** se un difetto tocca un documento già approvato, il documento torna In corso e l'approvazione va rifatta.
