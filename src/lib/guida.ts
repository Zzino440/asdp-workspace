// Guida al framework ASDP mostrata in /guida. L'ordine dell'array è l'ordine di lettura
// (navigazione e Precedente/Successivo). Il testo di ogni pagina è in src/content/guida/<file>.md.

export type GuidaDocumento = {
  code: string; // codice del tipo di documento (document_types.code)
  fase: number;
  scrive: string;
  approva: string;
  input: string[];
  skill: string;
  output: string;
};

export type GuidaPagina = {
  slug: string; // "" = pagina iniziale /guida
  file: string;
  sezione: string;
  titolo: string;
  sottotitolo: string;
  documento?: GuidaDocumento;
};

export const GUIDA_SEZIONI = ["Inizia qui", "Le fasi", "I documenti", "Lavorare con Claude", "Riferimento"];

export const GUIDA: GuidaPagina[] = [
  // Inizia qui
  {
    slug: "",
    file: "introduzione",
    sezione: "Inizia qui",
    titolo: "Cos'è ASDP",
    sottotitolo: "Il metodo DST per portare un progetto dall'idea alla delivery, con l'AI al fianco.",
  },
  {
    slug: "come-usare-app",
    file: "come-usare-app",
    sezione: "Inizia qui",
    titolo: "Come si usa questa app",
    sottotitolo: "Progetti, mappa del percorso, documenti e versioni: dove trovare cosa.",
  },
  {
    slug: "percorso",
    file: "percorso",
    sezione: "Inizia qui",
    titolo: "Il percorso in 5 fasi",
    sottotitolo: "Le fasi, i documenti che producono e l'ordine in cui si fanno.",
  },

  // Le fasi
  {
    slug: "fase-0",
    file: "fase-0",
    sezione: "Le fasi",
    titolo: "Fase 0 · Setup progetto",
    sottotitolo: "Preparare e fare il kickoff, fissare chi fa cosa e quando.",
  },
  {
    slug: "fase-1",
    file: "fase-1",
    sezione: "Le fasi",
    titolo: "Fase 1 · Analisi",
    sottotitolo: "Dai workshop con il cliente ai requisiti consolidati e all'analisi funzionale.",
  },
  {
    slug: "fase-2",
    file: "fase-2",
    sezione: "Le fasi",
    titolo: "Fase 2 · Architettura",
    sottotitolo: "Le scelte tecniche e le regole del codice su cui si costruisce.",
  },
  {
    slug: "fase-3",
    file: "fase-3",
    sezione: "Le fasi",
    titolo: "Fase 3 · Rischi",
    sottotitolo: "Cosa può andare storto, quanto pesa e chi se ne occupa.",
  },
  {
    slug: "fase-4",
    file: "fase-4",
    sezione: "Le fasi",
    titolo: "Fase 4 · Preparazione delivery",
    sottotitolo: "Backlog, analisi tecnica per Feature e task pronti da sviluppare.",
  },

  // I documenti
  {
    slug: "t0-1a",
    file: "t0-1a",
    sezione: "I documenti",
    titolo: "T0.1a · Kickoff Pack",
    sottotitolo: "Il materiale che il PM prepara e porta al kickoff.",
    documento: {
      code: "T0.1a",
      fase: 0,
      scrive: "PM",
      approva: "Nessuna approvazione formale: si porta al kickoff",
      input: ["Documenti di pre-vendita (RFP, offerta, contratto, email)", "Note del PM", "Tipo di progetto"],
      skill: "asdp:t0-1-kickoff (modo prepare)",
      output: "Kickoff Pack",
    },
  },
  {
    slug: "t0-1",
    file: "t0-1",
    sezione: "I documenti",
    titolo: "T0.1 · Verbale Kickoff",
    sottotitolo: "Cosa si è deciso al kickoff e cosa manca per chiuderlo.",
    documento: {
      code: "T0.1",
      fase: 0,
      scrive: "PM",
      approva: "PM (verbale distribuito)",
      input: ["Trascrizione del kickoff", "Note del PM e tipo di progetto", "Kickoff Pack (T0.1a), facoltativo"],
      skill: "asdp:t0-1-kickoff (modo minutes)",
      output: "Verbale del kickoff",
    },
  },
  {
    slug: "p1-3",
    file: "p1-3",
    sezione: "I documenti",
    titolo: "P1.3 · Requisiti Consolidati",
    sottotitolo: "Tutto quello che il cliente ha detto, messo in ordine e chiarito.",
    documento: {
      code: "P1.3",
      fase: 1,
      scrive: "AF",
      approva: "Nessuna approvazione formale: il gate è \"Requisiti consolidati\" (AF)",
      input: ["Trascrizioni e note dei workshop (anche NFR)", "Verbale del kickoff (T0.1)"],
      skill: "asdp:p1-3-requirements-consolidation",
      output: "Requisiti consolidati, con le domande aperte D[N]",
    },
  },
  {
    slug: "t1-4",
    file: "t1-4",
    sezione: "I documenti",
    titolo: "T1.4 · Analisi Funzionale",
    sottotitolo: "Feature, casi d'uso e priorità: cosa farà il sistema.",
    documento: {
      code: "T1.4",
      fase: 1,
      scrive: "AF",
      approva: "PO del cliente, dopo una revisione interna del TL",
      input: [
        "Requisiti Consolidati (P1.3): è l'unica fonte dei requisiti",
        "Codice esistente, solo nelle evolutive (stato attuale e differenze)",
      ],
      skill: "asdp:t1-4-functional-analysis",
      output: "Analisi funzionale",
    },
  },
  {
    slug: "t2-2",
    file: "t2-2",
    sezione: "I documenti",
    titolo: "T2.2 · Architettura",
    sottotitolo: "Le decisioni tecniche principali e perché si sono prese.",
    documento: {
      code: "T2.2",
      fase: 2,
      scrive: "TL",
      approva: "TL",
      input: [
        "Analisi Funzionale (T1.4) con gli NFR",
        "Vincoli dal verbale del kickoff",
        "Codice e architettura esistenti, se è un'evolutiva",
      ],
      skill: "asdp:t2-2-architecture",
      output: "Architettura con le decisioni (ADR)",
    },
  },
  {
    slug: "t2-4",
    file: "t2-4",
    sezione: "I documenti",
    titolo: "T2.4 · Contesto Tecnico",
    sottotitolo: "Le regole del codice che chi sviluppa (persona o agente) deve seguire.",
    documento: {
      code: "T2.4",
      fase: 2,
      scrive: "TL",
      approva: "TL",
      input: ["Codice del progetto (o Architettura T2.2 se si parte da zero)", "Regole dichiarate dal TL"],
      skill: "asdp:t2-4-technical-context",
      output: "Contesto tecnico",
    },
  },
  {
    slug: "t3-1",
    file: "t3-1",
    sezione: "I documenti",
    titolo: "T3.1 · Risk Register",
    sottotitolo: "I rischi del progetto, con punteggio, mitigazione e responsabile.",
    documento: {
      code: "T3.1",
      fase: 3,
      scrive: "PM, con il TL",
      approva: "PM; si condivide con sponsor e PO",
      input: [
        "Analisi Funzionale (T1.4)",
        "Architettura (T2.2)",
        "Kickoff Pack, Verbale e note del PM",
        "Risk Register esistente, nelle evolutive",
        "Stima d'offerta, se c'è",
      ],
      skill: "asdp:t3-1-risk-register",
      output: "Registro dei rischi",
    },
  },
  {
    slug: "t4-1",
    file: "t4-1",
    sezione: "I documenti",
    titolo: "T4.1 · Backlog",
    sottotitolo: "Le User Story che derivano dall'analisi, pronte per iceScrum.",
    documento: {
      code: "T4.1",
      fase: 4,
      scrive: "AF",
      approva: "PM (gate G1)",
      input: ["Analisi Funzionale (T1.4), meglio se approvata", "Risk Register (T3.1), facoltativo"],
      skill: "asdp:t4-1-user-story-backlog",
      output: "Backlog in Markdown e CSV per iceScrum",
    },
  },
  {
    slug: "t4-2",
    file: "t4-2",
    sezione: "I documenti",
    titolo: "T4.2 · Analisi Tecnica",
    sottotitolo: "Il contratto tecnico di una Feature, prima di scrivere codice.",
    documento: {
      code: "T4.2",
      fase: 4,
      scrive: "TL",
      approva: "TL (gate G2, insieme al Piano di lavoro)",
      input: [
        "Righe del Backlog (T4.1) della Feature",
        "Analisi Funzionale (T1.4)",
        "Architettura (T2.2)",
        "Approfondimenti T2.7 citati per la Feature",
        "Contesto Tecnico (T2.4) e codice esistente, facoltativi",
      ],
      skill: "asdp:t4-2-technical-analysis",
      output: "Analisi tecnica della Feature",
    },
  },
  {
    slug: "t4-3-index",
    file: "t4-3-index",
    sezione: "I documenti",
    titolo: "T4.3-INDEX · Piano di lavoro",
    sottotitolo: "Come si divide il lavoro di una Feature tra le sue User Story.",
    documento: {
      code: "T4.3-INDEX",
      fase: 4,
      scrive: "TL",
      approva: "TL (gate G2, nella stessa seduta dell'Analisi Tecnica)",
      input: [
        "Analisi Tecnica (T4.2) senza domande aperte",
        "Righe del Backlog (T4.1) della Feature",
        "Approfondimenti T2.7 citati per la Feature",
      ],
      skill: "asdp:t4-3-index-work-plan",
      output: "Piano di lavoro della Feature",
    },
  },
  {
    slug: "t4-3-part",
    file: "t4-3-part",
    sezione: "I documenti",
    titolo: "T4.3-part · Task + Scaffold",
    sottotitolo: "I task di una User Story e lo scheletro del codice, pronti per lo sviluppo.",
    documento: {
      code: "T4.3-part",
      fase: 4,
      scrive: "TL",
      approva: "TL (gate G3)",
      input: [
        "Piano di lavoro (T4.3-INDEX) approvato a G2",
        "Analisi Tecnica (T4.2)",
        "Contesto Tecnico (T2.4)",
        "Approfondimenti T2.7 citati per la Feature",
      ],
      skill: "asdp:t4-3-part-task-scaffold",
      output: "Task e scaffold di una User Story",
    },
  },

  // Lavorare con Claude
  {
    slug: "collegare-claude",
    file: "collegare-claude",
    sezione: "Lavorare con Claude",
    titolo: "Collegare Claude",
    sottotitolo: "Claude Desktop con il plugin asdp, che porta skill e connettore; Claude Code per TL e sviluppatori.",
  },
  {
    slug: "lanciare-skill",
    file: "lanciare-skill",
    sezione: "Lavorare con Claude",
    titolo: "Lanciare una skill",
    sottotitolo: "Come chiedere a Claude di produrre un documento e cosa aspettarsi.",
  },
  {
    slug: "domande-aperte",
    file: "domande-aperte",
    sezione: "Lavorare con Claude",
    titolo: "Rispondere alle domande D[N]",
    sottotitolo: "Le domande che le skill lasciano nei documenti e come chiuderle.",
  },
  {
    slug: "aggiornare-documento",
    file: "aggiornare-documento",
    sezione: "Lavorare con Claude",
    titolo: "Aggiornare un documento",
    sottotitolo: "Rilanciare una skill su un documento che esiste già.",
  },

  // Riferimento
  {
    slug: "ruoli",
    file: "ruoli",
    sezione: "Riferimento",
    titolo: "Ruoli e approvazioni",
    sottotitolo: "Chi scrive, chi approva e chi viene consultato per ogni documento.",
  },
  {
    slug: "stati",
    file: "stati",
    sezione: "Riferimento",
    titolo: "Stati e frontespizio",
    sottotitolo: "Da fare, In corso, Completo, Approvato e i dati in testa a ogni documento.",
  },
  {
    slug: "gate",
    file: "gate",
    sezione: "Riferimento",
    titolo: "Gate",
    sottotitolo: "I punti di controllo: i gate A e B delle skill e i gate G1, G2, G3 della Fase 4.",
  },
  {
    slug: "glossario",
    file: "glossario",
    sezione: "Riferimento",
    titolo: "Glossario",
    sottotitolo: "Le parole del framework, in ordine alfabetico.",
  },
];

export function guidaHref(slug: string) {
  return slug ? `/guida/${slug}` : "/guida";
}

// Pagina della Guida per un tipo di documento (document_types.code), se esiste.
export function guidaHrefForType(code: string) {
  const page = GUIDA.find((p) => p.documento?.code === code);
  return page ? guidaHref(page.slug) : null;
}
