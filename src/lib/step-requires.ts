import { isDone } from "./phase-progress";
import type { MapType, NextStep } from "./project-steps";

// Prerequisiti dei passi (document_types.requires). L'ordine consigliato resta sort_order:
// i prerequisiti dicono solo cosa serve prima e cosa si può anticipare.

export type MissingType = { code: string; name: string; phase: number };

// Tipi richiesti non ancora pronti. Un tipo per-feature richiesto si valuta sulla stessa Feature.
export function missingRequires(types: MapType[], requires: string[], feature: string | null): MissingType[] {
  return requires
    .map((code) => types.find((t) => t.code === code))
    .filter((t): t is MapType => {
      if (!t) return false;
      const docs = t.perFeature && feature !== null ? t.docs.filter((d) => (d.feature ?? "") === feature) : t.docs;
      return docs.length === 0 || docs.some((d) => !isDone(d));
    })
    .map((t) => ({ code: t.code, name: t.name, phase: t.phase }));
}

// Passi di fasi successive al prossimo passo che hanno già tutti i prerequisiti pronti.
export function parallelSteps(open: NextStep[], next: NextStep | null) {
  if (!next) return [];
  return open.filter((s) => s !== next && s.phase > next.phase && s.missing.length === 0);
}
