-- Repo GitLab identificate dal numero (id), che non cambia quando la repo viene spostata o
-- rinominata. Il percorso resta per la visualizzazione e i link; "Reindicizza" lo riallinea.
alter table public.projects add column gitlab_project_id bigint;
alter table public.project_repositories add column gitlab_project_id bigint;
