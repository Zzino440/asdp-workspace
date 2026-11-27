-- Test RLS delle pubblicazioni su Teams.
-- Utenti del seed: 01 admin (approve ovunque), 04 AF di APA (edit su T1.4), 05 senza progetti.
begin;
select plan(5);

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.document_publications (project_id, path, document_type, commit_id, formats, items, folder_web_url)
    values ('20000000-0000-0000-0000-000000000003', 'asdp/functional-analysis/T1.4.md', 'T1.4', 'c1', '{pdf}', '{}', 'https://x')$$,
  'chi ha approve pubblica');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select is((select count(*) from public.document_publications)::int, 1, 'l''AF vede la pubblicazione di un tipo che vede');
select throws_ok(
  $$insert into public.document_publications (project_id, path, document_type, commit_id, formats, items, folder_web_url)
    values ('20000000-0000-0000-0000-000000000003', 'asdp/functional-analysis/T1.4-bis.md', 'T1.4', 'c2', '{pdf}', '{}', 'https://x')$$,
  '42501', null, 'l''AF con solo edit non pubblica');
update public.document_publications set commit_id = 'c3';
select is((select commit_id from public.document_publications), 'c1', 'l''AF non modifica la pubblicazione');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select is((select count(*) from public.document_publications)::int, 0, 'un non membro non vede pubblicazioni');

select * from finish();
rollback;
