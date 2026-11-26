// Richieste pronte da incollare in Claude (Desktop o Code con il plugin asdp e il connettore
// dell'app) per fare un passo del percorso. Gli input precisi li conosce la skill.

type Step = { name: string; skill: string; feature: string | null; docPath: string | null };

export function stepPrompt(project: { code: string; nature: string }, step: Step) {
  if (step.docPath) {
    return `Progetto ${project.code}. Apri ${step.docPath} dal connettore ASDP Workspace, controlla cosa manca per portarlo a Completo e aggiornalo con la skill ${step.skill}.`;
  }
  const feature = step.feature ? ` della Feature ${step.feature}` : "";
  return `Progetto ${project.code} (${project.nature}). Usa la skill ${step.skill} per creare ${step.name}${feature}. Leggi dal connettore ASDP Workspace i documenti delle fasi precedenti che servono e salva il risultato nell'app.`;
}
