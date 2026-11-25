// Gate di approvazione per tipo di documento (testi da src/content/guida/gate.md).
// name: valore del campo `gate` del frontespizio, come nei commenti dei template GUIDA-FRONT.
// externalEvidence: l'approvazione è del cliente e il PM la registra con un'evidenza scritta.
export type Gate = { name: string | null; approver: string; checklist: string[]; externalEvidence?: boolean };

const G2 = ["Componenti, API e dati sono precisi", "Analisi Tecnica e Piano di lavoro validati nella stessa seduta"];

export const GATES: Record<string, Gate> = {
  "T0.1a": { name: null, approver: "PM", checklist: [] },
  "T0.1": { name: "Verbale distribuito", approver: "PM", checklist: ["Kickoff fatto", "Verbale distribuito"] },
  "P1.3": { name: "Requisiti consolidati", approver: "PM", checklist: [] },
  "T1.4": {
    name: "Analisi funzionale approvata",
    approver: "PO del cliente (lo registra il PM)",
    checklist: ["Nessuna domanda aperta bloccante", "Ogni requisito è coperto", "Il PO del cliente ha approvato"],
    externalEvidence: true,
  },
  "T2.2": {
    name: "Architettura approvata",
    approver: "TL",
    checklist: ["Requisiti non funzionali definiti", "Decisioni registrate come ADR"],
  },
  "T2.4": { name: "Contesto tecnico approvato", approver: "TL", checklist: ["Contesto tecnico pronto per lo sviluppo"] },
  "T3.1": {
    name: "Risk Register condiviso",
    approver: "PM",
    checklist: [
      "Rischi in tutte le categorie",
      "Ogni rischio ha mitigazione e responsabile",
      "Registro condiviso con sponsor e PO",
    ],
  },
  "T4.1": {
    name: "G1 Backlog approvato",
    approver: "PM",
    checklist: [
      "Ogni caso d'uso è coperto da User Story",
      "Nessuna storia è orfana",
      "Le differenze con l'offerta sono spiegate",
      "Il piano degli sprint sta nella capacità del team",
    ],
  },
  "T4.2": { name: "G2 Analisi tecnica validata", approver: "TL", checklist: G2 },
  "T4.3-INDEX": {
    name: "G2 Piano di lavoro approvato",
    approver: "TL",
    checklist: [
      "Tutto è coperto da task",
      "I task non hanno dipendenze circolari",
      "Il checkpoint è definito",
      "L'effort torna con il backlog",
    ],
  },
  "T4.3-part": {
    name: "G3 Task approvato",
    approver: "TL",
    checklist: [
      "Il codice compila",
      "Non ci sono segnaposto",
      "La Definition of Done è legata ai criteri di accettazione",
      "La sicurezza è a posto",
    ],
  },
};

// Tipo senza gate censito: si approva senza checklist.
export const gateFor = (documentType: string | null): Gate =>
  (documentType && GATES[documentType]) || { name: null, approver: "chi ha il permesso Approva", checklist: [] };
