-- Test RLS dell'attività dei documenti.
-- Utenti del seed: 04 AF di APA (edit su T1.4, view su T2.2), 05 senza progetti.
begin;
select plan(5);

insert into public.document_events (project_id, path, document_type, commit_id, author_name, via, title)
values ('20000000-0000-0000-0000-000000000003', 'asdp/architecture/T2.2.md', 'T2.2', 'c1', 'TL', 'git', 'Aggiorna T2.2');

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.document_events (project_id, path, document_type, commit_id, author_name, via, title)
    values ('20000000-0000-0000-0000-000000000003', 'asdp/functional-analysis/T1.4.md', 'T1.4', 'c2', 'AF', 'app', 'Aggiorna T1.4')$$,
  'l''AF registra il salvataggio di un tipo su cui ha edit');
select throws_ok(
  $$insert into public.document_events (project_id, path, document_type, commit_id, author_name, via, title)
    values ('20000000-0000-0000-0000-000000000003', 'asdp/architecture/T2.2.md', 'T2.2', 'c3', 'AF', 'app', 'Aggiorna T2.2')$$,
  '42501', null, 'l''AF non registra un tipo su cui ha solo view');
select is((select count(*) from public.document_events)::int, 2, 'l''AF vede gli eventi dei tipi che vede');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select is((select count(*) from public.document_events)::int, 0, 'un non membro non vede eventi');
select throws_ok(
  $$insert into public.document_events (project_id, path, document_type, commit_id, author_name, via, title)
    values ('20000000-0000-0000-0000-000000000003', 'asdp/functional-analysis/T1.4.md', 'T1.4', 'c4', 'X', 'app', 'x')$$,
  '42501', null, 'un non membro non registra eventi');

select * from finish();
rollback;
