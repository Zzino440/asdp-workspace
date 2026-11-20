<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ASDP Workspace — agent rules

Web app that manages DST projects through the ASDP framework. Read `docs/ARCHITETTURA.md`
before any non-trivial change: it defines the sources of truth, the flows and the milestones.

**Work log**: read `docs/STATO.md` at the start of every session: it says where the work stopped,
what is in progress and what comes next. Update it at the end of every step (also in the middle
of a plan), including decisions, environments touched and what is not committed yet. Unplanned
items go to `TODO.md`.

## Commands

| Task | Command |
|---|---|
| Dev server | `pnpm dev` |
| Typecheck | `pnpm exec tsc --noEmit` |
| Lint | `pnpm lint` |
| Build | `pnpm build` |
| Local Supabase (needs Docker) | `pnpm exec supabase start` / `pnpm exec supabase db reset` |
| RLS tests (pgTAP, local Supabase) | `pnpm exec supabase test db` |
| New migration | `pnpm exec supabase migration new <name>` |
| Pull design system from Stitch (needs `STITCH_API_KEY`) | `pnpm design:sync` |

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
  in TypeScript as a security measure. The service role is allowed only in webhook handlers and
  in the account actions of Amministratore → Utenti (invite, resend access, delete;
  `src/lib/supabase/admin.ts`, after checking `is_admin()` with
  the user's client); key in `SUPABASE_SERVICE_ROLE_KEY`.
- **Documents live in GitLab**, not in Supabase. Supabase holds an index derived from GitLab and
  app-only data (see ARCHITETTURA §3).
- **One service layer for documents**: `src/lib/documents/` (server-only) does every document
  read/write with the user's Supabase client. Server actions and the MCP tools are thin adapters
  on top of it; never call GitLab from a page, action or tool directly.
- **Schema changes only through new migration files** in `supabase/migrations/`; never edit an
  applied migration.
- **Language**: UI text and team docs in Italian; code, identifiers and code comments may be
  Italian or English but stay consistent within a file.
- **Secrets** only in server env vars without the `NEXT_PUBLIC_` prefix.
- Minimal changes: no unrequested abstractions, options or dependencies.
- **Design system**: read `DESIGN.md` before any UI work. Use only its tokens (CSS variables in
  `src/app/globals.css`, Tailwind classes built on them); no hard-coded colors, radii or spacing.
  The source is Stitch: never edit `DESIGN.md` by hand, run `pnpm design:sync` and then align
  `globals.css` to the diff. Stitch screens are layout references, not code to copy.
- **Simple code over Stitch fidelity**: Stitch is a guideline, not a spec. Prefer stock shadcn/ui
  components and the simplest code, even if the result drifts a little from the Stitch screen.
  The tokens stay mandatory; the design system is realigned later, in Stitch, if needed.

## Versions and changelog

Semver, same rules as `dst-claude-skills`. The only source is `version` in `package.json`; the
sidebar and the MCP `serverInfo` read it through `src/lib/version.ts`.

- `PATCH`: fixes and text corrections. `MINOR`: new features (a milestone piece, a new MCP tool,
  a new screen). `MAJOR`: breaking changes (e.g. an MCP tool removed or renamed, a parameter made
  required).
- While `MAJOR` is `0`, a breaking change bumps `MINOR`. `1.0.0` only on an explicit team
  decision. When in doubt pick the lower level and say why in the changelog.
- Before merging to `master`: bump `version`, add an entry at the top of `CHANGELOG.md` (Italian,
  format in the file, with the tests run), then tag `X.Y.Z` on `master`. A released version is
  never reused.

## Design system workflow

One-way flow, Stitch is the source while the design system is experimental:

```
Stitch (project "ASDP Delivery Workspace", id 148620745884280817)
  → pnpm design:sync → DESIGN.md → src/app/globals.css → components
```

**When the design system changes in Stitch**
1. Run `pnpm design:sync` and read the `DESIGN.md` diff.
2. Update the matching CSS variables in `src/app/globals.css` (mapping below). Change nothing else
   unless a component rule in `DESIGN.md` changed.
3. Run typecheck, lint and build; check the affected pages in the browser.

**When building a new screen**
1. Read `DESIGN.md` (components section) and, if a Stitch screen exists, read it through the
   `stitch` MCP server (`list_screens`, `get_screen` with project id above) as a layout reference.
2. Build it with the shadcn components in `src/components/ui/` and the tokens; never paste the
   Stitch HTML.
3. If the screen needs a component `DESIGN.md` does not describe, use the stock shadcn one and
   mention it. If it needs a missing token, stop and ask: it is added in Stitch first, then synced.

**Token mapping** (`DESIGN.md` → `globals.css`)

| DESIGN.md | CSS variable |
|---|---|
| surface | `--background` |
| on-surface | `--foreground`, `--card-foreground`, `--popover-foreground` |
| surface-container | `--card` |
| surface-container-low | `--sidebar` |
| surface-container-high | `--popover`, `--muted` |
| surface-container-highest | `--accent` |
| primary-container | `--primary`, `--ring` |
| on-primary | `--primary-foreground` |
| secondary-container / secondary-fixed | `--secondary` / `--secondary-foreground` |
| on-surface-variant | `--muted-foreground` |
| outline-variant | `--border`, `--input` |
| error | `--destructive` |
| rounded DEFAULT | `--radius` |
| document states (Da fare, In corso, Completo, Approvato) | `--state-{todo,progress,complete,approved}[-foreground,-border]` |
| fonts Roboto Flex / JetBrains Mono | `--font-sans` / `--font-mono` (set in `src/app/layout.tsx`) |

The theme is dark only. The `stitch` MCP server is configured in `.mcp.json` and loads only in
sessions opened in this folder; the key stays in the `STITCH_API_KEY` env var, never in files.
From a session opened elsewhere (or a tool without MCP, e.g. Codex/OpenCode) the `stitch` tools
are missing: run `pnpm design:sync` from this folder, or call the endpoint directly with a
JSON-RPC `tools/call` POST to `https://stitch.googleapis.com/mcp`, header
`X-Goog-Api-Key: $STITCH_API_KEY` (see `scripts/sync-design.mjs` for the request shape).

## Layout

```
src/app/login/            login page + server actions (login, logout)
src/app/(app)/            authenticated area: layout with sidebar, one folder per section
src/app/auth/confirm/     invite link (token_hash) → /imposta-password
src/app/api/mcp/          MCP server (Streamable HTTP, Bearer JWT from Supabase OAuth)
src/app/oauth/consent/    OAuth consent page for MCP clients (Claude)
src/components/ui/        shadcn components (generated, edit only when needed)
src/lib/supabase/         Supabase clients (admin.ts: service role, invite only; token.ts: Bearer JWT for MCP)
src/lib/labels.ts         Italian labels of the schema enums
src/lib/gitlab.ts         GitLab REST client (server-only, GITLAB_URL / GITLAB_TOKEN)
src/lib/documents/        document service layer shared by UI and MCP
src/lib/mcp/              MCP tools: thin adapters over src/lib/documents/
src/proxy.ts              auth gate and session refresh
supabase/migrations/      schema, RLS, framework reference data
supabase/seed.sql         local-only test users and projects
supabase/tests/database/  pgTAP RLS tests
supabase/templates/       auth email templates (invite)
docs/ARCHITETTURA.md      architecture and milestones
docs/STATO.md             work log: current step, open plan, environments (read first, keep updated)
TODO.md                   unplanned items (Italian)
CHANGELOG.md              release notes (Italian), one entry per version
DESIGN.md                 design system pulled from Stitch (generated, do not edit)
scripts/sync-design.mjs   Stitch → DESIGN.md sync
.mcp.json                 Stitch MCP server (key from STITCH_API_KEY)
```
