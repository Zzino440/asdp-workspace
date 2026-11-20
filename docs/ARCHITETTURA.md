# ASDP Workspace — Architettura

Stato: bozza v0.1 · 2026-11-20 · owner: Lorenzo Belli

## 1. Scopo

App web per gestire i progetti DST con il framework ASDP (plugin `asdp` della marketplace
`dst-claude-skills`, fasi 0–4 + delivery per Feature). Ogni persona vede i documenti che il suo
ruolo nel progetto le permette, li modifica a mano o con l'AI, li porta ai gate e li approva.

Problemi che risolve (call Lorenzo–Denis del 2026-11-18):

| Problema | Risposta |
|---|---|
| PM senza Git e senza accesso al repository | Solo browser; l'app scrive su GitLab con un service account |
| Skill da installare sul PC | Le skill partono dall'app (cloud) oppure da Claude Code in locale, a scelta |
| Framework copiato in ogni progetto | Una sola fonte versionata (plugin `asdp`); ogni progetto dichiara la versione |
| SharePoint senza versioning | GitLab è la fonte; su SharePoint si pubblicano solo copie in sola lettura degli approvati |
| File sensibili (`reserved`) | Area Riservati fuori da Git, mai inviata all'AI |
| Troppe domande sparse nei documenti | Vista unica delle `D[N]` di progetto, risposte in blocco, rigenerazione in aggiornamento |

## 2. Stack

| Livello | Scelta | Perché |
|---|---|---|
| App | Next.js 16 (App Router, TypeScript, Cache Components) | Un linguaggio e un repo per UI e backend; tipi condivisi; deploy nativo su Vercel; lo stack che gli agenti AI conoscono meglio |
| UI | Tailwind 4 + shadcn/ui (Base UI) + lucide | Componenti nel repo, modificabili; stile vicino al design Stitch |
| Dati e auth | Supabase: Postgres + RLS, Auth, Storage, Realtime | Permessi per ruolo applicati nel DB; login email in dev, Microsoft Entra in produzione |
| Documenti | GitLab DST, un Project `adsp` per progetto | Unica copia, versioning, già usato dal team tecnico |
| AI | Anthropic Managed Agents (skill) + Messages API (modifiche puntuali) | Nessuna infrastruttura per eseguire le skill; sessioni lunghe asincrone |
| Deploy | Vercel | Preview per branch, zero configurazione |
| Validazione | Zod | Input di form e webhook |

Scelta rispetto a Spring Boot + Angular: Java su Vercel gira solo come container (avvii a freddo
lenti), servirebbero due repo e due deploy, e il backend userebbe Supabase con la service role
perdendo la RLS. Con un solo manutentore che sviluppa con agenti AI, TypeScript end-to-end costa
meno.

## 3. Componenti

```
 Browser (PM, TL, AF, …)                                   Claude Code locale (TL/AF)
        │ HTTPS                                                   │ git push su adsp
        ▼                                                         ▼
 ┌──────────────────────── Vercel: Next.js ────────────────┐   ┌──────────────┐
 │ UI (RSC + client)  │ Route handlers / Server actions    │◀──│ GitLab DST   │ webhook push
 │                    │  - docs: read/commit via GitLab API │──▶│ Project adsp │ (unica copia)
 │                    │  - indexer (webhook GitLab)         │   └──────────────┘
 │                    │  - skill runs (start/resume/webhook)│──▶ Anthropic Managed Agents
 │                    │  - "Modifica con AI" (Messages API) │    (skill asdp via Skills API,
 └────────────────────┴─────────────────────────────────────┘     output in /mnt/session/outputs)
        │ supabase-js (JWT utente → RLS)
        ▼
 Supabase: Auth · Postgres (indice + dati app, RLS) · Storage (riservati, evidenze) · Realtime
```

### Chi è fonte di cosa

| Dato | Fonte | Note |
|---|---|---|
| Contenuto e stato dei documenti | GitLab `adsp` | Il frontespizio GUIDA-FRONT contiene stato, versione e approvazione |
| Indice documenti, `D[N]` estratte | Supabase (derivato) | Ricostruito dall'indexer a ogni push; non si modifica a mano |
| Utenti, ruoli per progetto, permessi, gate, run, commenti, risposte `D[N]` | Supabase | Dati che esistono solo nell'app |
| File riservati, evidenze di approvazione | Supabase Storage | Fuori da Git; i riservati non vanno mai all'AI |
| Framework (skill `asdp`) | repo `dst-claude-skills` | Versione fissata per progetto, pubblicata sulla Skills API |

## 4. Flussi

