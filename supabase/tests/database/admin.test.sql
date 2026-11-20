-- Test RLS della milestone 1 (amministrazione). Esegui: pnpm exec supabase test db
-- Utenti del seed: 01 admin, 02 PM di PFS, 03 TL, 04 AF di APA, 05 senza progetti.
-- Progetti: 01 PFS, 02 CRM-EN, 03 APA.
begin;
select plan(20);

-- PM
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 5, 'il PM vede tutti i profili');

select lives_ok(
  $$insert into public.project_members (project_id, user_id, roles)
    values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', '{developer}')$$,
  'il PM aggiunge una persona al suo progetto'
);
select is(
  (select count(*)::int from public.project_members where project_id = '20000000-0000-0000-0000-000000000001'),
  3, 'il nuovo membro è nel team');

with u as (
  update public.project_members set roles = '{developer,qa}'
  where project_id = '20000000-0000-0000-0000-000000000001' and user_id = '10000000-0000-0000-0000-000000000005'
  returning 1
) select is(count(*)::int, 1, 'il PM cambia i ruoli nel suo progetto') from u;

with d as (
  delete from public.project_members
  where project_id = '20000000-0000-0000-0000-000000000001' and user_id = '10000000-0000-0000-0000-000000000005'
  returning 1
) select is(count(*)::int, 1, 'il PM rimuove un membro dal suo progetto') from d;

select throws_ok(
  $$insert into public.project_members (project_id, user_id, roles)
    values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', '{qa}')$$,
  '42501', null, 'il PM non aggiunge persone a un progetto altrui'
);

with u as (
  update public.project_members set roles = '{qa}'
  where project_id = '20000000-0000-0000-0000-000000000002'
  returning 1
) select is(count(*)::int, 0, 'il PM non modifica il team di un progetto altrui') from u;

with u as (
  update public.profiles set is_admin = true where id = '10000000-0000-0000-0000-000000000002' returning 1
) select is(count(*)::int, 0, 'il PM non si fa admin') from u;

with u as (
  update public.profiles set status = 'sospeso' where id = '10000000-0000-0000-0000-000000000004' returning 1
) select is(count(*)::int, 0, 'il PM non cambia lo stato di altri utenti') from u;

with u as (
  update public.role_permissions set level = 'none' where document_type = 'T1.4' returning 1
) select is(count(*)::int, 0, 'il PM non modifica la matrice permessi') from u;

-- AF e utente senza progetti
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles), 1, 'chi non è PM vede solo chi lavora con lui');
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles), 1, 'un utente senza progetti vede solo se stesso');

-- Matrice permessi: modifica e ripristino
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
with u as (
  update public.role_permissions set level = 'view' where document_type = 'T2.2' and role = 'tl' returning 1
) select is(count(*)::int, 1, 'l''admin modifica la matrice permessi') from u;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.reset_role_permissions();
select is(
  (select level::text from public.role_permissions where document_type = 'T2.2' and role = 'tl'),
  'view', 'il ripristino lanciato da un PM non cambia nulla');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.reset_role_permissions();
select is(
  (select level::text from public.role_permissions where document_type = 'T2.2' and role = 'tl'),
  'approve', 'il ripristino lanciato dall''admin torna ai default');

-- Sospensione
update public.profiles set status = 'sospeso' where id = '10000000-0000-0000-0000-000000000004';
reset role;
select isnt(
  (select banned_until from auth.users where id = '10000000-0000-0000-0000-000000000004'),
  null, 'la sospensione blocca l''utente in Auth');

set local role authenticated;
update public.profiles set status = 'attivo' where id = '10000000-0000-0000-0000-000000000004';
reset role;
select is(
  (select banned_until from auth.users where id = '10000000-0000-0000-0000-000000000004'),
  null, 'la riattivazione sblocca l''utente');

-- Invito e primo accesso
insert into auth.users (instance_id, id, aud, role, email, invited_at)
values ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000099',
        'authenticated', 'authenticated', 'invitato@asdp.test', now());
select is(
  (select status::text from public.profiles where id = '10000000-0000-0000-0000-000000000099'),
  'invitato', 'un utente invitato nasce con stato invitato');

-- Come fa GoTrue: insert senza invited_at, poi update.
insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000098',
        'authenticated', 'authenticated', 'invitato2@asdp.test');
update auth.users set invited_at = now() where id = '10000000-0000-0000-0000-000000000098';
select is(
  (select status::text from public.profiles where id = '10000000-0000-0000-0000-000000000098'),
  'invitato', 'invited_at impostato dopo la creazione porta lo stato a invitato');

update auth.users set last_sign_in_at = now() where id = '10000000-0000-0000-0000-000000000099';
select is(
  (select status::text from public.profiles where id = '10000000-0000-0000-0000-000000000099'),
  'attivo', 'al primo accesso l''invitato diventa attivo');

select * from finish();
rollback;
