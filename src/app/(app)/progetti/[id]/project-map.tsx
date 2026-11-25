"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Search } from "lucide-react";
import { cn } from "cn";
import { DocumentStateBadge } from "@/components/document-state-badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReindexMenu } from "./reindex-button";
import { PHASES } from "@/lib/labels";

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
export type NextStep = {
  code: string;
  name: string;
  phase: number;
  skill: string;
  perFeature: boolean;
  feature: string | null;
  doc: MapDoc | null;
};

const isDone = (d: MapDoc) => d.state === "Completo" || d.state === "Approvato";

export function ProjectMap({
  projectId,
  currentPhase,
  canReindex,
  types,
  features,
  otherFiles,
  next,
  behind,
}: {
  projectId: string;
  currentPhase: number;
  canReindex: boolean;
  types: MapType[];
  features: string[];
  otherFiles: MapDoc[];
  next: NextStep | null;
  behind: number;
}) {
  const [selected, setSelected] = useState(next?.phase ?? currentPhase);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // Avanzamento di una fase: documenti attesi (un tipo, o un tipo per ogni Feature) e quelli pronti.
  const progress = (phase: number) => {
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
  };

  return (
    <div className="flex flex-col gap-6">
      {next && <NextStepCard next={next} />}
      {behind > 0 && (
        <p className="text-sm text-muted-foreground">
          {behind === 1
            ? "1 documento delle fasi precedenti non è ancora pronto: lo trovi nelle fasi qui sotto."
            : `${behind} documenti delle fasi precedenti non sono ancora pronti: li trovi nelle fasi qui sotto.`}
        </p>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca un documento"
            className="pl-8"
          />
        </div>
        {canReindex && <ReindexMenu projectId={projectId} />}
      </div>

      {q ? (
        <SearchResults types={types} otherFiles={otherFiles} q={q} />
      ) : (
        <>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {PHASES.map(({ n, name }) => {
              const p = progress(n);
              const complete = p.expected > 0 && p.ready === p.expected;
              return (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => setSelected(n)}
                    aria-current={selected === n ? "step" : undefined}
                    className={cn(
                      "flex h-full w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                      selected === n ? "border-primary bg-primary/10" : "border-border",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                          complete
                            ? "border-(--state-approved-border) bg-(--state-approved) text-(--state-approved-foreground)"
                            : p.started
                              ? "border-(--state-progress-border) bg-(--state-progress) text-(--state-progress-foreground)"
                              : "border-border text-muted-foreground",
                        )}
                      >
                        {complete ? <Check className="size-3.5" /> : n}
                      </span>
                      {n === currentPhase && <span className="text-xs text-primary">Fase attuale</span>}
                    </span>
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.expected === 0 ? "Nessun documento" : `${p.ready} di ${p.expected} pronti`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <PhasePanel
            phase={PHASES[selected]}
            types={types.filter((t) => t.phase === selected)}
            features={features}
          />

          {otherFiles.length > 0 && (
            <details className="rounded-lg border border-border">
              <summary className="cursor-pointer px-4 py-3 text-sm text-muted-foreground">
                Altri file nella cartella del progetto ({otherFiles.length})
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {otherFiles.map((d) => (
                  <li key={d.path}>
                    <DocRow doc={d} name={d.title} />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function NextStepCard({ next }: { next: NextStep }) {
  const where = `Fase ${next.phase} · ${PHASES[next.phase].name}${next.feature ? ` · Feature ${next.feature}` : ""}`;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary bg-primary/10 p-5 sm:flex-row sm:items-center">
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-xs font-medium text-primary">Prossimo passo · {where}</span>
        <span className="text-lg font-medium">
          {next.doc ? `Completa ${next.name}` : `Crea ${next.name}`}
          {next.perFeature && !next.feature ? " della prima Feature" : ""}
        </span>
        <span className="text-sm text-muted-foreground">
          {next.doc ? (
            <>
              Il documento è <span className="text-foreground">{next.doc.state ?? "senza stato"}</span>: va portato a
              Completo.
            </>
          ) : (
            <>
              Si genera con Claude usando la skill <Skill skill={next.skill} />.
            </>
          )}
        </span>
      </div>
      {next.doc && (
        <Link href={next.doc.href} className={buttonVariants()}>
          Apri documento
        </Link>
      )}
    </div>
  );
}

function PhasePanel({
  phase,
  types,
  features,
}: {
  phase: { n: number; name: string };
  types: MapType[];
  features: string[];
}) {
  const single = types.filter((t) => !t.perFeature);
  const perFeature = types.filter((t) => t.perFeature);
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-medium">
        Fase {phase.n} · {phase.name}
      </h3>
      {single.length > 0 && (
        <ul className="flex flex-col gap-2">
          {single.map((t) => (
            <TypeItems key={t.code} type={t} docs={t.docs} />
          ))}
        </ul>
      )}
      {perFeature.length > 0 && features.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Per ogni Feature del backlog si preparano: {perFeature.map((t) => t.name).join(", ")}. Nessuna Feature è
          ancora avviata: si parte con <Skill skill={perFeature[0].skill} />.
        </div>
      )}
      {perFeature.length > 0 &&
        features.map((f) => (
        <div key={f} className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-muted-foreground">{f ? `Feature ${f}` : "Senza Feature"}</h4>
          <ul className="flex flex-col gap-2">
            {perFeature.map((t) => (
              <TypeItems key={t.code} type={t} docs={t.docs.filter((d) => (d.feature ?? "") === f)} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function TypeItems({ type, docs }: { type: MapType; docs: MapDoc[] }) {
  if (docs.length === 0) {
    return (
      <li className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3">
        <div className="flex flex-1 flex-col">
          <span className="font-medium text-muted-foreground">{type.name}</span>
          <span className="text-xs text-muted-foreground">
            Si crea con <Skill skill={type.skill} />
          </span>
        </div>
        <span className="text-xs text-muted-foreground">Non ancora creato</span>
      </li>
    );
  }
  return docs.map((d) => (
    <li key={d.path} className="rounded-lg border border-border bg-card">
      <DocRow doc={d} name={type.name} />
    </li>
  ));
}

function DocRow({ doc, name }: { doc: MapDoc; name: string }) {
  return (
    <Link href={doc.href} title={doc.path} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{name}</span>
        {doc.title !== name && <span className="truncate text-xs text-muted-foreground">{doc.title}</span>}
      </div>
      {doc.version && <span className="text-xs text-muted-foreground">{doc.version}</span>}
      <DocumentStateBadge state={doc.state} />
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function SearchResults({ types, otherFiles, q }: { types: MapType[]; otherFiles: MapDoc[]; q: string }) {
  const hits = [
    ...types.flatMap((t) =>
      t.docs
        .filter((d) => `${t.name} ${t.code} ${d.title} ${d.path}`.toLowerCase().includes(q))
        .map((d) => ({ doc: d, name: t.name, phase: t.phase as number | null })),
    ),
    ...otherFiles
      .filter((d) => `${d.title} ${d.path}`.toLowerCase().includes(q))
      .map((d) => ({ doc: d, name: d.title, phase: null })),
  ];
  if (hits.length === 0) return <p className="text-sm text-muted-foreground">Nessun documento trovato.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {hits.map((h) => (
        <li key={h.doc.path} className="rounded-lg border border-border bg-card">
          <div className="px-4 pt-2 text-xs text-muted-foreground">
            {h.phase === null ? "Altri file" : `Fase ${h.phase} · ${PHASES[h.phase].name}`}
          </div>
          <DocRow doc={h.doc} name={h.name} />
        </li>
      ))}
    </ul>
  );
}

function Skill({ skill }: { skill: string }) {
  return <code className="font-mono text-xs text-foreground">/{skill}</code>;
}
