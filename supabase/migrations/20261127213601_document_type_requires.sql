-- Prerequisiti tra i tipi di documento: i tipi che devono essere pronti (Completo o Approvato)
-- prima di poter produrre questo. L'ordine consigliato resta sort_order; requires dice cosa si
-- può avviare in parallelo (es. il Backlog subito dopo l'Analisi Funzionale) e cosa serve prima
-- (es. l'Architettura prima dell'Analisi Tecnica).
alter table public.document_types add column requires text[] not null default '{}';

update public.document_types set requires = case code
  when 'T1.4' then array['P1.3']
  when 'T2.2' then array['T1.4']
  when 'T3.1' then array['T1.4', 'T2.2']
  when 'T4.1' then array['T1.4']
  when 'T4.2' then array['T4.1', 'T2.2']
  when 'T4.3-INDEX' then array['T4.2']
  when 'T4.3-part' then array['T4.3-INDEX', 'T2.4']
  else '{}'
end;
