<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ASDP Workspace — agent rules

Web app that manages DST projects through the ASDP framework. Read `docs/ARCHITETTURA.md`
before any non-trivial change: it defines the sources of truth, the flows and the milestones.

## Commands

| Task | Command |
|---|---|
| Dev server | `pnpm dev` |
| Typecheck | `pnpm exec tsc --noEmit` |
| Lint | `pnpm lint` |
| Build | `pnpm build` |
| Local Supabase (needs Docker) | `pnpm exec supabase start` / `pnpm exec supabase db reset` |
| New migration | `pnpm exec supabase migration new <name>` |

Run typecheck, lint and build before declaring a change done.

## Stack facts that differ from older defaults

- Next.js 16: `src/proxy.ts` replaces `middleware.ts`; Cache Components is on, so any read of
  `cookies()`/session/DB must sit behind `<Suspense>` (see the layout in `src/app/(app)/layout.tsx`).
- Supabase via `@supabase/ssr`: server client in `src/lib/supabase/server.ts`, session refresh in
  `src/lib/supabase/proxy.ts`. Use `auth.getClaims()`, not `getSession()`, on the server.
- shadcn/ui uses Base UI primitives (no `asChild`); `cn` comes from the `cn` package.
- Zod 4 (`z.email()`, not `z.string().email()`).

## Rules

- **Permissions live only in Postgres RLS.** Query with the user's client; never filter by user
  in TypeScript as a security measure, never use the service role outside webhook handlers.
- **Documents live in GitLab**, not in Supabase. Supabase holds an index derived from GitLab and
  app-only data (see ARCHITETTURA §3).
- **Schema changes only through new migration files** in `supabase/migrations/`; never edit an
  applied migration.
- **Language**: UI text and team docs in Italian; code, identifiers and code comments may be
  Italian or English but stay consistent within a file.
- **Secrets** only in server env vars without the `NEXT_PUBLIC_` prefix.
- Minimal changes: no unrequested abstractions, options or dependencies.

## Layout

```
src/app/login/            login page + server actions (login, logout)
src/app/(app)/            authenticated area: layout with sidebar, one folder per section
src/components/ui/        shadcn components (generated, edit only when needed)
src/lib/supabase/         Supabase clients
src/proxy.ts              auth gate and session refresh
supabase/migrations/      schema, RLS, framework reference data
supabase/seed.sql         local-only test users and projects
docs/ARCHITETTURA.md      architecture and milestones
```
