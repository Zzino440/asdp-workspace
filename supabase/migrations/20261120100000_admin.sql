-- Milestone 1: amministrazione di utenti, team e permessi.

-- Ultimo accesso visibile nell'app (auth.users non è esposto) e attivazione degli invitati
-- al primo accesso.
alter table public.profiles add column last_sign_in_at timestamptz;

create function public.handle_user_sign_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set last_sign_in_at = new.last_sign_in_at,
      status = case when status = 'invitato' then 'attivo'::public.user_status else status end
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_signed_in
  after update of last_sign_in_at on auth.users
  for each row
  when (new.last_sign_in_at is distinct from old.last_sign_in_at)
  execute function public.handle_user_sign_in();

-- Gli utenti invitati nascono con stato "invitato".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.invited_at is not null then 'invitato' else 'attivo' end::public.user_status
  );
  return new;
end;
$$;

-- Sospensione effettiva: lo stato del profilo (modificabile solo dall'admin, via RLS) blocca
-- login e refresh della sessione in Supabase Auth.
create function public.sync_user_ban()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set banned_until = case when new.status = 'sospeso' then 'infinity'::timestamptz end
  where id = new.id;
  return new;
end;
$$;

create trigger on_profile_status_changed
  after update of status on public.profiles
  for each row
  when ((old.status = 'sospeso') is distinct from (new.status = 'sospeso'))
  execute function public.sync_user_ban();

-- Il PM di almeno un progetto può cercare le persone da aggiungere al team.
create function public.is_any_project_pm()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members m
    where m.user_id = auth.uid() and 'pm' = any (m.roles)
  );
$$;

create policy profiles_select_pm on public.profiles for select to authenticated
  using (public.is_any_project_pm());

-- Default del framework conservati per "Ripristina default framework".
alter table public.role_permissions add column default_level public.permission_level;
update public.role_permissions set default_level = level where default_level is null;
alter table public.role_permissions alter column default_level set not null;

-- security invoker: passa dalla RLS, quindi aggiorna qualcosa solo se chi chiama è admin.
create function public.reset_role_permissions()
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.role_permissions set level = default_level where level <> default_level;
$$;
