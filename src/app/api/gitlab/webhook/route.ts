import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { indexProject } from "@/lib/documents";
import { createAdminClient } from "@/lib/supabase/admin";

type PushEvent = { object_kind?: string; ref?: string; project?: { id?: number; path_with_namespace?: string } };

function validToken(received: string | null) {
  const expected = process.env.GITLAB_WEBHOOK_SECRET ?? "";
  if (!received || !expected || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

// Webhook push di GitLab: reindicizza i progetti che usano la repo e il branch del push.
export async function POST(request: NextRequest) {
  if (!validToken(request.headers.get("x-gitlab-token"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const event = (await request.json()) as PushEvent;
  const repo = event.project?.path_with_namespace;
  const repoId = Number(event.project?.id);
  if (event.object_kind !== "push" || !repo || !Number.isInteger(repoId)) return Response.json({ indexed: 0 });

  // Nessun utente: service role, solo dopo aver verificato il segreto del webhook.
  const supabase = createAdminClient();
  const branch = event.ref?.replace("refs/heads/", "");
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    // Per numero; il percorso vale per i progetti non ancora reindicizzati dopo la migrazione.
    .or(`gitlab_project_id.eq.${repoId},and(gitlab_project_id.is.null,gitlab_project_path.eq."${repo.replace(/"/g, "")}")`)
    .eq("gitlab_branch", branch ?? "");

  for (const project of projects ?? []) await indexProject(supabase, project.id);
  return Response.json({ indexed: projects?.length ?? 0 });
}
