import { Suspense } from "react";
import Link from "next/link";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listApproved, listToApprove } from "@/lib/documents";
import { featureOf } from "@/lib/features";
import { gateFor } from "@/lib/gates";
import { createClient } from "@/lib/supabase/server";
import { ApprovalQueue, type QueueRow } from "./approval-queue";

// Approvazioni: solo le decisioni di gate (cosa approvare, cosa è stato approvato). La panoramica
// personale (miei documenti in attesa, scadenze, avanzamento) è compito della Dashboard.
export default function ApprovazioniPage({ searchParams }: PageProps<"/approvazioni">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Approvazioni</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Doc = Awaited<ReturnType<typeof listToApprove>>[number];
type Project = { name: string; code: string } | null;

const hrefOf = (d: { project_id: string; path: string }) =>
  `/progetti/${d.project_id}/documenti/${d.path.split("/").map(encodeURIComponent).join("/")}`;
const isoDate = (value: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? String(value) : null);
// "2026-12-12" → "12/12/2026".
const formatDate = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

async function Content({ searchParams }: { searchParams: PageProps<"/approvazioni">["searchParams"] }) {
  const { vista } = await searchParams;
  const approved = vista === "approvati";
  const supabase = await createClient();
  const { data: types } = await supabase.from("document_types").select("code, name, sort_order");
  const typeOf = (code: string | null) => types?.find((t) => t.code === code);
  const titleOf = (d: { document_type: string | null; front_matter: unknown; path: string }) =>
    String(
      (d.front_matter as Record<string, unknown>).titolo || typeOf(d.document_type)?.name || d.path.split("/").pop(),
    );

  const tabs = (
    <nav aria-label="Viste" className="flex gap-1 border-b pb-3">
      {[
        { label: "Da approvare", href: "/approvazioni", active: !approved },
        { label: "Approvati", href: "/approvazioni?vista=approvati", active: approved },
      ].map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(buttonVariants({ variant: tab.active ? "secondary" : "ghost", size: "sm" }))}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );

  if (approved) {
    const documents = await listApproved(supabase);
    return (
      <>
        {tabs}
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun documento approvato negli ultimi 30 giorni.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Progetto</TableHead>
                <TableHead>Gate</TableHead>
                <TableHead>Approvato da</TableHead>
                <TableHead>Il</TableHead>
                <TableHead>Versione</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => {
                const front = d.front_matter as Record<string, unknown>;
                const project = d.projects as unknown as Project;
                return (
                  <TableRow key={`${d.project_id}/${d.path}`}>
                    <TableCell className="font-medium">
                      <Link href={hrefOf(d)} className="hover:underline">
                        {titleOf(d)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {project?.name} <span className="text-muted-foreground">· {project?.code}</span>
                    </TableCell>
                    <TableCell>{String(front.gate || "—")}</TableCell>
                    <TableCell>{String(front.approvato_da || "—")}</TableCell>
                    <TableCell>{formatDate(isoDate(front.approvato_il))}</TableCell>
                    <TableCell>{String(front.versione_approvata || "—")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </>
    );
  }

  const documents = await listToApprove(supabase);
  const today = new Date().toISOString().slice(0, 10);
  const daysSince = (iso: string | null) =>
    iso ? Math.max(0, Math.round((Date.parse(today) - Date.parse(iso)) / 86_400_000)) : null;

  const toRow = (d: Doc): QueueRow => {
    const front = d.front_matter as Record<string, unknown>;
    const project = d.projects as unknown as Project;
    const deadline = isoDate(front.scadenza);
    return {
      key: `${d.project_id}/${d.path}`,
      project: project ? `${project.name} · ${project.code}` : "—",
      docs: [{ title: titleOf(d), type: typeOf(d.document_type)?.name ?? "", href: hrefOf(d) }],
      gate: gateFor(d.document_type).name,
      // Senza completato_il nel frontespizio: data dell'ultimo salvataggio indicizzato.
      waitingDays: daysSince(isoDate(front.completato_il) ?? d.indexed_at.slice(0, 10)),
      deadline: formatDate(deadline),
      overdue: deadline !== null && deadline < today,
      author: String(front.autore || "—"),
      typeOrder: typeOf(d.document_type)?.sort_order ?? 999,
    };
  };

  // G2: Analisi Tecnica e Piano di lavoro della stessa Feature si validano insieme → una riga.
  const g2 = new Map<string, Doc[]>();
  for (const d of documents) {
    const feature = featureOf(d.path);
    if (feature && (d.document_type === "T4.2" || d.document_type === "T4.3-INDEX")) {
      const key = `${d.project_id}|${feature}`;
      g2.set(key, [...(g2.get(key) ?? []), d]);
    }
  }
  const merged = new Set<Doc>();
  const rows: QueueRow[] = [];
  for (const [key, pair] of g2) {
    if (pair.length < 2) continue;
    pair.forEach((d) => merged.add(d));
    const [first, second] = pair.map(toRow);
    const waits = [first.waitingDays, second.waitingDays].filter((n) => n !== null);
    rows.push({
      ...first,
      key,
      docs: [...first.docs, ...second.docs],
      gate: `G2 · Feature ${key.split("|")[1]}`,
      waitingDays: waits.length > 0 ? Math.max(...waits) : null,
      overdue: first.overdue || second.overdue,
    });
  }
  rows.push(...documents.filter((d) => !merged.has(d)).map(toRow));

  return (
    <>
      {tabs}
      <ApprovalQueue rows={rows} />
    </>
  );
}
