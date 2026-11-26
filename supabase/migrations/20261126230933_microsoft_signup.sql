-- Registrazione con Microsoft: la registrazione di Supabase Auth è aperta (enable_signup) perché
-- serve al primo accesso con Microsoft. Chi può davvero creare un account lo decide l'hook
-- before_user_created qui sotto:
-- - Microsoft (provider azure, solo tenant DST da config) con email di un dominio DST;
-- - email/password solo se un amministratore l'ha invitata (riga in signup_invites).
-- L'evento dell'hook non distingue un invito da una registrazione pubblica, per questo l'azione
-- Invita scrive prima l'email in signup_invites (service role).

create table public.signup_invites (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

-- La leggono e scrivono solo la service role (azione Invita) e Auth (hook, policy sotto).
alter table public.signup_invites enable row level security;
revoke all on public.signup_invites from anon, authenticated;
grant select, delete on public.signup_invites to supabase_auth_admin;
create policy "Auth legge e consuma gli inviti" on public.signup_invites
  for all to supabase_auth_admin using (true);

create function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  user_email text := lower(event -> 'user' ->> 'email');
  provider text := event -> 'user' -> 'app_metadata' ->> 'provider';
begin
  if provider = 'azure' and split_part(user_email, '@', 2) = any (array['dstech.it']) then
    return '{}'::jsonb;
  end if;

  if provider = 'email' then
    delete from public.signup_invites i where i.email = user_email;
    if found then
      return '{}'::jsonb;
    end if;
  end if;

  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Registrazione non consentita: accedi con il tuo account Microsoft DST o chiedi un invito.'));
end;
$$;

grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
