import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { downloadUrl, graphClient, microsoftEnabled } from "@/lib/microsoft";
import { createClient } from "@/lib/supabase/server";

// Scarica un file con l'account Microsoft dell'utente: rimanda all'URL firmato e temporaneo di Graph.
export async function GET(request: NextRequest) {
  if (!microsoftEnabled()) notFound();
  const drive = request.nextUrl.searchParams.get("drive");
  const item = request.nextUrl.searchParams.get("item");
  const graph = await graphClient(await createClient());
  if (!graph || !drive || !item) notFound();
  redirect(await downloadUrl(graph, drive, item));
}
