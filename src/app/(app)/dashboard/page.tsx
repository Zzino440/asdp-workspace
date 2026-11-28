import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cn } from "cn";
import { DocumentStateBadge } from "@/components/document-state-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PHASES } from "@/lib/labels";
import { myWork, type WorkDoc } from "@/lib/my-work";
import { createClient } from "@/lib/supabase/server";
import type { StepTurn } from "@/lib/turn";

// Dashboard «Tocca a me»: cosa tocca all'utente nei suoi progetti, cosa aspetta altri, scadenze e
// avanzamento. Le decisioni di gate restano in Approvazioni (qui solo il contatore).
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Cosa tocca a te nei progetti di cui fai parte.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
        <Content />
      </Suspense>
    </div>
  );
}

// "2026-12-12" → "12/12/2026".
const formatDate = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const turnText = (turn: StepTurn) =>
  turn.people.length > 0 ? turn.people.join(", ") : turn.roles.length > 0 ? `${turn.roles.join(" o ")} (nessuno nel team)` : "—";

async function Content() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect("/login");

  const { overview, changesRequested, waiting, deadlines, toApprove } = await myWork(supabase, userId);
  if (overview.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Non fai parte del team di nessun progetto aperto. Chiedi al PM di aggiungerti dalla scheda Impostazioni del
        progetto.
      </p>
    );
  }
  const myNext = overview.filter((o) => o.next && o.turn?.mine);

  return (
    <>
      {toApprove > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary bg-primary/10 p-4">
          <span className="text-sm">
            <span className="font-medium">{toApprove}</span>{" "}
            {toApprove === 1 ? "documento aspetta" : "documenti aspettano"} la tua approvazione.
          </span>
          <Link href="/approvazioni" className={buttonVariants({ size: "sm" })}>
            Vai ad Approvazioni
          </Link>
        </div>
      )}

      <Section title="Tocca a te" count={myNext.length + changesRequested.length}>
        {myNext.length + changesRequested.length === 0 ? (
          <Empty>Nessun passo tocca a te in questo momento.</Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {changesRequested.map((item) => (
              <div key={`${item.project.id}/${item.doc.path}`} className="flex flex-col gap-1 rounded-lg border p-4">
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <ProjectLabel item={item} />
                  <Badge variant="destructive">Modifiche richieste</Badge>
                </span>
                <DocLink item={item} />
                <span className="text-sm">
                  <span className="text-destructive">{item.doc.changesRequested!.by}:</span>{" "}
                  {item.doc.changesRequested!.reason || "nessun motivo indicato."}
                </span>
              </div>
            ))}
            {myNext.map(({ project, next }) => (
              <div key={project.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    {project.name} · {project.code} · Fase {next!.phase} · {PHASES[next!.phase].name}
                    {next!.feature ? ` · Feature ${next!.feature}` : ""}
                  </span>
                  <span className="font-medium">
                    {next!.doc ? `Completa ${next!.name}` : `Crea ${next!.name}`}
                    {next!.perFeature && !next!.feature ? " della prima Feature" : ""}
                  </span>
                  {next!.doc && (
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      Stato attuale <DocumentStateBadge state={next!.doc.state} />
                    </span>
                  )}
                </div>
                <Link
                  href={next!.doc?.href ?? `/progetti/${project.id}`}
                  className={buttonVariants({ variant: next!.doc ? "default" : "outline", size: "sm" })}
                >
                  {next!.doc ? "Apri documento" : "Apri il Percorso"}
                </Link>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="In attesa di altri" count={waiting.length}>
        {waiting.length === 0 ? (
          <Empty>Nessun tuo documento è in attesa di approvazione.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Progetto</TableHead>
                <TableHead>Lo approva</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waiting.map((item) => (
                <TableRow key={`${item.project.id}/${item.doc.path}`}>
                  <TableCell>
                    <DocLink item={item} />
                  </TableCell>
                  <TableCell>
                    <ProjectLabel item={item} />
                  </TableCell>
                  <TableCell>{turnText(item.approvers)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Scadenze" count={deadlines.length}>
        {deadlines.length === 0 ? (
          <Empty>Nessuna scadenza passata o nei prossimi 7 giorni.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Progetto</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Scadenza</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deadlines.map((item) => (
                <TableRow key={`${item.project.id}/${item.doc.path}`}>
                  <TableCell>
                    <DocLink item={item} />
                  </TableCell>
                  <TableCell>
                    <ProjectLabel item={item} />
                  </TableCell>
                  <TableCell>
                    <DocumentStateBadge state={item.doc.state} />
                  </TableCell>
                  <TableCell className={cn(item.overdue && "font-medium text-destructive")}>
                    {formatDate(item.doc.deadline)}
                    {item.overdue ? " · scaduta" : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="I tuoi progetti" count={overview.length}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Progetto</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Pronti nella fase</TableHead>
              <TableHead>Prossimo passo</TableHead>
              <TableHead>Tocca a</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overview.map(({ project, phase, ready, expected, next, turn }) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  <Link href={`/progetti/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>{" "}
                  <span className="text-muted-foreground">· {project.code}</span>
                </TableCell>
                <TableCell>
                  {phase} · {PHASES[phase].name}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {ready}/{expected}
                </TableCell>
                <TableCell>{next ? next.name : "Percorso completo"}</TableCell>
                <TableCell>{turn ? (turn.mine ? <Badge>Tocca a te</Badge> : turnText(turn)) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg font-medium">
        {title}
        {count > 0 && <span className="font-mono text-xs text-muted-foreground">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);

const ProjectLabel = ({ item }: { item: WorkDoc }) => (
  <span>
    {item.project.name} <span className="text-muted-foreground">· {item.project.code}</span>
  </span>
);

const DocLink = ({ item }: { item: WorkDoc }) => (
  <Link href={item.doc.href} className="font-medium hover:underline">
    {item.doc.title} <span className="font-normal text-muted-foreground">· {item.typeName}</span>
  </Link>
);
