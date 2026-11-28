-- File di supporto: Markdown liberi nella repo documenti (asdp/supporto/), fuori dal flusso ASDP
-- (niente fase, skill, stato o approvazione), come gli allegati. Li modifica ogni membro del
-- progetto: edit a tutti i ruoli, cambiabile in Amministrazione → Permessi.
insert into public.document_types (code, name, phase, folder, skill_name, per_feature, sort_order) values
  ('SUPPORTO', 'File di supporto', null, 'asdp/supporto', null, false, 13);

insert into public.role_permissions (document_type, role, level)
select 'SUPPORTO', r.role, 'edit'::public.permission_level
from unnest(enum_range(null::public.asdp_role)) as r(role);

-- Rinomina, spostamento ed eliminazione dall'app: solo per i file di supporto, a chi ha "edit".
-- Per i documenti ASDP la riga d'indice la tolgono solo PM e admin (documents_write).
create policy documents_delete_editor on public.documents for delete to authenticated
  using (document_type = 'SUPPORTO' and public.document_level(project_id, document_type) >= 'edit');
