Quando una skill trova qualcosa che le fonti non dicono, non lo inventa: scrive una **domanda aperta**, numerata `D1`, `D2`, `D3`… Le domande stanno nel documento, subito sotto l'elemento che bloccano, e si chiudono scegliendo una risposta. Questa pagina spiega come sono fatte e come si risponde.

## Dove si trovano

Le domande nascono soprattutto in questi documenti:

- **[Requisiti Consolidati](/guida/p1-3)**: i dubbi su bisogni, attori, requisiti, regole e requisiti non funzionali.
- **[Analisi Tecnica](/guida/t4-2)**: le lacune tecniche di una Feature, per esempio un percorso di file o un dato che manca.
- **[Analisi Funzionale](/guida/t1-4)**: non ne crea di nuove. Riporta invariate quelle del consolidato nella sezione dei punti aperti.

Nei Requisiti Consolidati la riga di riepilogo in testa al documento dice quante **Domande aperte** restano.

## Come sono fatte

Ogni domanda segue l'elemento incerto, segnato **Da chiarire**. Ha un titolo, il motivo per cui conta, la domanda e alcune opzioni con una casella. Per esempio:

```text
> ❓ Da chiarire — chi può annullare una richiesta già approvata

#### D3 · Annullamento delle richieste approvate

> Perché conta: cambia i permessi del Responsabile e il flusso di approvazione.

Chi può annullare una richiesta già approvata?

- [ ] Solo il Responsabile
- [ ] Il Responsabile e il dipendente che l'ha inviata
- [ ] Da decidere in fase di analisi
- [ ] Altro: ___________
```

## Come si risponde oggi

1. Leggi la domanda nel documento, nell'app, e premi **Rispondi** accanto al suo titolo (lo vede chi può modificare il documento).
2. Scegli **una sola** opzione e premi **Salva la risposta**. Se nessuna opzione va bene, scegli **Altro** e scrivi la risposta. La domanda diventa **Risposta da applicare**; per cambiare idea c'è **Cambia risposta**.
3. L'app spunta la casella e salva il documento: è un commit a tuo nome, visibile in **Cronologia**.

   In alternativa puoi chiedere a Claude collegato di spuntare la casella, per esempio:

   > Nei Requisiti Consolidati del progetto ABC spunta la seconda opzione della D3.
4. Quando hai risposto alle domande che ti servono, rilancia la skill in [aggiornamento](/guida/aggiornare-documento), per esempio:

   > Nel progetto ABC ho risposto ad alcune domande D[N] dei Requisiti Consolidati. Aggiorna il documento con le risposte, senza toccare le domande ancora aperte.

La skill porta ogni risposta dentro l'elemento a cui si riferisce e lascia una traccia, per esempio `→ risolto da D3`. Le domande senza risposta restano come sono.

Nella pagina del documento i punti con la traccia sono evidenziati in verde con l'etichetta **Risolta · D3** (o **Aggiornato su indicazione utente**), così si vede subito cosa è cambiato rispetto al documento di partenza. Il pannello **Risolte**, sotto le domande, li elenca: un clic porta al punto. Nel PDF e nel Word pubblicati resta la traccia come testo.

> **Nota:** la casella si spunta anche in **Modifica testo**: fai clic sulla casella dell'opzione e poi **Salva**. Chi lavora sui file in Claude Code o in un editor di testo cambia `- [ ]` in `- [x]`. Nell'Analisi Funzionale **Rispondi** non c'è: le domande si rispondono nei Requisiti Consolidati.

Puoi anche rispondere in chat, senza spuntare nulla: "REQ-04 vale solo per gli Operatori". La skill applica l'indicazione e lascia la traccia `→ aggiornato su indicazione utente`. Se l'indicazione è ambigua, prima ti chiede.

## Le regole

- **Una casella per domanda.** Se ne spunti più di una, la skill si ferma e ti chiede di correggere il documento.
- **Nessuna casella**, oppure **Da decidere in fase di analisi**: la domanda resta aperta.
- **Altro:** risolve la domanda solo se è l'unica casella spuntata e contiene un testo vero.
- **I numeri non cambiano mai.** Una domanda chiusa o ritirata tiene il suo numero, e il numero non si riusa. Lo stesso vale per gli ID dei requisiti (`REQ-04`): i documenti successivi li citano.

## Dove si risolvono

Una domanda si chiude nel documento in cui è nata. Se la incontri altrove, torna alla fonte.

| La vedi in | Si risponde in | Poi |
|---|---|---|
| Requisiti Consolidati | Requisiti Consolidati | Rilancia la p1-3 in aggiornamento |
| Analisi Funzionale | Requisiti Consolidati, non nella T1.4 | Aggiorna prima il consolidato, poi la T1.4 |
| Analisi Tecnica | Analisi Tecnica | Rilancia la t4-2, prima del gate G2 |

Nella T1.4 una casella spuntata non basta: la skill si ferma e ti rimanda al consolidato, perché i requisiti vivono solo lì.

Nell'Analisi Tecnica chiudi tutte le domande prima del [gate G2](/guida/gate). Il Piano di lavoro non parte con domande aperte, e una domanda che passa il gate diventa un task rifiutato più avanti, molto più caro da correggere.

> **Nell'app:** nella scheda **Percorso** del progetto ogni documento dice quante domande ha; **Vedi le domande** le elenca, aperte o con risposta. Per un documento con risposte da applicare, **Applica le risposte** copia la richiesta pronta per rilanciare la skill. Nell'Analisi Funzionale le domande copiate dal consolidato compaiono come **punti aperti dal consolidato**: si rispondono nei Requisiti Consolidati. Il conteggio si aggiorna quando il documento viene salvato.
