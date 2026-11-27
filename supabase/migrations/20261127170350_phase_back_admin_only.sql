-- Cambio di fase: avanti lo fa chi aggiorna il progetto (admin o PM, RLS projects_update);
-- tornare a una fase precedente solo l'admin. Senza utente (SQL editor, service role) passa.
create function public.check_phase_back()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.current_phase < old.current_phase and auth.uid() is not null and not public.is_admin() then
    raise exception 'Solo un amministratore può riportare il progetto a una fase precedente.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger projects_phase_back
  before update of current_phase on public.projects
  for each row execute function public.check_phase_back();

-- Funzione di trigger: la chiama solo Postgres, nessun ruolo dell'API.
revoke execute on function public.check_phase_back() from public, anon, authenticated;
