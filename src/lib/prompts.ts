// Richieste pronte da incollare in Claude (Desktop o Code con il plugin asdp e il connettore
// dell'app) per fare un passo del percorso. Gli input precisi li conosce la skill.

type Step = { code: string; name: string; skill: string; feature: string | null; docPath: string | null };

// Cartelle Teams (TEAMS_FOLDERS in src/lib/workspace.ts) con i file del cliente per i passi che li usano.
const TEAMS_INPUTS: Record<string, string[]> = {
  "T0.1a": ["Input cliente"],
  "T0.1": ["Verbali e trascrizioni"],
  "P1.3": ["Verbali e trascrizioni", "Input cliente"],
};

// Con una cartella Teams collegata: dove sono i file del cliente da leggere.
function teamsLine(project: { teams: boolean }, code: string) {
  const folders = TEAMS_INPUTS[code];
  if (!project.teams || !folders) return "";
  const names = folders.map((f) => `«${f}»`).join(" e ");
  return ` I file del cliente sono nella cartella Teams del progetto, in ${names}: elencali con list_project_files e leggi quelli utili con read_project_file.`;
}

// Domande D[N] con la risposta spuntata: rilancia la skill in aggiornamento (Guida, domande-aperte).
export function answersPrompt(project: { code: string }, doc: { name: string; skill: string; docPath: string }) {
  return `Progetto ${project.code}. Ho risposto ad alcune domande D[N] di ${doc.name} (${doc.docPath}). Aggiorna il documento con la skill ${doc.skill} applicando le risposte, senza toccare le domande ancora aperte, e salvalo dal connettore ASDP Workspace.`;
}

export function stepPrompt(project: { code: string; nature: string; teams: boolean }, step: Step) {
  const teams = teamsLine(project, step.code);
  if (step.docPath) {
    return `Progetto ${project.code}. Apri ${step.docPath} dal connettore ASDP Workspace, controlla cosa manca per portarlo a Completo e aggiornalo con la skill ${step.skill}.${teams}`;
  }
  const feature = step.feature ? ` della Feature ${step.feature}` : "";
  return `Progetto ${project.code} (${project.nature}). Usa la skill ${step.skill} per creare ${step.name}${feature}. Leggi dal connettore ASDP Workspace i documenti delle fasi precedenti che servono e salva il risultato nell'app.${teams}`;
}
