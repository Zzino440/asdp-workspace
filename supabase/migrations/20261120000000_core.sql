-- Core schema: utenti, progetti, ruoli ASDP per progetto, tipi documento e matrice permessi.
-- I permessi sono applicati solo qui (RLS): il codice dell'app usa il client con il JWT dell'utente.

create type public.asdp_role as enum ('pm', 'tl', 'af', 'designer', 'developer', 'qa');
create type public.project_nature as enum ('greenfield', 'evolutiva');
create type public.project_status as enum ('aperto', 'in_presidio', 'in_attesa', 'chiuso');
create type public.permission_level as enum ('none', 'view', 'edit', 'approve');
create type public.user_status as enum ('attivo', 'sospeso', 'invitato');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  is_admin boolean not null default false,
  status public.user_status not null default 'attivo',
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  client text not null,
  nature public.project_nature not null,
  status public.project_status not null default 'aperto',
  current_phase smallint not null default 0 check (current_phase between 0 and 4),
  framework_version text not null,
  gitlab_project_path text,
  gitlab_branch text not null default 'main',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  roles public.asdp_role[] not null check (cardinality(roles) > 0),
  primary key (project_id, user_id)
);

create index project_members_user_id_idx on public.project_members (user_id);

-- Tipi di documento del framework ASDP (seed). phase null = non legato a una fase (allegati).
create table public.document_types (
  code text primary key,
  name text not null,
  phase smallint check (phase between 0 and 4),
  folder text not null,
  skill_name text,
  per_feature boolean not null default false,
  sort_order smallint not null
);

-- Livello di accesso di un ruolo su un tipo di documento. Default dal RACI del framework.
create table public.role_permissions (
  document_type text not null references public.document_types (code) on delete cascade,
  role public.asdp_role not null,
  level public.permission_level not null,
  primary key (document_type, role)
);

-- Helper per le policy. security definer evita la ricorsione delle policy su project_members.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project_id and m.user_id = auth.uid()
  );
$$;

create function public.has_project_role(p_project_id uuid, p_roles public.asdp_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project_id and m.user_id = auth.uid() and m.roles && p_roles
  );
$$;

create function public.shares_project_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members mine
    join public.project_members theirs on theirs.project_id = mine.project_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  );
$$;

-- Profilo creato automaticamente alla registrazione/invito dell'utente.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.document_types enable row level security;
alter table public.role_permissions enable row level security;

-- profiles: vedo me stesso e chi lavora con me; solo l'admin modifica.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin() or public.shares_project_with(id));
create policy profiles_admin_write on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- projects: visibili ai membri; creati e cancellati dall'admin; aggiornati da admin o PM del progetto.
create policy projects_select on public.projects for select to authenticated
  using (public.is_admin() or public.is_project_member(id));
create policy projects_admin_insert on public.projects for insert to authenticated
  with check (public.is_admin());
create policy projects_admin_delete on public.projects for delete to authenticated
  using (public.is_admin());
create policy projects_update on public.projects for update to authenticated
  using (public.is_admin() or public.has_project_role(id, '{pm}'))
  with check (public.is_admin() or public.has_project_role(id, '{pm}'));

-- project_members: visibili ai membri del progetto; gestiti da admin o PM del progetto.
create policy project_members_select on public.project_members for select to authenticated
  using (public.is_admin() or public.is_project_member(project_id));
create policy project_members_write on public.project_members for all to authenticated
  using (public.is_admin() or public.has_project_role(project_id, '{pm}'))
  with check (public.is_admin() or public.has_project_role(project_id, '{pm}'));

-- Catalogo del framework: leggibile da tutti, modificabile dall'admin.
create policy document_types_select on public.document_types for select to authenticated using (true);
create policy document_types_admin_write on public.document_types for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy role_permissions_select on public.role_permissions for select to authenticated using (true);
create policy role_permissions_admin_write on public.role_permissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Catalogo dei documenti ASDP (dati di riferimento, servono anche in produzione).
insert into public.document_types (code, name, phase, folder, skill_name, per_feature, sort_order) values
  ('T0.1a', 'Kickoff Pack', 0, 'asdp/kickoff', 'asdp:t0-1-kickoff', false, 1),
  ('T0.1', 'Verbale Kickoff', 0, 'asdp/kickoff', 'asdp:t0-1-kickoff', false, 2),
  ('P1.3', 'Requisiti Consolidati', 1, 'asdp/requirements', 'asdp:p1-3-requirements-consolidation', false, 3),
  ('T1.4', 'Analisi Funzionale', 1, 'asdp/functional-analysis', 'asdp:t1-4-functional-analysis', false, 4),
  ('T2.2', 'Architettura', 2, 'asdp/architecture', 'asdp:t2-2-architecture', false, 5),
  ('T2.4', 'Contesto Tecnico', 2, 'asdp/technical-context', 'asdp:t2-4-technical-context', false, 6),
  ('T3.1', 'Risk Register', 3, 'asdp/risks', 'asdp:t3-1-risk-register', false, 7),
  ('T4.1', 'Backlog', 4, 'asdp/backlog', 'asdp:t4-1-user-story-backlog', false, 8),
  ('T4.2', 'Analisi Tecnica', 4, 'asdp/delivery', 'asdp:t4-2-technical-analysis', true, 9),
  ('T4.3-INDEX', 'Piano di lavoro', 4, 'asdp/delivery', 'asdp:t4-3-index-work-plan', true, 10),
  ('T4.3-part', 'Task + Scaffold', 4, 'asdp/delivery', 'asdp:t4-3-part-task-scaffold', true, 11),
  ('ALLEGATI', 'Allegati (input)', null, 'asdp/allegati', null, false, 12);

-- Default: tutti i ruoli vedono tutto (nel RACI nessun ruolo è escluso), poi edit/approve
-- secondo RACI e matrice di approvazione della Guida ASDP (§4.2, §4.3).
insert into public.role_permissions (document_type, role, level)
select dt.code, r.role, 'view'::public.permission_level
from public.document_types dt
cross join unnest(enum_range(null::public.asdp_role)) as r(role);

update public.role_permissions rp set level = v.level::public.permission_level
from (values
  ('T0.1a', 'pm', 'approve'), ('T0.1a', 'tl', 'edit'),
  ('T0.1', 'pm', 'approve'), ('T0.1', 'tl', 'edit'),
  ('P1.3', 'af', 'edit'), ('P1.3', 'pm', 'approve'),
  ('T1.4', 'af', 'edit'), ('T1.4', 'pm', 'approve'),
  ('T2.2', 'tl', 'approve'),
  ('T2.4', 'tl', 'approve'),
  ('T3.1', 'pm', 'approve'), ('T3.1', 'tl', 'edit'),
  ('T4.1', 'af', 'edit'), ('T4.1', 'tl', 'edit'), ('T4.1', 'pm', 'approve'),
  ('T4.2', 'tl', 'approve'),
  ('T4.3-INDEX', 'tl', 'approve'),
  ('T4.3-part', 'tl', 'approve'),
  ('ALLEGATI', 'pm', 'edit'), ('ALLEGATI', 'tl', 'edit'), ('ALLEGATI', 'af', 'edit'),
  ('ALLEGATI', 'designer', 'edit')
) as v(document_type, role, level)
where rp.document_type = v.document_type and rp.role = v.role::public.asdp_role;
