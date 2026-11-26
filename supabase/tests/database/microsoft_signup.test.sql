-- Hook before_user_created: Microsoft solo con dominio DST, email/password solo se invitata.
begin;
select plan(7);

select is(
  public.hook_before_user_created('{"user":{"email":"Mario.Rossi@dstech.it","app_metadata":{"provider":"azure"}}}'),
  '{}'::jsonb, 'Microsoft con dominio DST: consentito');
select ok(
  public.hook_before_user_created('{"user":{"email":"mario@gmail.com","app_metadata":{"provider":"azure"}}}') ? 'error',
  'Microsoft con altro dominio: rifiutato');
select ok(
  public.hook_before_user_created('{"user":{"email":"mario@dstech.it","app_metadata":{"provider":"email"}}}') ? 'error',
  'email/password senza invito, anche DST: rifiutato');

insert into public.signup_invites (email) values ('ospite@esterno.com');
select is(
  public.hook_before_user_created('{"user":{"email":"Ospite@esterno.com","app_metadata":{"provider":"email"}}}'),
  '{}'::jsonb, 'email invitata: consentito');
select is((select count(*) from public.signup_invites), 0::bigint, 'l''invito viene consumato');

select ok(not has_function_privilege('anon', 'public.hook_before_user_created(jsonb)', 'execute'),
  'anon non esegue l''hook');
select ok(not has_table_privilege('authenticated', 'public.signup_invites', 'select'),
  'authenticated non legge gli inviti');

select * from finish();
rollback;
