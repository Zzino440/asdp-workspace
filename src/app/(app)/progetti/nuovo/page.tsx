import { gitlabCreationEnabled } from "@/lib/workspace";
import { ProjectForm } from "./project-form";

export default function NuovoProgettoPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Nuovo progetto</h1>
        <p className="text-sm text-muted-foreground">
          L&apos;app crea il progetto e prepara le repo su GitLab; Teams e team si completano poi dalla pagina del
          progetto.
        </p>
      </div>
      <ProjectForm parentGroup={gitlabCreationEnabled() ? process.env.GITLAB_PROJECTS_GROUP! : null} />
    </div>
  );
}
