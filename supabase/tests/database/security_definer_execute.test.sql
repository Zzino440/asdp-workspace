-- Permessi di esecuzione delle funzioni security definer: helper solo per authenticated,
-- trigger per nessun ruolo dell'API.
begin;
select plan(8);

select ok(has_function_privilege('authenticated', 'public.is_admin()', 'execute'),
  'authenticated esegue is_admin');
select ok(has_function_privilege('authenticated', 'public.document_level(uuid, text)', 'execute'),
  'authenticated esegue document_level');
select ok(not has_function_privilege('anon', 'public.is_admin()', 'execute'),
  'anon non esegue is_admin');
select ok(not has_function_privilege('anon', 'public.has_project_role(uuid, public.asdp_role[])', 'execute'),
  'anon non esegue has_project_role');
select ok(not has_function_privilege('anon', 'public.document_level(uuid, text)', 'execute'),
  'anon non esegue document_level');
select ok(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
  'authenticated non esegue handle_new_user');
select ok(not has_function_privilege('authenticated', 'public.sync_user_ban()', 'execute'),
  'authenticated non esegue sync_user_ban');
select ok(not has_function_privilege('anon', 'public.handle_user_sign_in()', 'execute'),
  'anon non esegue handle_user_sign_in');

select * from finish();
rollback;