1. **Salva documento.** Server action → GitLab Commits API con il `last_commit_id` del file
   aperto (concorrenza ottimistica). In caso di conflitto: banner "modificato su GitLab" con
   Ricarica/Confronta. Commit fatto dal service account con `author_name`/`author_email`
   dell'utente.
2. **Indicizzazione.** Webhook push di GitLab (verificato con `X-Gitlab-Token`) → per ogni `.md`
   cambiato sotto `asdp/`: lettura, parsing del frontespizio, estrazione delle `D[N]` → upsert su
   `documents` e `open_questions`. Le modifiche fatte da Claude Code in locale entrano così senza
   integrazioni.
3. **Skill in cloud.** Avvio asincrono dalla UI → upload degli input come `file` resource →
   sessione Managed Agents con le skill `asdp` della versione del progetto → gli eventi
   aggiornano `skill_runs` (Realtime verso la UI). Ai gate A/B delle skill la sessione si ferma
   (`awaiting_review`); l'utente approva o chiede modifiche dalla UI. A fine run l'app scarica gli
   output da `/mnt/session/outputs` e li committa su GitLab (flusso 1). Il montaggio di repository
   e la scoperta di `.claude/skills` dei Managed Agents funzionano solo con GitHub: input e skill
   si passano in modo esplicito.
4. **Skill in locale.** Nessuna integrazione: clone di `adsp` + plugin `asdp` in Claude Code →
   push → flusso 2. È la configurazione minima.
5. **Gate.** Invio → checklist → decisione. L'approvazione è un commit che aggiorna nel
   frontespizio `stato`, `approvato_da`, `approvato_il`, `versione_approvata`, `gate`; l'hash del
   commit è l'evidenza. L'approvazione del PO cliente si registra come esterna, con upload
   dell'evidenza.
6. **Modifica con AI.** Una chiamata Messages API sulla selezione → testo proposto → diff in UI →
   Accetta = salvataggio normale (flusso 1).

## 5. Modello dati

Già nello schema (`supabase/migrations/20261120000000_core.sql`):

| Tabella | Contenuto |
|---|---|
| `profiles` | Utente (1:1 con `auth.users`), `is_admin`, stato |
| `projects` | Codice, nome, cliente, natura, stato progetto, fase corrente, versione framework, Project GitLab |
| `project_members` | Ruoli ASDP della persona nel progetto (`asdp_role[]`: pm, tl, af, designer, developer, qa) |
| `document_types` | Catalogo dei documenti ASDP con cartella e skill che li produce |
| `role_permissions` | Livello `none/view/edit/approve` per ruolo e tipo documento, default dal RACI |

Nelle milestone: `documents`, `open_questions`, `gates`, `skill_runs`, `comments`,
`framework_versions`, `reserved_files`, `audit_log`.

## 6. Sicurezza

- **RLS è l'unico punto dei permessi.** Il codice usa il client con il JWT dell'utente; funzioni
  `is_admin()`, `is_project_member()`, `has_project_role()`, `shares_project_with()`. Un utente con
  più ruoli ottiene l'unione dei permessi.
- **Segreti solo lato server** (token GitLab, chiave Anthropic, service role Supabase): mai con
  prefisso `NEXT_PUBLIC_`.
- **Service role Supabase** solo per i webhook (indexer, eventi delle skill), che non hanno un
  utente.
- **Webhook firmati**: GitLab con secret token, Anthropic con verifica HMAC.
- **Riservati**: bucket privato con policy per persona; esclusi da ogni input AI.
- **Utenti su invito**: registrazione libera disattivata in produzione.

## 7. Milestone

| # | Contenuto |
|---|---|
| 0 | **Fatto**: scaffold, login, layout, schema base con RLS, elenco progetti |
| 1 | Progetti, team, ruoli e matrice permessi (amministrazione) |
| 2 | Documenti: lettura/commit GitLab, indexer, editor Markdown con frontespizio come form, versioni e diff |
| 3 | Gate e approvazioni |
| 4 | Skill in cloud con gate A/B; sincronizzazione versioni framework → Skills API |
| 5 | Modifica con AI, Domande aperte di progetto |
| 6 | Riservati, Pubblica su SharePoint (Microsoft Graph), login Microsoft Entra, deploy Vercel |

## 8. Punti aperti

- Autore dei commit: service account con `author` dell'utente oppure token per utente.
- Skill che chiedono input interattivi oltre ai gate A/B: da verificare sul primo run reale.
- Costi dei Managed Agents (runtime di sessione + token) per progetto.
- Libreria dell'editor che conservi il Markdown senza perdite (tabelle, frontespizio).
- Teams esce dal giro dei documenti ASDP: diverge dalla Guida §18.4.3, va deciso con il team.
