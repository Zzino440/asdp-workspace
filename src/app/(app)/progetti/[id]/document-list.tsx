import Link from "next/link";
import { DocumentStateBadge } from "@/components/document-state-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listDocuments } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";
import { ReindexButton } from "./reindex-button";

// Documenti del progetto visibili all'utente, raggruppati per fase del tipo documento.
export async function DocumentList({ projectId, canReindex }: { projectId: string; canReindex: boolean }) {
  const supabase = await createClient();
  const [documents, { data: types }] = await Promise.all([
    listDocuments(supabase, projectId),
    supabase.from("document_types").select("code, name, phase"),
  ]);
  const typeByCode = new Map((types ?? []).map((t) => [t.code, t]));
  const phaseOf = (code: string | null) => (code ? (typeByCode.get(code)?.phase ?? null) : null);
  const groups = [0, 1, 2, 3, 4, null]
    .map((phase) => ({ phase, items: documents.filter((d) => phaseOf(d.document_type) === phase) }))
    .filter((g) => g.items.length > 0);
  const dateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "short" });

  return (
    <div className="flex flex-col gap-4">
      {canReindex && <ReindexButton projectId={projectId} />}
      {documents.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessun documento indicizzato.</p>
      )}
      {groups.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Versione</TableHead>
              <TableHead>Indicizzato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => [
              <TableRow key={`phase-${group.phase}`}>
                <TableCell colSpan={5} className="text-xs font-medium text-muted-foreground">
                  {group.phase === null ? "Altri file" : `Fase ${group.phase}`}
                </TableCell>
              </TableRow>,
              ...group.items.map((d) => {
                const front = d.front_matter as Record<string, unknown>;
                const type = d.document_type ? typeByCode.get(d.document_type) : null;
                return (
                  <TableRow key={d.path}>
                    <TableCell>
                      <Link
                        href={`/progetti/${projectId}/documenti/${d.path.split("/").map(encodeURIComponent).join("/")}`}
                        className="font-medium hover:underline"
                      >
                        {String(front.titolo || d.path.split("/").pop())}
                      </Link>
                      <div className="font-mono text-xs text-muted-foreground">{d.path}</div>
                    </TableCell>
                    <TableCell>{type ? `${type.code} ${type.name}` : "—"}</TableCell>
                    <TableCell>
                      <DocumentStateBadge state={front.stato ? String(front.stato) : null} />
                    </TableCell>
                    <TableCell>{front.versione ? String(front.versione) : "—"}</TableCell>
                    <TableCell>{dateFormat.format(new Date(d.indexed_at))}</TableCell>
                  </TableRow>
                );
              }),
            ])}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
