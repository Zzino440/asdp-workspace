-- Test RLS della milestone 2b (aggiornamento dell'indice dopo un salvataggio).
-- Utenti del seed: 03 TL di PFS e TL+AF di CRM-EN, 04 AF di APA, 05 senza progetti.
begin;
select plan(4);

insert into public.documents (project_id, path, document_type, last_commit_id) values
  ('20000000-0000-0000-0000-000000000003', 'asdp/functional-analysis/T1.4.md', 'T1.4', 'a'),
  ('20000000-0000-0000-0000-000000000003', 'asdp/architecture/T2.2.md', 'T2.2', 'a');

set local role authenticated;

-- L'AF ha edit su T1.4 e view su T2.2 (RACI predefinito).
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
update public.documents set last_commit_id = 'b' where path = 'asdp/functional-analysis/T1.4.md';
update public.documents set last_commit_id = 'b' where path = 'asdp/architecture/T2.2.md';
select is(
  (select string_agg(path || '=' || last_commit_id, ',' order by path) from public.documents),
  'asdp/architecture/T2.2.md=a,asdp/functional-analysis/T1.4.md=b',
  'l''AF aggiorna solo la riga del tipo su cui ha edit');
select throws_ok(
  $$update public.documents set document_type = 'T2.2' where path = 'asdp/functional-analysis/T1.4.md'$$,
  '42501', null, 'l''AF non sposta una riga su un tipo senza edit');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
update public.documents set last_commit_id = 'c';
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select is(
  (select last_commit_id from public.documents where path = 'asdp/functional-analysis/T1.4.md'),
  'b', 'un non membro non aggiorna l''indice');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
update public.documents set last_commit_id = 'd';
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select is(
  (select last_commit_id from public.documents where path = 'asdp/functional-analysis/T1.4.md'),
  'b', 'un membro di altri progetti non aggiorna l''indice');

select * from finish();
rollback;
