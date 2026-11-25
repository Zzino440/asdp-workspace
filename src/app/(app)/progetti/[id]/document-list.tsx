import { cache } from "react";
import { listDocuments } from "@/lib/documents";
import { featureOf } from "@/lib/features";
import { createClient } from "@/lib/supabase/server";
import { ProjectMap, type MapDoc, type MapType, type NextStep } from "./project-map";

const DONE_STATES = ["Completo", "Approvato"];
const isDone = (doc: MapDoc) => doc.state !== null && DONE_STATES.includes(doc.state);


// Catalogo dei tipi con skill (document_types) incrociato con l'indice, e passi aperti.
// Lo usano la mappa del percorso e il pulsante "Passa alla fase" dell'intestazione
// (cache: una sola lettura per richiesta).
export const loadProjectSteps = cache(async (projectId: string) => {
  const supabase = await createClient();
  const [documents, { data: types }] = await Promise.all([
    listDocuments(supabase, projectId),
    supabase
      .from("document_types")
      .select("code, name, phase, skill_name, per_feature, sort_order")
      .not("skill_name", "is", null)
      .order("sort_order"),
  ]);

  const toDoc = (d: (typeof documents)[number]): MapDoc => {
    const front = d.front_matter as Record<string, unknown>;
    return {
      path: d.path,
      href: `/progetti/${projectId}/documenti/${d.path.split("/").map(encodeURIComponent).join("/")}`,
      title: String(front.titolo || d.path.split("/").pop()),
      state: front.stato ? String(front.stato) : null,
      version: front.versione ? String(front.versione) : null,
      typeCode: d.document_type,
      feature: featureOf(d.path),
    };
  };

  const mapTypes: MapType[] = (types ?? []).map((t) => ({
    code: t.code,
    name: t.name,
    phase: t.phase as number,
    skill: t.skill_name as string,
    perFeature: t.per_feature,
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
        open.push({ code: type.code, name: type.name, phase: type.phase, skill: type.skill, perFeature: type.perFeature, feature, doc: docs.find((d) => !isDone(d)) ?? null });
    }
  }
  return { mapTypes, otherFiles, features, open };
});

// Mappa del percorso ASDP.
export async function DocumentList({
  projectId,
  currentPhase,
  canReindex,
}: {
  projectId: string;
  currentPhase: number;
  canReindex: boolean;
}) {
  const { mapTypes, otherFiles, features, open } = await loadProjectSteps(projectId);

  // Prossimo passo: il primo aperto dalla fase attuale in poi (se non ce ne sono, il primo
  // arretrato). Gli aperti delle fasi precedenti sono segnalati a parte come arretrati.
  const next = open.find((s) => s.phase >= currentPhase) ?? open[0] ?? null;
  const behind = open.filter((s) => s.phase < currentPhase && s !== next).length;

  return (
    <ProjectMap
      projectId={projectId}
      currentPhase={currentPhase}
      canReindex={canReindex}
      types={mapTypes}
      features={features}
      otherFiles={otherFiles}
      next={next}
      behind={behind}
    />
  );
}
