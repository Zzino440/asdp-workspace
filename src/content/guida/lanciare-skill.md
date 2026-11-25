Una **skill** è un'istruzione pronta che insegna a Claude a produrre un documento ASDP: segue il template, rispetta le regole del framework e si ferma nei punti in cui devi decidere tu. Ogni documento del percorso ha la sua skill. Questa pagina spiega come passare dalla mappa del progetto al documento finito.

Prima di iniziare, [collega Claude](/guida/collegare-claude) all'app e verifica di avere il plugin `asdp`.

## 1. Scegli il passo

Nella mappa del progetto (vedi [Come si usa questa app](/guida/come-usare-app)) trovi la fase corrente e i documenti che mancano. La pagina della Guida di ogni documento dice chi lo scrive, quali input servono e quale skill usare.

| Documento | Skill |
|---|---|
| [Kickoff Pack](/guida/t0-1a) e [Verbale Kickoff](/guida/t0-1) | `asdp:t0-1-kickoff` |
| [Requisiti Consolidati](/guida/p1-3) | `asdp:p1-3-requirements-consolidation` |
| [Analisi Funzionale](/guida/t1-4) | `asdp:t1-4-functional-analysis` |
| [Architettura](/guida/t2-2) | `asdp:t2-2-architecture` |
| [Contesto Tecnico](/guida/t2-4) | `asdp:t2-4-technical-context` |
| [Risk Register](/guida/t3-1) | `asdp:t3-1-risk-register` |
| [Backlog](/guida/t4-1) | `asdp:t4-1-user-story-backlog` |
| [Analisi Tecnica](/guida/t4-2) | `asdp:t4-2-technical-analysis` |
| [Piano di lavoro](/guida/t4-3-index) | `asdp:t4-3-index-work-plan` |
| [Task + Scaffold](/guida/t4-3-part) | `asdp:t4-3-part-task-scaffold` |

Se hai il plugin `asdp-project`, puoi chiedere direttamente "cosa faccio adesso?" con `/asdp-project:metodo`: Claude guarda la fase e lo stato dei documenti e ti propone un passo.

## 2. Prepara gli input

- **Documenti già nell'app** (per esempio il consolidato per la T1.4): non serve allegarli. Indica a Claude il codice del progetto e il documento: li legge dal connettore.
- **Materiale esterno** (trascrizioni, offerta, note dei workshop): allegalo in chat, oppure mettilo nella cartella aperta in Claude Code.
- **Il tipo di progetto**, greenfield o evolutiva, se la skill lo chiede.

> **Attenzione:** niente dati personali reali o dati di produzione nei documenti e nelle conversazioni.

## 3. Chiedi a Claude

Scrivi in linguaggio naturale. Nomina il progetto, la skill o il documento, e gli input. Alcuni esempi:

> Usa p1-3-requirements-consolidation sulla trascrizione allegata. Progetto ABC, greenfield.

> Nel progetto ABC leggi i Requisiti Consolidati e crea l'Analisi Funzionale. È un'evolutiva.

> Deriva il backlog T4.1 dall'Analisi Funzionale del progetto ABC.

In Claude Code puoi anche usare il comando, per esempio `/asdp:t4-2-technical-analysis` seguito dalla Feature (F02).

## 4. Durante il lavoro: i gate

Molte skill non scrivono tutto in un colpo: si fermano per farti decidere.

- **Gate A**: prima di scrivere, Claude propone la struttura in chat sotto il titolo **AZIONE RICHIESTA** e si ferma. Rispondi approvando, correggendo righe precise o chiedendo di spostare un elemento. Una risposta vaga non basta: Claude ti chiede quali righe.
- **Gate B**: Claude scrive il documento, lo controlla e ti riporta l'esito con i conteggi.

Non tutte le skill si fermano negli stessi punti: la tabella completa è in [Gate](/guida/gate). Se vuoi tutto in un passaggio, chiedi la modalità `diretto` dove esiste.

Le domande che la skill non può risolvere da sola restano nel documento come [domande D[N]](/guida/domande-aperte).

## 5. Dove finisce il risultato

| Caso | Dove finisce |
|---|---|
| Documento che esiste già nell'app | Claude può salvarlo dal connettore: è un nuovo commit a tuo nome, visibile in **Cronologia** |
| Documento nuovo, in Claude Code | Un file nella cartella di lavoro |
| Documento nuovo, in claude.ai o Desktop | Il testo in chat, da scaricare |

> **Nota:** il salvataggio dei documenti nuovi direttamente nell'app è in arrivo. Oggi il file va aggiunto alla repo documenti del progetto da chi ha accesso a GitLab; l'app lo indicizza da sola e il documento compare nella mappa.

## 6. Poi, nell'app

1. **Controlla.** Apri il documento e leggilo. In **Cronologia** vedi chi l'ha salvato e cosa è cambiato rispetto alla versione precedente.
2. **Completa.** Rispondi alle [domande D[N]](/guida/domande-aperte), correggi a mano dove serve con **Modifica testo** e compila i dati in **Tutti i dettagli** (per esempio la scadenza). Se hai risposto a delle domande, rilancia la skill in [aggiornamento](/guida/aggiornare-documento).
3. **Segna lo stato.** Quando il documento è finito, portalo a **Completo**.
4. **Manda in approvazione.** L'invio in approvazione dall'app è in arrivo. Per ora vedi chi approva in [Ruoli e approvazioni](/guida/ruoli) e come funziona lo stato Approvato in [Stati e frontespizio](/guida/stati).
