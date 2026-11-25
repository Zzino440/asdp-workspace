-- Milestone 2d: chi ha "edit" sul tipo inserisce la riga d'indice del documento che ha creato
-- (create_document). Prima solo PM e admin potevano inserire righe.
create policy documents_insert_editor on public.documents for insert to authenticated
  with check (public.document_level(project_id, document_type) >= 'edit');
