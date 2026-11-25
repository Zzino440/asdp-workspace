import { Suspense } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listToApprove } from "@/lib/documents";
import { gateFor } from "@/lib/gates";
import { createClient } from "@/lib/supabase/server";

export default function ApprovazioniPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Approvazioni</h1>
        <p className="text-sm text-muted-foreground">
          Documenti segnati come completi che puoi approvare. Aprili per approvarli o richiedere modifiche.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
        <Queue />
      </Suspense>
    </div>
  );
}

// "2026-12-12" → "12/12/2026"; altri formati restano come sono.
const formatDate = (value: unknown) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value ?? "") || "—";
};

async function Queue() {
  const supabase = await createClient();
  const [documents, { data: types }] = await Promise.all([
    listToApprove(supabase),
    supabase.from("document_types").select("code, name"),
  ]);
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun documento da approvare.</p>;
  }
  const typeName = (code: string | null) => types?.find((t) => t.code === code)?.name ?? code ?? "—";

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Documento</TableHead>
          <TableHead>Progetto</TableHead>
          <TableHead>Gate</TableHead>
          <TableHead>Autore</TableHead>
          <TableHead>Completato il</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((d) => {
          const front = d.front_matter as Record<string, unknown>;
          const project = d.projects as unknown as { name: string; code: string } | null;
          const href = `/progetti/${d.project_id}/documenti/${d.path.split("/").map(encodeURIComponent).join("/")}`;
          return (
            <TableRow key={`${d.project_id}/${d.path}`}>
              <TableCell className="font-medium">
                <Link href={href} className="hover:underline">
                  {String(front.titolo || typeName(d.document_type))}
                </Link>
                <div className="text-xs font-normal text-muted-foreground">{d.path.split("/").pop()}</div>
              </TableCell>
              <TableCell>
                {project?.name} <span className="text-muted-foreground">· {project?.code}</span>
              </TableCell>
              <TableCell>{gateFor(d.document_type).name ?? "—"}</TableCell>
              <TableCell>{String(front.autore || "—")}</TableCell>
              <TableCell>{formatDate(front.completato_il)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
