// Avanzamento di una fase del percorso: lo usano la mappa del progetto e la lista Progetti, così
// il "pronti/attesi" è lo stesso nei due posti.

type ProgressDoc = { state: string | null; feature: string | null };
type ProgressType = { phase: number; perFeature: boolean; docs: ProgressDoc[] };

export const isDone = (d: { state: string | null }) => d.state === "Completo" || d.state === "Approvato";

// Documenti attesi (un tipo, o un tipo per ogni Feature) e quelli pronti (tutti Completo/Approvato).
export function phaseProgress(types: ProgressType[], features: string[], phase: number) {
  let expected = 0;
  let ready = 0;
  let started = false;
  for (const t of types.filter((t) => t.phase === phase)) {
    const slots = t.perFeature ? features.map((f) => t.docs.filter((d) => (d.feature ?? "") === f)) : [t.docs];
    for (const docs of slots) {
      expected++;
      if (docs.length > 0) started = true;
      if (docs.length > 0 && docs.every(isDone)) ready++;
    }
  }
  return { expected, ready, started };
}
