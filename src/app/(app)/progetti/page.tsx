import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { NATURE_LABELS, PROJECT_STATUS_LABELS as STATUS_LABELS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export default function ProgettiPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Progetti</h1>
        <Suspense>
          <NewProjectButton />
        </Suspense>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
        <ProjectsTable />
      </Suspense>
    </div>
  );
}

// Il bottone è solo una comodità: la creazione è permessa dalla RLS solo all'admin.
async function NewProjectButton() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return null;
  return (
    <Link href="/progetti/nuovo" className={buttonVariants()}>
      <Plus />
      Nuovo progetto
    </Link>
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
                  <Link href={`/progetti/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>{" "}
                  <span className="text-muted-foreground">· {project.code}</span>
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
