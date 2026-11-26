-- Dati facoltativi del progetto chiesti alla creazione guidata: descrizione e date previste.
alter table public.projects
  add column description text,
  add column start_date date,
  add column end_date date,
  add constraint projects_dates_check check (end_date is null or start_date is null or end_date >= start_date);
