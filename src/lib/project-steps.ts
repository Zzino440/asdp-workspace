import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listActivity, listDocuments } from "@/lib/documents";
import { featureOf } from "@/lib/features";
import { isDone } from "@/lib/phase-progress";
import type { Question } from "@/lib/questions";
import { missingRequires, parallelSteps, type MissingType } from "@/lib/step-requires";

// Percorso del progetto: catalogo dei tipi con skill (document_types) incrociato con l'indice dei
// documenti e passi aperti. Lo usano la mappa del Percorso e i tool MCP, così danno lo stesso risultato.

export type MapDoc = {
  path: string;
  href: string;
  title: string;
  state: string | null;
  version: string | null;
  typeCode: string | null;
  feature: string | null;
  owner: string | null;
  deadline: string | null;
  questions: Question[];
  changesRequested: { by: string; reason: string } | null;
};
export type MapType = {
  code: string;
  name: string;
  phase: number;
  skill: string;
  perFeature: boolean;
  requires: string[];
  docs: MapDoc[];
};
export type NextStep = {
  code: string;
  name: string;
  phase: number;
  skill: string;
  perFeature: boolean;
  feature: string | null;
  doc: MapDoc | null;
  missing: MissingType[];
};

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim());
const isoDate = (value: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(text(value)) ? text(value) : null);

export async function projectSteps(supabase: SupabaseClient, projectId: string) {
  const [documents, { data: types }, activity] = await Promise.all([
    listDocuments(supabase, projectId),
    supabase
      .from("document_types")
      .select("code, name, phase, skill_name, per_feature, requires, sort_order")
      .not("skill_name", "is", null)
      .order("sort_order"),
    listActivity(supabase, projectId, 200),
  ]);

  // Ultimo passo del flusso di approvazione per documento: se è "Richiede modifiche" e il
  // documento è ancora In corso, il motivo del revisore resta in vista.
  const lastReview = new Map<string, (typeof activity)[number]>();
  for (const e of activity) {
    if (!lastReview.has(e.path) && /^(Richiede modifiche a|Segna come completo|Approva|Revoca)/.test(e.title))
      lastReview.set(e.path, e);
  }

  const toDoc = (d: (typeof documents)[number]): MapDoc => {
    const front = d.front_matter as Record<string, unknown>;
    const state = front.stato ? String(front.stato) : null;
    const review = lastReview.get(d.path);
    return {
      path: d.path,
      href: `/progetti/${projectId}/documenti/${d.path.split("/").map(encodeURIComponent).join("/")}`,
      title: String(front.titolo || d.path.split("/").pop()),
      state,
      version: front.versione ? String(front.versione) : null,
      typeCode: d.document_type,
      feature: featureOf(d.path),
      owner: [text(front.autore), front.ruolo_owner ? `(${text(front.ruolo_owner)})` : ""].filter(Boolean).join(" ") || null,
      deadline: isoDate(front.scadenza),
      questions: (d.questions ?? []) as Question[],
      changesRequested:
        state === "In corso" && review?.title.startsWith("Richiede modifiche")
          ? { by: review.author_name, reason: review.detail ?? "" }
          : null,
    };
  };

  const mapTypes: MapType[] = (types ?? []).map((t) => ({
    code: t.code,
    name: t.name,
    phase: t.phase as number,
    skill: t.skill_name as string,
    perFeature: t.per_feature,
    requires: t.requires ?? [],
    docs: documents.filter((d) => d.document_type === t.code).map(toDoc),
  }));
  const catalog = new Set(mapTypes.map((t) => t.code));
  const otherFiles = documents.filter((d) => !d.document_type || !catalog.has(d.document_type)).map(toDoc);
  const features = [
    ...new Set(mapTypes.filter((t) => t.perFeature).flatMap((t) => t.docs.map((d) => d.feature ?? ""))),
  ].sort();

  // Passi aperti in ordine sort_order: un tipo che manca o ha un documento non Completo/Approvato.
  // I tipi per-feature si valutano Feature per Feature (le Feature sono quelle con almeno un
  // documento per-feature); senza Feature, il tipo vale come passo per la prima Feature.
  const open: NextStep[] = [];
  for (const type of mapTypes) {
    const groups = type.perFeature && features.length > 0 ? features : [null];
    for (const feature of groups) {
      const docs = type.perFeature && feature !== null ? type.docs.filter((d) => (d.feature ?? "") === feature) : type.docs;
      if (docs.length === 0 || docs.some((d) => !isDone(d)))
        open.push({
          code: type.code,
          name: type.name,
          phase: type.phase,
          skill: type.skill,
          perFeature: type.perFeature,
          feature,
          doc: docs.find((d) => !isDone(d)) ?? null,
          missing: missingRequires(mapTypes, type.requires, feature),
        });
    }
  }
  return { mapTypes, otherFiles, features, open, activity };
}

// Prossimo passo (consigliato): il primo aperto dalla fase attuale in poi (se non ce ne sono, il
// primo arretrato). Gli aperti delle fasi precedenti contano come arretrati: restano da fare.
// In parallelo: passi delle fasi successive con i prerequisiti già pronti (es. il Backlog).
export function nextStep(open: NextStep[], currentPhase: number) {
  const next = open.find((s) => s.phase >= currentPhase) ?? open[0] ?? null;
  const behind = open.filter((s) => s.phase < currentPhase && s !== next);
  return { next, behind, parallel: parallelSteps(open, next) };
}
