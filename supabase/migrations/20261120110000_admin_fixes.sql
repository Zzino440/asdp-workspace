-- Correzioni emerse provando invito e sospensione nell'app.

-- GoTrue crea l'utente e imposta invited_at con un update successivo, quindi il trigger di
-- insert (handle_new_user) non vede l'invito: lo stato "invitato" si imposta sull'update.
create function public.handle_user_invited()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set status = 'invitato' where id = new.id and status = 'attivo';
  return new;
end;
$$;

create trigger on_auth_user_invited
  after update of invited_at on auth.users
  for each row
  when (old.invited_at is null and new.invited_at is not null and new.last_sign_in_at is null)
  execute function public.handle_user_invited();

-- Data lontana invece di 'infinity': GoTrue non sa leggere 'infinity' e risponde 500 al login
-- invece di "user_banned".
create or replace function public.sync_user_ban()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set banned_until = case when new.status = 'sospeso' then now() + interval '100 years' end
  where id = new.id;
  return new;
end;
$$;
