// Etichette italiane dei valori enum dello schema (supabase/migrations).

export const ASDP_ROLES = ["pm", "tl", "af", "designer", "developer", "qa"] as const;
export type AsdpRole = (typeof ASDP_ROLES)[number];

export const ROLE_LABELS: Record<AsdpRole, string> = {
  pm: "PM",
  tl: "TL",
  af: "AF",
  designer: "Designer",
  developer: "Developer",
  qa: "QA",
};

export const NATURE_LABELS: Record<string, string> = {
  greenfield: "Greenfield",
  evolutiva: "Evolutiva",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  aperto: "Aperto",
  in_presidio: "In presidio",
  in_attesa: "In attesa",
  chiuso: "Chiuso",
};

// Campi del frontespizio GUIDA-FRONT (delivery-tech/Templates/GUIDA-FRONT.md).
export const FRONT_MATTER_LABELS: Record<string, string> = {
  versione_frontespizio: "Versione frontespizio",
  id: "ID",
  template_origine: "Template di origine",
  template_versione: "Versione template",
  tipo_backlog: "Tipo backlog",
  titolo: "Titolo",
  progetto: "Progetto",
  cliente: "Cliente",
  parent: "Documento padre",
  fase_asdp: "Fase ASDP",
  natura_intervento: "Natura intervento",
  riferimento_richiesta: "Riferimento richiesta",
  stato: "Stato",
  urgenza: "Urgenza",
  job_size_gg: "Dimensione (giorni)",
  story_points: "Story point",
  creato_il: "Creato il",
  scadenza: "Scadenza",
  completato_il: "Completato il",
  linked_items: "Elementi collegati",
  autore: "Autore",
  ruolo_owner: "Ruolo owner",
  versione: "Versione",
  approvato_da: "Approvato da",
  approvato_il: "Approvato il",
  versione_approvata: "Versione approvata",
  gate: "Gate",
  evidenza_approvazione: "Evidenza approvazione",
};

export const USER_STATUS_LABELS: Record<string, string> = {
  attivo: "Attivo",
  sospeso: "Sospeso",
  invitato: "Invitato",
};
