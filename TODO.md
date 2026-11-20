# TODO — ASDP Workspace

Cose da fare non ancora pianificate in una milestone. Spostarle in `docs/ARCHITETTURA.md` (§7 o
§8) quando vengono prese in carico.

## Ambiente cloud di test

- [ ] **Email di invito sul progetto cloud.** Sul piano free con l'email predefinita di Supabase il
  template non si può cambiare (`config push` → `entitlement_required`), quindi l'invito usa il
  link standard (`{{ .ConfirmationURL }}`), gestito dalla pagina `/auth/invito` (sessione nel
  frammento `#access_token`). Resta il limite: l'email predefinita parte solo verso i membri
  dell'organizzazione Supabase. Per invitare colleghi: configurare un SMTP (es. Resend) e
  togliere l'override `[remotes.test.auth.email.template.invite]` da `supabase/config.toml`.

## Sicurezza

- [ ] **Permessi di esecuzione delle funzioni `SECURITY DEFINER`** (segnalato dall'advisor di
  sicurezza di Supabase sul progetto cloud, 2026-11-20). Nuova migrazione che:
  - toglie `EXECUTE` a `public` e `anon` sulle funzioni helper della RLS (`is_admin`,
    `is_project_member`, `has_project_role`, `shares_project_with`, `is_any_project_pm`,
    `document_level`), lasciandolo ad `authenticated` perché le policy le usano;
  - toglie `EXECUTE` a `public`, `anon` e `authenticated` sulle funzioni di trigger
    (`handle_new_user`, `handle_user_invited`, `handle_user_sign_in`, `sync_user_ban`);
  - non tocca `rls_auto_enable`, che è di Supabase.

  Verifica: `pnpm exec supabase test db` verde, advisor senza i due avvisi per le nostre funzioni.
