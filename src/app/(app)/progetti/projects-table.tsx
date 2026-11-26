"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROJECT_STATUS_LABELS, ROLE_LABELS, type AsdpRole } from "@/lib/labels";

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  client: string;
  nature: string;
  status: string;
  framework: string;
  phase: number;
  phaseName: string;
  ready: number;
  expected: number;
  inApproval: number;
  overdue: number;
  missingRoles: string[];
  setup: string[];
  pm: string;
  tl: string;
  team: string[]; // "Nome (ruoli)", per il tooltip
  myRoles: AsdpRole[];
  endDate: string | null;
};

const STATUS_FILTERS = [
  { value: "attivi", label: "Attivi" },
  ...Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  { value: "tutti", label: "Tutti" },
];

// Ordinamenti: il primo clic usa la direzione più utile (attenzione: prima i più critici).
const SORTS = {
  nome: { desc: false, value: (r: ProjectRow) => r.name.toLowerCase() },
  fase: { desc: false, value: (r: ProjectRow) => r.phase * 1000 + (r.expected ? r.ready / r.expected : 0) },
  attenzione: { desc: true, value: (r: ProjectRow) => attention(r) },
  fine: { desc: false, value: (r: ProjectRow) => r.endDate ?? "9999" },
} as const;
type SortKey = keyof typeof SORTS;

// Peso dei segnali: scaduti, poi in approvazione, poi ruoli mancanti e setup.
const attention = (r: ProjectRow) =>
  r.overdue * 10_000 + r.inApproval * 100 + r.missingRoles.length + (r.setup.length > 0 ? 1 : 0);

// "2026-12-12" → "12/12/2026".
const formatDate = (iso: string) => iso.split("-").reverse().join("/");

export function ProjectsTable({ header, rows, today }: { header: React.ReactNode; rows: ProjectRow[]; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const status = params.get("stato") ?? "attivi";
  const onlyMine = params.get("miei") === "1";
  const sortParam = params.get("ordina") ?? "nome";
  const sortKey = (sortParam.replace(/^-/, "") in SORTS ? sortParam.replace(/^-/, "") : "nome") as SortKey;
  const desc = sortParam.startsWith("-");
  const canFilterMine = rows.some((r) => r.myRoles.length === 0);

  // Filtri e ordinamento nell'URL: tornando indietro da un progetto restano come erano.
  const update = (changes: Record<string, string | null>) => {
    // Dall'URL attuale, non da `params`: una replace precedente può non essere ancora arrivata al render.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const toggleSort = (key: SortKey) => {
    const nextDesc = key === sortKey ? !desc : SORTS[key].desc;
    const value = `${nextDesc ? "-" : ""}${key}`;
    update({ ordina: value === "nome" ? null : value });
  };

  const q = query.trim().toLowerCase();
  const visible = rows
    .filter((r) => (status === "tutti" ? true : status === "attivi" ? r.status !== "chiuso" : r.status === status))
    .filter((r) => !onlyMine || r.myRoles.length > 0)
    .filter((r) => !q || [r.name, r.code, r.client].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) => {
      const [x, y] = [SORTS[sortKey].value(a), SORTS[sortKey].value(b)];
      const order = x < y ? -1 : x > y ? 1 : 0;
      return desc ? -order : order;
    });

  const sortHead = (key: SortKey, label: string) => (
    <TableHead aria-sort={sortKey === key ? (desc ? "descending" : "ascending") : undefined}>
      <button type="button" onClick={() => toggleSort(key)} className="flex items-center gap-1 hover:text-foreground">
        {label}
        {sortKey === key && (desc ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />)}
      </button>
    </TableHead>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Titolo e filtri fissi in alto, come l'intestazione del progetto. */}
      <div className="sticky top-0 z-20 -mx-8 -mt-8 flex flex-col gap-6 bg-background px-8 pt-8 pb-2">
        {header}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                update({ q: e.target.value.trim() || null });
              }}
              placeholder="Cerca per nome, codice o cliente"
              aria-label="Cerca progetti"
              className="pl-8"
            />
          </div>
          <Select items={STATUS_FILTERS} value={status} onValueChange={(v) => update({ stato: v === "attivi" ? null : (v as string) })}>
            <SelectTrigger aria-label="Stato">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canFilterMine && (
            <Label className="font-normal">
              <Switch checked={onlyMine} onCheckedChange={(checked) => update({ miei: checked ? "1" : null })} />
              Solo i miei
            </Label>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun progetto corrisponde ai filtri.</p>
      ) : (
        // Altezza massima pari allo spazio sotto titolo e filtri: la tabella scorre al suo interno.
        <div className="[&>[data-slot=table-container]]:max-h-[max(16rem,calc(100dvh-12rem))] [&>[data-slot=table-container]]:overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_var(--border)]">
              <TableRow>
                {sortHead("nome", "Progetto")}
                <TableHead>Stato</TableHead>
                {sortHead("fase", "Fase")}
                {sortHead("attenzione", "Attenzione")}
                <TableHead>Team</TableHead>
                {sortHead("fine", "Fine")}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => {
                const href = `/progetti/${r.id}`;
                const late = r.endDate !== null && r.endDate < today && r.status !== "chiuso";
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest("a")) router.push(href);
                    }}
                  >
                    <TableCell>
                      <div className="font-medium" title={`Framework asdp ${r.framework}`}>
                        <Link href={href} className="hover:underline">
                          {r.name}
                        </Link>{" "}
                        <span className="text-muted-foreground">· {r.code}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.client} · {r.nature}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{PROJECT_STATUS_LABELS[r.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        {r.phase} · {r.phaseName}
                      </div>
                      {r.expected > 0 && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground" title={`${r.ready} documenti pronti su ${r.expected} nella fase`}>
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-primary" style={{ width: `${(r.ready / r.expected) * 100}%` }} />
                          </div>
                          {r.ready}/{r.expected}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.overdue > 0 && <Badge variant="destructive">{r.overdue} {r.overdue === 1 ? "scaduto" : "scaduti"}</Badge>}
                        {r.inApproval > 0 && (
                          <Badge className="bg-(--state-complete) text-(--state-complete-foreground)">{r.inApproval} in approvazione</Badge>
                        )}
                        {r.missingRoles.length > 0 && <Badge variant="outline">Manca {r.missingRoles.join(" e ")}</Badge>}
                        {r.setup.length > 0 && (
                          <Badge variant="outline" title={`Da preparare: ${r.setup.join(", ")}`}>
                            Setup
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.pm || r.tl ? (
                        <div className="text-sm">
                          {r.pm && (
                            <>
                              <span className="text-muted-foreground">PM </span>
                              {r.pm}
                            </>
                          )}
                          {r.pm && r.tl && <span className="text-muted-foreground"> · </span>}
                          {r.tl && (
                            <>
                              <span className="text-muted-foreground">TL </span>
                              {r.tl}
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm">—</div>
                      )}
                      {r.team.length > 0 && (
                        <div className="text-xs text-muted-foreground" title={r.team.join("\n")}>
                          {r.team.length} {r.team.length === 1 ? "persona" : "persone"}
                          {r.myRoles.length > 0 && ` · Tu: ${r.myRoles.map((role) => ROLE_LABELS[role]).join(", ")}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className={cn(late && "text-destructive")}>{r.endDate ? formatDate(r.endDate) : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
