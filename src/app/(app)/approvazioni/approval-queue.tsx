"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type QueueRow = {
  key: string;
  project: string;
  // Più di un documento solo per il G2 (Analisi Tecnica + Piano di lavoro della stessa Feature).
  docs: { title: string; type: string; href: string }[];
  gate: string | null;
  waitingDays: number | null;
  deadline: string;
  overdue: boolean;
  author: string;
  typeOrder: number;
};

const ALL = "tutti";
const SORTS = [
  { value: "attesa", label: "In attesa da più tempo" },
  { value: "scadenza", label: "Scadenza" },
  { value: "tipo", label: "Tipo di documento" },
];
const deadlineKey = (r: QueueRow) => (r.deadline === "—" ? "9999" : r.deadline.split("/").reverse().join("-"));
const COMPARE: Record<string, (a: QueueRow, b: QueueRow) => number> = {
  attesa: (a, b) => (b.waitingDays ?? -1) - (a.waitingDays ?? -1),
  scadenza: (a, b) => deadlineKey(a).localeCompare(deadlineKey(b)),
  tipo: (a, b) => a.typeOrder - b.typeOrder,
};
const waitingText = (days: number | null) =>
  days === null ? "—" : days === 0 ? "da oggi" : days === 1 ? "da 1 giorno" : `da ${days} giorni`;

function Filter(props: { label: string; value: string; items: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <Select items={props.items} value={props.value} onValueChange={(v) => props.onChange(String(v))}>
      <SelectTrigger aria-label={props.label} className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {props.items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Coda di chi approva: filtri e ordinamento in memoria, gruppi per progetto. I progetti con
// documenti scaduti o in attesa da più tempo stanno in alto.
export function ApprovalQueue({ rows }: { rows: QueueRow[] }) {
  const [project, setProject] = useState(ALL);
  const [gate, setGate] = useState(ALL);
  const [sort, setSort] = useState("attesa");

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessun documento da approvare.{" "}
        <Link href="/approvazioni?vista=approvati" className="text-foreground hover:underline">
          Vedi gli approvati
        </Link>
      </p>
    );
  }

  const option = (value: string) => ({ value, label: value });
  const projects = [{ value: ALL, label: "Tutti i progetti" }, ...[...new Set(rows.map((r) => r.project))].sort().map(option)];
  const gateOf = (r: QueueRow) => (r.gate?.startsWith("G2") ? "G2" : (r.gate ?? "Senza gate"));
  const gates = [{ value: ALL, label: "Tutti i gate" }, ...[...new Set(rows.map(gateOf))].sort().map(option)];

  const visible = rows
    .filter((r) => (project === ALL || r.project === project) && (gate === ALL || gateOf(r) === gate))
    .sort(COMPARE[sort]);
  const groups = [...new Set(visible.map((r) => r.project))]
    .map((name) => ({ name, rows: visible.filter((r) => r.project === name) }))
    .sort(
      (a, b) =>
        Number(b.rows.some((r) => r.overdue)) - Number(a.rows.some((r) => r.overdue)) ||
        Math.max(...b.rows.map((r) => r.waitingDays ?? -1)) - Math.max(...a.rows.map((r) => r.waitingDays ?? -1)),
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Filter label="Progetto" value={project} items={projects} onChange={setProject} />
        <Filter label="Gate" value={gate} items={gates} onChange={setGate} />
        <span className="ml-auto text-sm text-muted-foreground">Ordina per</span>
        <Filter label="Ordina per" value={sort} items={SORTS} onChange={setSort} />
      </div>

      {groups.length === 0 && <p className="text-sm text-muted-foreground">Nessun documento con questi filtri.</p>}
      {groups.map((group) => (
        <section key={group.name} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">
            {group.name} <span className="text-muted-foreground">— {group.rows.length}</span>
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Gate</TableHead>
                <TableHead>In attesa</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Autore</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    {row.docs.map((doc) => (
                      <div key={doc.href}>
                        <span className="font-medium">{doc.title}</span>
                        <span className="text-xs text-muted-foreground"> · {doc.type}</span>
                      </div>
                    ))}
                  </TableCell>
                  <TableCell>{row.gate ?? "—"}</TableCell>
                  <TableCell>{waitingText(row.waitingDays)}</TableCell>
                  <TableCell className={cn(row.overdue && "font-medium text-destructive")}>
                    {row.deadline}
                    {row.overdue && " · scaduta"}
                  </TableCell>
                  <TableCell>{row.author}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      {row.docs.map((doc) => (
                        <Link
                          key={doc.href}
                          href={doc.href}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                          aria-label={`Rivedi ${doc.title}`}
                        >
                          Rivedi
                        </Link>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  );
}
