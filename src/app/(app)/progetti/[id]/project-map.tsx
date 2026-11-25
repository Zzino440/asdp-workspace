"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { DocumentStateBadge } from "@/components/document-state-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ReindexMenu } from "./reindex-button";

export type MapDoc = {
  path: string;
  href: string;
  title: string;
  state: string | null;
  version: string | null;
  typeCode: string | null;
  feature: string | null;
};
export type MapType = {
  code: string;
  name: string;
  phase: number;
  skill: string;
  perFeature: boolean;
  docs: MapDoc[];
};
export type NextStep = { code: string; name: string; skill: string; perFeature: boolean; feature: string | null; doc: MapDoc | null };

const PHASES = [0, 1, 2, 3, 4];

export function ProjectMap({
  projectId,
  currentPhase,
  canReindex,
  types,
  features,
  otherFiles,
  next,
}: {
  projectId: string;
  currentPhase: number;
  canReindex: boolean;
  types: MapType[];
  features: string[];
  otherFiles: MapDoc[];
  next: NextStep | null;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const typeMatches = (t: MapType) => !q || `${t.code} ${t.name} ${t.skill}`.toLowerCase().includes(q);
  const docMatches = (d: MapDoc) => !q || `${d.title} ${d.path}`.toLowerCase().includes(q);
  // Con il filtro attivo un tipo resta visibile se combacia lui o uno dei suoi documenti.
  const visible = (t: MapType, docs: MapDoc[]) => (typeMatches(t) ? docs : docs.filter(docMatches));
  const show = (t: MapType, docs: MapDoc[]) => typeMatches(t) || docs.some(docMatches);
  const visibleOther = otherFiles.filter(docMatches);

  return (
    <div className="flex flex-col gap-4">
      {next && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary bg-primary/10 p-4">
          <span className="text-xs font-medium text-muted-foreground">Prossimo passo</span>
          <div className="flex flex-wrap items-center gap-2">
            <ArrowRight className="size-4 text-primary" />
            <span className="font-medium">
              {next.code} {next.name}
              {next.feature ? ` · Feature ${next.feature}` : ""}
            </span>
            {next.doc ? <DocumentStateBadge state={next.doc.state ?? "Da fare"} /> : <ToCreateBadge />}
          </div>
          <p className="text-sm text-muted-foreground">
            {next.doc ? (
              <>
                Completa il documento{" "}
                <Link href={next.doc.href} className="text-foreground hover:underline">
                  {next.doc.title}
                </Link>
                , oppure aggiornalo con <SkillName skill={next.skill} />.
              </>
            ) : (
              <>
                Da creare con <SkillName skill={next.skill} />
                {next.perFeature && !next.feature ? " per la prima Feature del backlog" : ""}.
              </>
            )}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtra documenti per nome, codice o percorso"
            className="pl-8"
          />
        </div>
        {canReindex && <ReindexMenu projectId={projectId} />}
      </div>

      {PHASES.map((phase) => {
        const phaseTypes = types.filter((t) => t.phase === phase);
        const single = phaseTypes.filter((t) => !t.perFeature && show(t, t.docs));
        const perFeature = phaseTypes.filter((t) => t.perFeature);
        const featureGroups = features
          .map((feature) => ({
            feature,
            rows: perFeature
              .map((t) => ({ type: t, docs: t.docs.filter((d) => (d.feature ?? "") === feature) }))
              .filter((r) => show(r.type, r.docs)),
          }))
          .filter((g) => g.rows.length > 0);
        const perFeatureVisible = perFeature.filter((t) => typeMatches(t));
        if (single.length === 0 && featureGroups.length === 0 && (features.length > 0 || perFeatureVisible.length === 0))
          return null;

        const done = phaseTypes.flatMap((t) => t.docs).filter((d) => d.state === "Completo" || d.state === "Approvato");
        const total = phaseTypes.flatMap((t) => t.docs).length;
        return (
          <section key={phase} className="rounded-lg border border-border">
            <header className="flex items-center gap-3 border-b border-border bg-sidebar px-4 py-2">
              <h3 className="font-medium">Fase {phase}</h3>
              {phase === currentPhase && <Badge variant="secondary">Fase corrente</Badge>}
              <span className="ml-auto text-xs text-muted-foreground">
                {total === 0 ? "Nessun documento" : `${done.length} di ${total} completati`}
              </span>
            </header>
            <div className="divide-y divide-border">
              {single.map((t) => (
                <TypeRows key={t.code} type={t} docs={visible(t, t.docs)} />
              ))}
              {perFeature.length > 0 && features.length === 0 && perFeatureVisible.length > 0 && (
                <div className="flex flex-col gap-1 px-4 py-3">
                  <span className="text-sm">Per ogni Feature del backlog (nessuna ancora avviata):</span>
                  {perFeatureVisible.map((t) => (
                    <span key={t.code} className="text-sm text-muted-foreground">
                      {t.code} {t.name} — <SkillName skill={t.skill} />
                    </span>
                  ))}
                </div>
              )}
              {featureGroups.map((g) => (
                <div key={g.feature}>
                  <div className="bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                    {g.feature ? `Feature ${g.feature}` : "Senza Feature"}
                  </div>
                  {g.rows.map((r) => (
                    <TypeRows key={r.type.code} type={r.type} docs={visible(r.type, r.docs)} />
                  ))}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {visibleOther.length > 0 && (
        <section className="rounded-lg border border-border">
          <header className="border-b border-border bg-sidebar px-4 py-2">
            <h3 className="font-medium">Altri file</h3>
          </header>
          <div className="divide-y divide-border">
            {visibleOther.map((d) => (
              <DocRow key={d.path} doc={d} label={d.typeCode ?? "—"} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TypeRows({ type, docs }: { type: MapType; docs: MapDoc[] }) {
  const label = `${type.code} ${type.name}`;
  if (docs.length === 0) {
    return (
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_12rem_7rem_4rem]">
        <div className="flex flex-col">
          <span className="font-medium text-muted-foreground">{type.name}</span>
          <span className="text-xs text-muted-foreground">
            Si crea con <SkillName skill={type.skill} />
          </span>
        </div>
        <span className="hidden text-sm text-muted-foreground sm:block">{label}</span>
        <ToCreateBadge />
        <span className="hidden sm:block" />
      </div>
    );
  }
  return docs.map((d) => <DocRow key={d.path} doc={d} label={label} />);
}

function DocRow({ doc, label }: { doc: MapDoc; label: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_12rem_7rem_4rem]">
      <div className="flex min-w-0 flex-col">
        <Link href={doc.href} className="truncate font-medium hover:underline">
          {doc.title}
        </Link>
        <span className="truncate font-mono text-xs text-muted-foreground">{doc.path}</span>
      </div>
      <span className="hidden text-sm sm:block">{label}</span>
      <DocumentStateBadge state={doc.state} />
      <span className="hidden text-sm text-muted-foreground sm:block">{doc.version ?? "—"}</span>
    </div>
  );
}

// "Da creare" non è uno stato del frontespizio: badge neutro tratteggiato, distinto da "Da fare".
function ToCreateBadge() {
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-dashed border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Da creare
    </span>
  );
}

function SkillName({ skill }: { skill: string }) {
  return <code className="font-mono text-xs text-foreground">/{skill}</code>;
}
