# ASDP Workspace

App web per gestire i progetti DST con il framework ASDP: progetti, documenti per ruolo, gate e
approvazioni, esecuzione delle skill `asdp`. Architettura e milestone in
[`docs/ARCHITETTURA.md`](docs/ARCHITETTURA.md); regole per gli agenti AI in [`AGENTS.md`](AGENTS.md).

Stack: Next.js 16 · Supabase · Tailwind + shadcn/ui · Vercel.

## Avvio in locale

Requisiti: Node 22+, pnpm, Docker Desktop avviato (per Supabase locale).

```powershell
pnpm install
pnpm exec supabase start
```

`supabase start` stampa URL e chiavi. Copia `.env.example` in `.env.local` e compila
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (la "Publishable key").

```powershell
pnpm exec supabase db reset
pnpm dev
```

`db reset` applica le migrazioni e carica `supabase/seed.sql`: utenti di prova e password sono
indicati in testa al file. Apri http://localhost:3000 e accedi.

## Senza Docker: progetto Supabase in cloud

1. Crea un progetto su supabase.com e copia URL e Publishable key in `.env.local`.
2. Collega e applica lo schema:

```powershell
pnpm exec supabase link --project-ref <ref-progetto>
pnpm exec supabase db push
```

Il seed non va caricato su un progetto reale: crea gli utenti da Authentication e assegna
progetti e ruoli dalla tabella `project_members`.

## Comandi

| Comando | Cosa fa |
|---|---|
| `pnpm dev` | Server di sviluppo |
| `pnpm build` | Build di produzione |
| `pnpm lint` | ESLint |
| `pnpm exec tsc --noEmit` | Controllo dei tipi |
| `pnpm exec supabase migration new <nome>` | Nuova migrazione |
