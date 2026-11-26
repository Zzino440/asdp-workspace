-- Test RLS delle cartelle Teams collegate al progetto: le vedono i membri, le cambia il PM.
-- Utenti del seed: 02 PM di 01, 04 AF di 03, 05 senza progetti.
begin;
select plan(4);

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.project_file_locations (project_id, label, drive_id, item_id, web_url)
    values ('20000000-0000-0000-0000-000000000001', 'Canale', 'd', 'i', 'https://x')$$,
  'il PM collega una cartella al suo progetto');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.project_file_locations (project_id, label, drive_id, item_id, web_url)
    values ('20000000-0000-0000-0000-000000000003', 'Canale', 'd', 'i', 'https://x')$$,
  '42501', null, 'l''AF non collega cartelle');
select is((select count(*) from public.project_file_locations), 0::bigint, 'l''AF non vede le cartelle di un progetto non suo');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select is((select count(*) from public.project_file_locations), 0::bigint, 'un non membro non vede le cartelle');

select * from finish();
rollback;
