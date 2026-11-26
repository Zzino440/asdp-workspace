-- Scheda Percorso: domande D[N] nell'indice e attività recente dei documenti.

-- Domande D[N] presenti nel documento: [{id, title, answered}], ricavate dal testo a ogni
-- indicizzazione o salvataggio (src/lib/questions.ts).
alter table public.documents add column questions jsonb not null default '[]';

-- Un salvataggio (commit) di un documento. Lo scrivono il service layer dopo ogni commit fatto
-- dall'app o dall'MCP e il webhook per i push diretti su GitLab (commit senza trailer "Via:").
create table public.document_events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  path text not null,
  document_type text,
  commit_id text not null,
  author_name text not null,
  via text not null check (via in ('app', 'mcp', 'git')),
  title text not null,
  detail text,
  created_at timestamptz not null default now(),
  unique (commit_id, path)
);
create index document_events_project_created on public.document_events (project_id, created_at desc);

alter table public.document_events enable row level security;

-- Stessa visibilità dell'indice dei documenti.
create policy document_events_select on public.document_events for select to authenticated
  using (
    public.is_admin()
    or (
      public.is_project_member(project_id)
      and (document_type is null or public.document_level(project_id, document_type) >= 'view')
    )
  );
-- Chi ha "edit" sul tipo registra il proprio salvataggio.
create policy document_events_insert_editor on public.document_events for insert to authenticated
  with check (public.document_level(project_id, document_type) >= 'edit');
