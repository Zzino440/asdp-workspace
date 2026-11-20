-- Dati di prova SOLO per l'ambiente locale (supabase db reset). Mai su un progetto reale.
-- Utenti: password di test "asdp-test-2026" per tutti.
--   admin@asdp.test    admin di piattaforma, nessun progetto
--   pm@asdp.test       Marco Rinaldi, PM di Portale Fornitori
--   tl@asdp.test       Giulia Ferri, TL di Portale Fornitori, TL+AF di CRM Energia
--   af@asdp.test       Sara Conti, AF di App Prenotazioni
--   nessuno@asdp.test  utente senza progetti

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('asdp-test-2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.full_name),
  now(), now(), '', '', '', ''
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid, 'admin@asdp.test', 'Amministratore'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'pm@asdp.test', 'Marco Rinaldi'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'tl@asdp.test', 'Giulia Ferri'),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'af@asdp.test', 'Sara Conti'),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'nessuno@asdp.test', 'Paolo Bianchi')
) as u(id, email, full_name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email like '%@asdp.test';

update public.profiles set is_admin = true where email = 'admin@asdp.test';

insert into public.projects (id, code, name, client, nature, status, current_phase, framework_version, gitlab_project_path) values
  ('20000000-0000-0000-0000-000000000001', 'PFS', 'Portale Fornitori', 'Comune di Siena', 'greenfield', 'aperto', 2, '0.8.0', 'l.belli/sandbox-test'),
  ('20000000-0000-0000-0000-000000000002', 'CRM-EN', 'CRM Energia Evolutiva Q1', 'Energia Italia', 'evolutiva', 'in_presidio', 4, '0.8.0', 'dst/crm-energia/adsp'),
  ('20000000-0000-0000-0000-000000000003', 'APA', 'App Prenotazioni', 'ASL Toscana', 'greenfield', 'in_attesa', 1, '0.8.0', null);

insert into public.project_members (project_id, user_id, roles) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '{pm}'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '{tl}'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '{tl,af}'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '{af}');
