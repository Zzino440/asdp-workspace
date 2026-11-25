-- Milestone 7: account Microsoft collegato dall'utente ("Collega account Microsoft"), per leggere
-- i file di Teams/SharePoint via Graph con i suoi permessi. Il refresh token lo vede solo l'utente.
create table public.microsoft_accounts (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.microsoft_accounts enable row level security;

create policy microsoft_accounts_own on public.microsoft_accounts for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
