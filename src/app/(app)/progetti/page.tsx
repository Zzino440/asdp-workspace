import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";

const NATURE_LABELS: Record<string, string> = {
  greenfield: "Greenfield",
  evolutiva: "Evolutiva",
};

const STATUS_LABELS: Record<string, string> = {
  aperto: "Aperto",
  in_presidio: "In presidio",
  in_attesa: "In attesa",
  chiuso: "Chiuso",
};

export default function ProgettiPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Progetti</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
        <ProjectsTable />
      </Suspense>
    </div>
  );
}

async function ProjectsTable() {
  const supabase = await createClient();
  // Nessun filtro per utente: la RLS restituisce solo i progetti visibili a chi è loggato.
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, code, name, client, nature, status, current_phase, framework_version")
    .order("name");

  return (
    <>
      {error && <p className="text-sm text-destructive">Impossibile caricare i progetti.</p>}
      {projects && projects.length === 0 && (
        <p className="text-sm text-muted-foreground">Non partecipi ancora a nessun progetto.</p>
      )}
      {projects && projects.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Progetto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Natura</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Framework</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  {project.name} <span className="text-muted-foreground">· {project.code}</span>
                </TableCell>
                <TableCell>{project.client}</TableCell>
                <TableCell>{NATURE_LABELS[project.nature]}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{STATUS_LABELS[project.status]}</Badge>
                </TableCell>
                <TableCell>Fase {project.current_phase}</TableCell>
                <TableCell>asdp {project.framework_version}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
