-- Permessi di esecuzione delle funzioni security definer (advisor di sicurezza di Supabase).

-- Helper della RLS: le policy sono tutte "to authenticated", quindi basta authenticated.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_project_member(uuid) from public, anon;
revoke execute on function public.has_project_role(uuid, public.asdp_role[]) from public, anon;
revoke execute on function public.shares_project_with(uuid) from public, anon;
revoke execute on function public.is_any_project_pm() from public, anon;
revoke execute on function public.document_level(uuid, text) from public, anon;

-- Funzioni di trigger: le chiama solo Postgres, nessun ruolo dell'API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_invited() from public, anon, authenticated;
revoke execute on function public.handle_user_sign_in() from public, anon, authenticated;
revoke execute on function public.sync_user_ban() from public, anon, authenticated;
