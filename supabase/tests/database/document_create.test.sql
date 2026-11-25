-- Test RLS della creazione di un documento (inserimento della riga d'indice).
-- Utenti del seed: 04 AF di APA (edit su T1.4, view su T2.2), 05 senza progetti.
begin;
select plan(3);

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.documents (project_id, path, document_type, last_commit_id)
    values ('20000000-0000-0000-0000-000000000003', 'asdp/functional-analysis/T1.4.md', 'T1.4', 'a')$$,
  'l''AF inserisce la riga di un tipo su cui ha edit');
select throws_ok(
  $$insert into public.documents (project_id, path, document_type, last_commit_id)
    values ('20000000-0000-0000-0000-000000000003', 'asdp/architecture/T2.2.md', 'T2.2', 'a')$$,
  '42501', null, 'l''AF non inserisce la riga di un tipo su cui ha solo view');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.documents (project_id, path, document_type, last_commit_id)
    values ('20000000-0000-0000-0000-000000000003', 'asdp/functional-analysis/T1.4-bis.md', 'T1.4', 'a')$$,
  '42501', null, 'un non membro non inserisce righe');

select * from finish();
rollback;
