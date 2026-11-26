import { Suspense } from "react";
import { graphClient, listTeams, microsoftEnabled } from "@/lib/microsoft";
import { createClient } from "@/lib/supabase/server";
import { gitlabCreationEnabled } from "@/lib/workspace";
import { ProjectForm } from "./project-form";

export default function NuovoProgettoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Nuovo progetto</h1>
        <p className="text-sm text-muted-foreground">
          In quattro passi crei il progetto, le repo, il team e il canale Teams. Quello che salti lo completi dopo dalla
          pagina del progetto.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
        <Form />
      </Suspense>
    </div>
  );
}

// Persone attive (per PM e TL) e, se Microsoft è configurato, i Team dell'utente (null = account
// non collegato).
async function Form() {
  const supabase = await createClient();
  const [{ data: people }, graph] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").neq("status", "sospeso").order("full_name"),
    microsoftEnabled() ? graphClient(supabase) : null,
  ]);
  const teams = graph ? await listTeams(graph).catch(() => null) : null;

  return (
    <ProjectForm
      parentGroup={gitlabCreationEnabled() ? process.env.GITLAB_PROJECTS_GROUP! : null}
      people={(people ?? []).map((p) => ({ id: p.id as string, name: (p.full_name || p.email) as string, email: p.email as string }))}
      microsoft={microsoftEnabled() ? { teams } : null}
    />
  );
}
