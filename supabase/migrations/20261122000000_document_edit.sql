-- Milestone 2b: chi ha "edit" sul tipo aggiorna la riga d'indice del documento che ha salvato.
-- Il tipo è controllato prima e dopo, così non si può spostare una riga su un tipo senza "edit".
create policy documents_update_editor on public.documents for update to authenticated
  using (public.document_level(project_id, document_type) >= 'edit')
  with check (public.document_level(project_id, document_type) >= 'edit');
