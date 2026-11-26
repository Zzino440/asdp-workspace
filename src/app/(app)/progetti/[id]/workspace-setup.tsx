import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { guidaHref } from "@/lib/guida";
import { missingSteps, type SetupState } from "@/lib/workspace";

// Riepiloghi dei passi fatti, calcolati dalla pagina con i dati che ha già.
export type SetupSummary = {
  docsPath: string | null;
  codeCount: number;
  teamsLabels: string[];
  pmTl: string[];
  documents: number;
};

// "Area di lavoro N/M" nella colonna destra del Percorso, per admin e PM: tutti i passi, i fatti
// con spunta e riepilogo, gli aperti con il link al posto dove si fanno. Quando è tutto pronto (o
// dopo la Fase 0 con la repo documenti collegata) resta una riga compatta che si riapre.
export function WorkspaceSetup({
  projectId,
  state,
  summary,
  currentPhase,
}: {
  projectId: string;
  state: SetupState;
  summary: SetupSummary;
  currentPhase: number;
}) {
  const missing = missingSteps(state);
  const base = `/progetti/${projectId}`;

  const steps = [
    {
      key: "docs_repository",
      todo: "Crea o collega la repo documenti",
      done: `Repo documenti · ${summary.docsPath}`,
      href: `${base}/impostazioni#repository`,
    },
    {
      key: "code_repositories",
      todo: "Aggiungi le repo di codice",
      done: `Repo di codice · ${summary.codeCount}`,
      href: `${base}/impostazioni#repository`,
    },
    ...(state.teamsFolder === null
      ? []
      : [
          {
            key: "teams_folder",
            todo: "Crea il canale Teams",
            done: `Canale Teams · ${summary.teamsLabels.join(", ")}`,
            href: `${base}/file/collega`,
          },
        ]),
    {
      key: "team",
      todo: `Assegna ${[!state.team.pm && "PM", !state.team.tl && "TL"].filter(Boolean).join(" e ")}`,
      done: `PM e TL · ${summary.pmTl.join(", ")}`,
      href: `${base}/impostazioni#team`,
    },
    {
      key: "kickoff",
      todo: "Lancia il Kickoff con Claude",
      done: `Percorso avviato · ${summary.documents} documenti`,
      href: guidaHref("t0-1a"),
    },
  ];
  const total = steps.length;
  const done = total - missing.length;
  const compact = missing.length === 0 || (currentPhase > 0 && state.docsRepository);

  const list = (
    <ul className="flex flex-col gap-1">
      {steps.map((s) =>
        missing.includes(s.key) ? (
          <li key={s.key}>
            <Link href={s.href} className="flex items-center gap-2 py-1 text-sm hover:underline">
              <Circle className="size-3.5 shrink-0 text-muted-foreground" aria-label="Da fare" />
              {s.todo}
            </Link>
          </li>
        ) : (
          <li key={s.key} className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
            <CheckCircle2 className="size-3.5 shrink-0 text-(--state-approved-border)" aria-label="Fatto" />
            <span className="truncate" title={s.done}>
              {s.done}
            </span>
          </li>
        ),
      )}
    </ul>
  );

  if (compact) {
    return (
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {missing.length === 0 && <CheckCircle2 className="size-3.5 text-(--state-approved-border)" aria-hidden />}
            {missing.length === 0 ? "Area di lavoro pronta" : "Area di lavoro"}
          </span>
          <span>
            {done}/{total}
          </span>
        </summary>
        <div className="mt-2">{list}</div>
      </details>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs text-muted-foreground">Area di lavoro</h2>
        <span className="text-xs text-muted-foreground">
          {done}/{total}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full bg-primary" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      {list}
    </section>
  );
}
