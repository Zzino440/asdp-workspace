import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { indexProject, recordEvent } from "@/lib/documents";
import { createAdminClient } from "@/lib/supabase/admin";

type PushCommit = {
  id: string;
  message: string;
  author?: { name?: string };
  added?: string[];
  modified?: string[];
};
type PushEvent = {
  object_kind?: string;
  ref?: string;
  project?: { id?: number; path_with_namespace?: string };
  commits?: PushCommit[];
};

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

  // I commit dell'app e dell'MCP (trailer "Via:") li registra già il service layer.
  const direct = (event.commits ?? []).filter((c) => !/^Via: (app|mcp)$/m.test(c.message));

  for (const project of projects ?? []) {
    await indexProject(supabase, project.id);
    if (direct.length === 0) continue;
    const { data: documents } = await supabase.from("documents").select("path, document_type").eq("project_id", project.id);
    const types = new Map((documents ?? []).map((d) => [d.path, d.document_type as string | null]));
    for (const commit of direct) {
      for (const path of new Set([...(commit.added ?? []), ...(commit.modified ?? [])])) {
        if (!types.has(path)) continue;
        await recordEvent(supabase, {
          project_id: project.id,
          path,
          document_type: types.get(path) ?? null,
          commit_id: commit.id,
          author_name: commit.author?.name || "GitLab",
          via: "git",
          message: commit.message,
        });
      }
    }
  }
  return Response.json({ indexed: projects?.length ?? 0 });
}
