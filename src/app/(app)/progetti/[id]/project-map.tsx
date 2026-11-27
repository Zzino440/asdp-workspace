"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "cn";
import { DocumentStateBadge } from "@/components/document-state-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PHASES } from "@/lib/labels";
import { guidaHref, guidaHrefForType } from "@/lib/guida";
import { isDone, phaseProgress } from "@/lib/phase-progress";
import { answersPrompt, stepPrompt } from "@/lib/prompts";
import { QUESTION_STATUS_LABEL, statusOf, type QuestionStatus } from "@/lib/questions";
import type { MapDoc, MapType, NextStep } from "@/lib/project-steps";
import { missingRequires, type MissingType } from "@/lib/step-requires";
import { PhaseChangeButton } from "./advance-phase";
import { CopyPromptButton } from "./copy-prompt-button";

type ProjectInfo = { code: string; nature: string; teams: boolean };
// A chi tocca il prossimo passo: se all'utente, le persone del team con quei ruoli, i ruoli.
export type StepTurn = { mine: boolean; people: string[]; roles: string[] };

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
  projectId,
  isAdmin,
  project,
  currentPhase,
  types,
  features,
  otherFiles,
  next,
  parallel,
  turn,
  behind,
}: {
  projectId: string;
  isAdmin: boolean;
  project: ProjectInfo;
  currentPhase: number;
  types: MapType[];
  features: string[];
  otherFiles: MapDoc[];
  next: NextStep | null;
  parallel: NextStep[];
  turn: StepTurn | null;
  behind: number;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const search = useRef<HTMLInputElement>(null);

  const progress = (phase: number) => phaseProgress(types, features, phase);
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

  // Apre una fase e la porta in vista.
  const showPhase = (n: number) => {
    setOpen((current) => new Set(current).add(n));
    requestAnimationFrame(() => document.getElementById(`fase-${n}`)?.scrollIntoView({ behavior: "smooth" }));
  };
  // Prima fase precedente con documenti non pronti.
  const behindPhase = PHASES.find((p) => p.n < currentPhase && !complete(p.n));

  return (
    <div className="flex flex-col gap-5">
      {next && <NextStepCard project={project} next={next} turn={turn} />}
      {parallel.length > 0 && <ParallelSteps project={project} types={types} steps={parallel} />}
      {behind > 0 && (
        <p className="flex flex-wrap gap-x-1.5 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => behindPhase && showPhase(behindPhase.n)}
            className="text-left hover:text-foreground hover:underline"
          >
            {behind === 1
              ? "1 documento delle fasi precedenti è ancora da fare: resta nel percorso, mostralo"
              : `${behind} documenti delle fasi precedenti sono ancora da fare: restano nel percorso, mostrali`}
          </button>
          {/* Solo admin: riportare il progetto alla fase rimasta indietro (es. approvazione revocata). */}
          {isAdmin && behindPhase && (
            <>
              <span aria-hidden>·</span>
              <PhaseChangeButton projectId={projectId} from={currentPhase} to={behindPhase.n} look="link" />
            </>
          )}
        </p>
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
                  {isOpen && (
                    <PhaseDocs
                      project={project}
                      allTypes={types}
                      types={phaseTypes}
                      features={features}
                      showPhase={showPhase}
                    />
                  )}
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

function NextStepCard({ project, next, turn }: { project: ProjectInfo; next: NextStep; turn: StepTurn | null }) {
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
        <span className="flex flex-wrap items-center gap-2 text-xs font-medium text-primary">
          Prossimo passo · {where}
          {turn?.mine && <Badge>Tocca a te</Badge>}
        </span>
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
        {turn && !turn.mine && (
          <span className="text-sm text-muted-foreground">
            {turn.people.length > 0
              ? `Tocca a ${turn.people.join(", ")}.`
              : turn.roles.length > 0
                ? `Tocca a ${turn.roles.join(" o ")}: nessuno nel team ha questo ruolo.`
                : "Nessun ruolo può modificare questo tipo di documento (Amministrazione → Permessi)."}
          </span>
        )}
        {next.missing.length > 0 && (
          <span className="text-sm text-muted-foreground">
            Serve prima: <span className="text-foreground">{next.missing.map((m) => m.name).join(", ")}</span>.
          </span>
        )}
        {next.doc?.changesRequested && (
          <span className="text-sm">
            <span className="text-destructive">Modifiche richieste da {next.doc.changesRequested.by}:</span>{" "}
            {next.doc.changesRequested.reason}
          </span>
        )}
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

// Passi di fasi successive che si possono anticipare: i loro prerequisiti sono pronti. Non cambiano
// la fase del progetto; il prossimo passo resta quello consigliato.
function ParallelSteps({ project, types, steps }: { project: ProjectInfo; types: MapType[]; steps: NextStep[] }) {
  const nameOf = (code: string) => types.find((t) => t.code === code)?.name ?? code;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border px-5 py-4">
      <span className="text-xs font-medium text-muted-foreground">Puoi anticipare</span>
      <ul className="flex flex-col gap-2">
        {steps.map((s) => {
          const requires = types.find((t) => t.code === s.code)?.requires ?? [];
          return (
            <li key={`${s.code}-${s.feature ?? ""}`} className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">
                  {s.doc ? `Completa ${s.name}` : `Crea ${s.name}`}
                  {s.feature ? ` · Feature ${s.feature}` : ""}
                </span>
                <span className="text-sm text-muted-foreground">
                  Fase {s.phase} · {PHASES[s.phase].name}.{" "}
                  {requires.length > 0 &&
                    `${requires.length === 1 ? "Serve solo un documento già pronto" : "Servono solo documenti già pronti"}: ${requires.map(nameOf).join(" e ")}. `}
                  La fase del progetto non cambia.{" "}
                  <Link href={guidaHref("percorso")} className="text-primary hover:underline">
                    Perché
                  </Link>
                </span>
              </div>
              {s.doc ? (
                <Link href={s.doc.href} className={buttonVariants({ variant: "ghost" })}>
                  Apri documento
                </Link>
              ) : (
                <CopyPromptButton
                  variant="ghost"
                  label="Copia prompt"
                  prompt={stepPrompt(project, {
                    code: s.code,
                    name: s.name,
                    skill: s.skill,
                    feature: s.feature,
                    docPath: null,
                  })}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PhaseDocs({
  project,
  allTypes,
  types,
  features,
  showPhase,
}: {
  project: ProjectInfo;
  allTypes: MapType[];
  types: MapType[];
  features: string[];
  showPhase: (n: number) => void;
}) {
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
            <TypeItems
              key={t.code}
              project={project}
              allTypes={allTypes}
              type={t}
              docs={t.docs}
              feature={null}
              showPhase={showPhase}
            />
          ))}
        </ul>
      )}
      {perFeature.length > 0 && features.length === 0 && (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          Per ogni Feature del backlog si preparano: {perFeature.map((t) => t.name).join(", ")}. Nessuna Feature è ancora
          avviata: si parte con <Skill skill={perFeature[0].skill} />. <GuideLink code={perFeature[0].code} />
          <MissingNote missing={missingRequires(allTypes, perFeature[0].requires, null)} showPhase={showPhase} />
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
                  allTypes={allTypes}
                  type={t}
                  docs={t.docs.filter((d) => (d.feature ?? "") === f)}
                  feature={f || null}
                  showPhase={showPhase}
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
  allTypes,
  type,
  docs,
  feature,
  showPhase,
}: {
  project: ProjectInfo;
  allTypes: MapType[];
  type: MapType;
  docs: MapDoc[];
  feature: string | null;
  showPhase: (n: number) => void;
}) {
  if (docs.length === 0) {
    const missing = missingRequires(allTypes, type.requires, feature);
    return (
      <li className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-muted-foreground">{type.name}</span>
          <span className="text-xs text-muted-foreground">
            Da creare con <Skill skill={type.skill} /> · <GuideLink code={type.code} />
            <MissingNote missing={missing} showPhase={showPhase} />
          </span>
        </div>
        {/* Con prerequisiti mancanti la skill si fermerebbe: niente prompt finché non sono pronti. */}
        {missing.length === 0 && (
          <CopyPromptButton
            variant="ghost"
            label="Copia prompt"
            prompt={stepPrompt(project, { code: type.code, name: type.name, skill: type.skill, feature, docPath: null })}
          />
        )}
      </li>
    );
  }
  return docs.map((d) => (
    <li key={d.path}>
      <DocRow doc={d} name={type.name} />
      <DocQuestions project={project} type={type} doc={d} />
    </li>
  ));
}

function DocRow({ doc, name }: { doc: MapDoc; name: string }) {
  const overdue = doc.deadline !== null && doc.deadline < today() && !isDone(doc);
  const count = (status: QuestionStatus) => doc.questions.filter((q) => statusOf(q) === status).length;
  const open = count("aperta");
  const answered = count("da_applicare");
  const deferred = count("rimandata");
  const wrong = count("da_correggere");
  return (
    <Link href={doc.href} title={doc.path} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{name}</span>
        {doc.title !== name && <span className="truncate text-xs text-muted-foreground">{doc.title}</span>}
        {(doc.owner || doc.deadline || doc.questions.length > 0) && (
          <span className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
            {doc.owner && <span>{doc.owner}</span>}
            {doc.deadline && (
              <span className={cn(overdue && "text-destructive")}>
                {overdue ? "Scaduto il" : "Scadenza"} {formatDate(doc.deadline)}
              </span>
            )}
            {inherited(doc) ? (
              <span>
                {doc.questions.length === 1 ? "1 punto aperto" : `${doc.questions.length} punti aperti`} dal consolidato
              </span>
            ) : (
              <>
                {open > 0 && <span>{open === 1 ? "1 domanda aperta" : `${open} domande aperte`}</span>}
                {answered > 0 && <span className="text-primary">{answered} con risposta da applicare</span>}
                {wrong > 0 && <span className="text-destructive">{wrong} da correggere</span>}
                {deferred > 0 && <span>{deferred === 1 ? "1 rimandata" : `${deferred} rimandate`} all&apos;analisi</span>}
              </>
            )}
          </span>
        )}
      </div>
      {doc.changesRequested && (
        <span className="shrink-0 text-xs text-destructive" title={doc.changesRequested.reason}>
          Modifiche richieste
        </span>
      )}
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

// La T1.4 copia invariate le D[N] dei Requisiti Consolidati nei punti aperti: si rispondono lì.
const inherited = (doc: MapDoc) => doc.typeCode === "T1.4";

// Domande D[N] del documento, sotto la sua riga: aperte o con risposta da applicare rilanciando la skill.
function DocQuestions({ project, type, doc }: { project: ProjectInfo; type: MapType; doc: MapDoc }) {
  if (doc.questions.length === 0) return null;
  const answered = doc.questions.filter((q) => q.answered).length;
  return (
    <details className="px-4 pb-2.5 text-sm">
      <summary className="w-fit cursor-pointer text-xs text-primary">
        {inherited(doc) ? "Vedi i punti aperti" : "Vedi le domande"}
      </summary>
      <div className="mt-2 flex flex-col gap-2 rounded-md border border-border p-3">
        <ul className="flex flex-col gap-1">
          {doc.questions.map((q) => (
            <li key={q.id} className="flex gap-2">
              <span className="w-8 shrink-0 font-mono text-xs leading-5 text-muted-foreground">{q.id}</span>
              <span className="min-w-0 flex-1">{q.title}</span>
              {!inherited(doc) && (
                <span
                  className={cn(
                    "shrink-0 text-xs",
                    statusOf(q) === "da_applicare"
                      ? "text-primary"
                      : statusOf(q) === "da_correggere"
                        ? "text-destructive"
                        : "text-muted-foreground",
                  )}
                >
                  {QUESTION_STATUS_LABEL[statusOf(q)]}
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {inherited(doc) ? (
            <span>Si rispondono nei Requisiti Consolidati, poi si aggiorna questo documento.</span>
          ) : (
            answered > 0 && (
              <CopyPromptButton
                variant="ghost"
                label={answered === 1 ? "Applica la risposta" : `Applica ${answered} risposte`}
                prompt={answersPrompt(project, { name: type.name, skill: type.skill, docPath: doc.path })}
              />
            )
          )}
          <Link href={guidaHref("domande-aperte")} className="text-primary hover:underline">
            Come si risponde
          </Link>
        </div>
      </div>
    </details>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// "Serve prima: Architettura": i documenti richiesti non ancora pronti, ognuno porta alla sua fase.
function MissingNote({ missing, showPhase }: { missing: MissingType[]; showPhase: (n: number) => void }) {
  if (missing.length === 0) return null;
  return (
    <span className="block text-xs text-muted-foreground">
      Serve prima:{" "}
      {missing.map((m, i) => (
        <span key={m.code}>
          {i > 0 && ", "}
          <button type="button" onClick={() => showPhase(m.phase)} className="text-primary hover:underline">
            {m.name}
          </button>
        </span>
      ))}
    </span>
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
