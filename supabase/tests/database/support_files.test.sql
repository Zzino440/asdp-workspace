-- Test RLS dei file di supporto (tipo SUPPORTO: edit a tutti i ruoli, eliminazione della riga).
-- Utenti del seed: 04 AF di APA (edit su T1.4), 05 senza progetti.
begin;
select plan(4);

insert into public.documents (project_id, path, document_type, last_commit_id) values
  ('20000000-0000-0000-0000-000000000003', 'asdp/functional-analysis/T1.4.md', 'T1.4', 'a'),
  ('20000000-0000-0000-0000-000000000003', 'asdp/supporto/note.md', 'SUPPORTO', 'a'),
  ('20000000-0000-0000-0000-000000000003', 'asdp/supporto/altro.md', 'SUPPORTO', 'a');

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
delete from public.documents where path = 'asdp/supporto/altro.md';

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select lives_ok(
  $$update public.documents set last_commit_id = 'b' where path = 'asdp/supporto/note.md'$$,
  'un membro aggiorna la riga di un file di supporto');
delete from public.documents where path in ('asdp/supporto/note.md', 'asdp/functional-analysis/T1.4.md');
select is(
  (select string_agg(path, ',' order by path) from public.documents),
  'asdp/functional-analysis/T1.4.md,asdp/supporto/altro.md',
  'un membro elimina solo le righe dei file di supporto; un non membro nessuna');
select lives_ok(
  $$insert into public.documents (project_id, path, document_type, last_commit_id)
    values ('20000000-0000-0000-0000-000000000003', 'asdp/supporto/nuovo.md', 'SUPPORTO', 'a')$$,
  'un membro crea un file di supporto');
select is(
  public.document_level('20000000-0000-0000-0000-000000000003', 'SUPPORTO'),
  'edit'::public.permission_level, 'ogni membro ha edit sui file di supporto');

select * from finish();
rollback;
