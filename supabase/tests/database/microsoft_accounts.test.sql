-- Test RLS dell'account Microsoft collegato: ognuno vede e scrive solo la propria riga.
-- Utenti del seed: 02 PM, 05 senza progetti.
begin;
select plan(3);

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.microsoft_accounts (refresh_token) values ('rt-pm')$$,
  'l''utente salva il proprio token');
select throws_ok(
  $$insert into public.microsoft_accounts (user_id, refresh_token)
    values ('10000000-0000-0000-0000-000000000005', 'rt-altro')$$,
  '42501', null, 'l''utente non salva il token di un altro');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select is((select count(*) from public.microsoft_accounts), 0::bigint, 'un altro utente non vede il token');

select * from finish();
rollback;
