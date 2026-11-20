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

export const USER_STATUS_LABELS: Record<string, string> = {
  attivo: "Attivo",
  sospeso: "Sospeso",
  invitato: "Invitato",
};
