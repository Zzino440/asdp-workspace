-- Milestone 7a: cartelle Teams/SharePoint collegate al progetto, ognuna con un'etichetta. I file
-- li legge Graph con l'account Microsoft dell'utente: qui solo quali cartelle mostrare.
create table public.project_file_locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  label text not null,
  drive_id text not null,
  item_id text not null,
  web_url text not null,
  created_at timestamptz not null default now(),
  unique (project_id, drive_id, item_id)
);

alter table public.project_file_locations enable row level security;

create policy project_file_locations_select on public.project_file_locations for select to authenticated
  using (public.is_admin() or public.is_project_member(project_id));
create policy project_file_locations_write on public.project_file_locations for all to authenticated
  using (public.is_admin() or public.has_project_role(project_id, '{pm}'))
  with check (public.is_admin() or public.has_project_role(project_id, '{pm}'));
