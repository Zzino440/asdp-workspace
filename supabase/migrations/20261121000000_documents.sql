-- Milestone 2a: repo dei progetti e indice dei documenti (derivato da GitLab).

-- Cartella dei documenti nella repo documenti del progetto.
alter table public.projects add column docs_root text not null default 'asdp/';

-- Repo di codice del progetto (BE, FE, …): l'app non ci scrive, servono come input alle skill.
create type public.repository_role as enum ('be', 'fe', 'altro');

create table public.project_repositories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  gitlab_path text not null,
  role public.repository_role not null,
  branch text not null default 'main',
  unique (project_id, gitlab_path)
);

alter table public.project_repositories enable row level security;

create policy project_repositories_select on public.project_repositories for select to authenticated
  using (public.is_admin() or public.is_project_member(project_id));
create policy project_repositories_write on public.project_repositories for all to authenticated
  using (public.is_admin() or public.has_project_role(project_id, '{pm}'))
  with check (public.is_admin() or public.has_project_role(project_id, '{pm}'));

-- Indice dei documenti: ricostruito dall'indicizzazione, mai modificato a mano.
create table public.documents (
  project_id uuid not null references public.projects (id) on delete cascade,
  path text not null,
  document_type text references public.document_types (code) on delete set null,
  front_matter jsonb not null default '{}',
  last_commit_id text not null,
  indexed_at timestamptz not null default now(),
  primary key (project_id, path)
);

-- Livello dell'utente su un tipo di documento in un progetto: il massimo tra i suoi ruoli
-- (unione dei permessi). L'admin ha sempre approve; chi non è nel progetto ha none.
create function public.document_level(p_project_id uuid, p_document_type text)
returns public.permission_level
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_admin() then 'approve'::public.permission_level
    else coalesce((
      select max(rp.level)
      from public.project_members m
      join public.role_permissions rp
        on rp.role = any (m.roles) and rp.document_type = p_document_type
      where m.project_id = p_project_id and m.user_id = auth.uid()
    ), 'none')
  end;
$$;

alter table public.documents enable row level security;

-- Visibile a chi ha almeno "view" sul tipo; i file senza tipo riconosciuto a tutti i membri.
create policy documents_select on public.documents for select to authenticated
  using (
    public.is_admin()
    or (
      public.is_project_member(project_id)
      and (document_type is null or public.document_level(project_id, document_type) >= 'view')
    )
  );
-- L'indice lo scrivono il bottone "Reindicizza" (admin o PM) e il webhook (service role).
create policy documents_write on public.documents for all to authenticated
  using (public.is_admin() or public.has_project_role(project_id, '{pm}'))
  with check (public.is_admin() or public.has_project_role(project_id, '{pm}'));
