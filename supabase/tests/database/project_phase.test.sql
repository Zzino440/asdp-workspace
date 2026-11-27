-- Cambio di fase: il PM va avanti, solo l'admin torna indietro. Esegui: pnpm exec supabase test db
-- Utenti del seed: 01 admin, 02 PM di PFS. Progetto 01 PFS, in Fase 2.
begin;
select plan(4);

set local role authenticated;

-- PM
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$update public.projects set current_phase = 1 where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'il PM non riporta il progetto a una fase precedente'
);

with u as (
  update public.projects set current_phase = 3 where id = '20000000-0000-0000-0000-000000000001' returning 1
) select is(count(*)::int, 1, 'il PM passa alla fase successiva') from u;

-- Admin
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

with u as (
  update public.projects set current_phase = 0 where id = '20000000-0000-0000-0000-000000000001' returning 1
) select is(count(*)::int, 1, 'l''admin riporta il progetto a una fase precedente') from u;

select is(
  (select current_phase::int from public.projects where id = '20000000-0000-0000-0000-000000000001'),
  0, 'la fase è tornata a 0');

select * from finish();
rollback;
