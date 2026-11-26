"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "cn";
import { DocumentStateBadge } from "@/components/document-state-badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PHASES } from "@/lib/labels";
import { guidaHref, guidaHrefForType } from "@/lib/guida";
import { stepPrompt } from "@/lib/prompts";
import { CopyPromptButton } from "./copy-prompt-button";

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
type ProjectInfo = { code: string; nature: string; teams: boolean };

const isDone = (d: MapDoc) => d.state === "Completo" || d.state === "Approvato";

// Colore del pallino di un documento: i token --state-* del frontespizio.
const DOT: Record<string, string> = {
  "Da fare": "bg-(--state-todo-border)",
  "In corso": "bg-(--state-progress-border)",
  Completo: "bg-(--state-complete-border)",
  Approvato: "bg-(--state-approved-border)",
};

// Percorso del progetto come timeline: tutte le fasi in un elenco, aperte quelle con lavoro da
// fare e le future, chiuse quelle complete (con i pallini di stato dei documenti).
export function ProjectMap({
  project,
  currentPhase,
  types,
  features,
  otherFiles,
  next,
  behind,
}: {
  project: ProjectInfo;
  currentPhase: number;
  types: MapType[];
  features: string[];
  otherFiles: MapDoc[];
  next: NextStep | null;
  behind: number;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const search = useRef<HTMLInputElement>(null);

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
  const complete = (phase: number) => {
    const p = progress(phase);
    return p.expected > 0 && p.ready === p.expected;
  };

  const [open, setOpen] = useState(() => new Set(PHASES.map((p) => p.n).filter((n) => !complete(n))));
  const toggle = (n: number) =>
    setOpen((current) => {
      const updated = new Set(current);
      if (updated.has(n)) updated.delete(n);
      else updated.add(n);
      return updated;
    });

  // "/" porta sulla ricerca, come in molte app; non mentre si scrive in un campo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || target.closest("input, textarea, [contenteditable=true]")) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Prima fase precedente con documenti non pronti: la apre e la porta in vista.
  const showBehind = () => {
    const phase = PHASES.find((p) => p.n < currentPhase && !complete(p.n));
    if (!phase) return;
    setOpen((current) => new Set(current).add(phase.n));
    requestAnimationFrame(() => document.getElementById(`fase-${phase.n}`)?.scrollIntoView({ behavior: "smooth" }));
  };

  return (
    <div className="flex flex-col gap-5">
      {next && <NextStepCard project={project} next={next} />}
      {behind > 0 && (
        <button
          type="button"
          onClick={showBehind}
          className="w-fit text-left text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          {behind === 1
            ? "1 documento delle fasi precedenti non è ancora pronto: mostralo"
            : `${behind} documenti delle fasi precedenti non sono ancora pronti: mostrali`}
        </button>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          placeholder="Cerca un documento"
          className="pr-8 pl-8"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border px-1.5 font-mono text-xs text-muted-foreground">
          /
        </kbd>
      </div>

      {q ? (
        <SearchResults types={types} otherFiles={otherFiles} q={q} />
      ) : (
        <>
          <ol className="flex flex-col gap-3">
            {PHASES.map((phase) => {
              const p = progress(phase.n);
              const done = complete(phase.n);
              const phaseTypes = types.filter((t) => t.phase === phase.n);
              const isOpen = open.has(phase.n);
              return (
                <li key={phase.n} id={`fase-${phase.n}`} className="scroll-mt-8 rounded-lg border border-border">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggle(phase.n)}
                      aria-expanded={isOpen}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                          done
                            ? "border-(--state-approved-border) bg-(--state-approved) text-(--state-approved-foreground)"
                            : p.started
                              ? "border-(--state-progress-border) bg-(--state-progress) text-(--state-progress-foreground)"
                              : "border-border text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="size-3.5" /> : phase.n}
                      </span>
                      <span className={cn("truncate font-medium", phase.n > currentPhase && "text-muted-foreground")}>
                        Fase {phase.n} · {phase.name}
                      </span>
                      {phase.n === currentPhase && <span className="shrink-0 text-xs text-primary">attuale</span>}
                      <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        {!isOpen && (
                          <span className="flex gap-1" aria-hidden>
                            {phaseTypes
                              .flatMap((t) => t.docs)
                              .map((d) => (
                                <span
                                  key={d.path}
                                  className={cn("size-2 rounded-full", DOT[d.state ?? ""] ?? "bg-muted-foreground")}
                                />
                              ))}
                          </span>
                        )}
                        {p.expected > 0 && `${p.ready}/${p.expected}`}
                        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </span>
                    </button>
                    <Link
                      href={guidaHref(`fase-${phase.n}`)}
                      className="hidden shrink-0 text-xs text-primary hover:underline sm:inline"
                    >
                      Cosa si fa
                    </Link>
                  </div>
                  {isOpen && <PhaseDocs project={project} types={phaseTypes} features={features} />}
                </li>
              );
            })}
          </ol>

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

function NextStepCard({ project, next }: { project: ProjectInfo; next: NextStep }) {
  const where = `Fase ${next.phase} · ${PHASES[next.phase].name}${next.feature ? ` · Feature ${next.feature}` : ""}`;
  const prompt = stepPrompt(project, {
    code: next.code,
    name: next.name,
    skill: next.skill,
    feature: next.feature,
    docPath: next.doc?.path ?? null,
  });
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
              Incolla il prompt in Claude con il plugin asdp: usa la skill <Skill skill={next.skill} />.
            </>
          )}{" "}
          <GuideLink code={next.code} />
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {next.doc && (
          <Link href={next.doc.href} className={buttonVariants()}>
            Apri documento
          </Link>
        )}
        <CopyPromptButton
          prompt={prompt}
          variant={next.doc ? "outline" : "default"}
          label={next.doc ? "Copia prompt" : undefined}
        />
      </div>
    </div>
  );
}

function PhaseDocs({ project, types, features }: { project: ProjectInfo; types: MapType[]; features: string[] }) {
  const single = types.filter((t) => !t.perFeature);
  const perFeature = types.filter((t) => t.perFeature);
  if (types.length === 0) {
    return <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">Nessun documento in questa fase.</p>;
  }
  return (
    <div className="divide-y divide-border border-t border-border">
      {single.length > 0 && (
        <ul className="divide-y divide-border">
          {single.map((t) => (
            <TypeItems key={t.code} project={project} type={t} docs={t.docs} feature={null} />
          ))}
        </ul>
      )}
      {perFeature.length > 0 && features.length === 0 && (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          Per ogni Feature del backlog si preparano: {perFeature.map((t) => t.name).join(", ")}. Nessuna Feature è ancora
          avviata: si parte con <Skill skill={perFeature[0].skill} />. <GuideLink code={perFeature[0].code} />
        </p>
      )}
      {perFeature.length > 0 &&
        features.map((f) => (
          <div key={f}>
            <h4 className="px-4 pt-3 text-xs font-medium text-muted-foreground">{f ? `Feature ${f}` : "Senza Feature"}</h4>
            <ul className="divide-y divide-border">
              {perFeature.map((t) => (
                <TypeItems
                  key={t.code}
                  project={project}
                  type={t}
                  docs={t.docs.filter((d) => (d.feature ?? "") === f)}
                  feature={f || null}
                />
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

function TypeItems({
  project,
  type,
  docs,
  feature,
}: {
  project: ProjectInfo;
  type: MapType;
  docs: MapDoc[];
  feature: string | null;
}) {
  if (docs.length === 0) {
    return (
      <li className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-muted-foreground">{type.name}</span>
          <span className="text-xs text-muted-foreground">
            Da creare con <Skill skill={type.skill} /> · <GuideLink code={type.code} />
          </span>
        </div>
        <CopyPromptButton
          variant="ghost"
          label="Copia prompt"
          prompt={stepPrompt(project, { code: type.code, name: type.name, skill: type.skill, feature, docPath: null })}
        />
      </li>
    );
  }
  return docs.map((d) => (
    <li key={d.path}>
      <DocRow doc={d} name={type.name} />
    </li>
  ));
}

function DocRow({ doc, name }: { doc: MapDoc; name: string }) {
  return (
    <Link href={doc.href} title={doc.path} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent">
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
    <ul className="divide-y divide-border rounded-lg border border-border">
      {hits.map((h) => (
        <li key={h.doc.path}>
          <div className="px-4 pt-2 text-xs text-muted-foreground">
            {h.phase === null ? "Altri file" : `Fase ${h.phase} · ${PHASES[h.phase].name}`}
          </div>
          <DocRow doc={h.doc} name={h.name} />
        </li>
      ))}
    </ul>
  );
}

function GuideLink({ code }: { code: string }) {
  const href = guidaHrefForType(code);
  if (!href) return null;
  return (
    <Link href={href} className="text-primary hover:underline">
      Come si fa
    </Link>
  );
}

function Skill({ skill }: { skill: string }) {
  return <code className="font-mono text-xs text-foreground">/{skill}</code>;
}
