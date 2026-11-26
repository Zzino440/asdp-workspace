import { cache } from "react";
import { notFound } from "next/navigation";
import type { AsdpRole } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

// Progetto, team, repo e permessi dell'utente: li leggono il layout a schede e le sue pagine
// (cache: una sola lettura per richiesta). La RLS decide cosa si vede.
export const loadProject = cache(async (id: string) => {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, code, name, client, nature, status, current_phase, framework_version, gitlab_project_path, gitlab_branch, docs_root",
    )
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const [{ data: members }, { data: isAdmin }, { data: isPm }, { data: repositories }] = await Promise.all([
    supabase.from("project_members").select("user_id, roles, profiles(full_name, email)").eq("project_id", id),
    supabase.rpc("is_admin"),
    supabase.rpc("has_project_role", { p_project_id: id, p_roles: ["pm"] }),
    supabase.from("project_repositories").select("id, gitlab_path, role, branch").eq("project_id", id).order("gitlab_path"),
  ]);

  return {
    project,
    isAdmin: Boolean(isAdmin),
    canManage: Boolean(isAdmin || isPm),
    repositories: repositories ?? [],
    members: (members ?? []).map((m) => {
      // Relazione molti-a-uno: PostgREST restituisce un oggetto, i tipi non generati un array.
      const profile = m.profiles as unknown as { full_name: string; email: string } | null;
      return {
        user_id: m.user_id as string,
        roles: m.roles as AsdpRole[],
        name: profile?.full_name || profile?.email || "",
        email: profile?.email ?? "",
      };
    }),
  };
});

// Link a GitLab costruiti sul server: GITLAB_URL non arriva al browser.
export const gitlabHref = (path: string | null) => (path && process.env.GITLAB_URL ? `${process.env.GITLAB_URL}/${path}` : null);
