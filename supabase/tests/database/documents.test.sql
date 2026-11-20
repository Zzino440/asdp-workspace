-- Test RLS della milestone 2a (repo collegate e indice documenti).
-- Utenti del seed: 01 admin, 02 PM di PFS, 03 TL di PFS e TL+AF di CRM-EN, 04 AF di APA, 05 senza progetti.
begin;
select plan(10);

insert into public.documents (project_id, path, document_type, last_commit_id) values
  ('20000000-0000-0000-0000-000000000003', 'asdp/functional-analysis/T1.4.md', 'T1.4', 'a'),
  ('20000000-0000-0000-0000-000000000003', 'asdp/architecture/T2.2.md', 'T2.2', 'a'),
  ('20000000-0000-0000-0000-000000000003', 'asdp/note.md', null, 'a'),
  ('20000000-0000-0000-0000-000000000002', 'asdp/architecture/T2.2.md', 'T2.2', 'a');

-- AF senza "view" su T2.2; TL invece la mantiene.
update public.role_permissions set level = 'none' where document_type = 'T2.2' and role = 'af';

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select is((select count(*)::int from public.documents), 2, 'l''AF vede solo i tipi permessi e i file senza tipo');
select is(public.document_level('20000000-0000-0000-0000-000000000003', 'T1.4')::text, 'edit',
  'livello dell''AF su T1.4 dal RACI');
select throws_ok(
  $$insert into public.documents (project_id, path, last_commit_id)
    values ('20000000-0000-0000-0000-000000000003', 'asdp/x.md', 'b')$$,
  '42501', null, 'l''AF non scrive l''indice');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.documents where project_id = '20000000-0000-0000-0000-000000000002'),
  1, 'TL+AF vede T2.2: i ruoli si sommano');
select is(public.document_level('20000000-0000-0000-0000-000000000003', 'T1.4')::text, 'none',
  'chi non è nel progetto ha livello none');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select is((select count(*)::int from public.documents), 0, 'un utente senza progetti non vede documenti');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.project_repositories (project_id, gitlab_path, role)
    values ('20000000-0000-0000-0000-000000000001', 'dst/pfs/backend', 'be')$$,
  'il PM collega una repo al suo progetto');
select throws_ok(
  $$insert into public.project_repositories (project_id, gitlab_path, role)
    values ('20000000-0000-0000-0000-000000000002', 'dst/crm/backend', 'be')$$,
  '42501', null, 'il PM non collega repo a un progetto altrui');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.project_repositories where project_id = '20000000-0000-0000-0000-000000000001'),
  1, 'i membri vedono le repo del progetto');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.document_level('20000000-0000-0000-0000-000000000002', 'T2.2')::text, 'approve',
  'l''admin ha sempre approve');

select * from finish();
rollback;
