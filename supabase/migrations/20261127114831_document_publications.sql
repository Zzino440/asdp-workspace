-- Milestone 6: copie dei documenti approvati pubblicate nella cartella Teams del progetto
-- (ASDP/<Fase>/). Una riga per documento: l'ultima pubblicazione, con i file per formato.
-- I file li scrive Graph con l'account Microsoft di chi pubblica; qui solo cosa è stato pubblicato.
create table public.document_publications (
  project_id uuid not null references public.projects (id) on delete cascade,
  path text not null,
  document_type text,
  location_id uuid references public.project_file_locations (id) on delete set null,
  commit_id text not null,
  version text,
  formats text[] not null,
  -- {"pdf": {"item_id": "...", "web_url": "..."}, ...}
  items jsonb not null,
  folder_web_url text not null,
  published_by uuid not null default auth.uid() references public.profiles (id),
  published_at timestamptz not null default now(),
  primary key (project_id, path)
);

alter table public.document_publications enable row level security;

-- Stessa visibilità dell'indice dei documenti.
create policy document_publications_select on public.document_publications for select to authenticated
  using (
    public.is_admin()
    or (
      public.is_project_member(project_id)
      and (document_type is null or public.document_level(project_id, document_type) >= 'view')
    )
  );
-- Pubblica chi può approvare il tipo di documento.
create policy document_publications_insert on public.document_publications for insert to authenticated
  with check (public.document_level(project_id, document_type) >= 'approve');
create policy document_publications_update on public.document_publications for update to authenticated
  using (public.document_level(project_id, document_type) >= 'approve')
  with check (public.document_level(project_id, document_type) >= 'approve');
