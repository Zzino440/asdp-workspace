import { notFound } from "next/navigation";
import type { NextRequest } from "next/server";
import { EXPORT_FORMATS, type ExportFormat, exportDocument } from "@/lib/documents/export";
import { createClient } from "@/lib/supabase/server";

// Il PDF avvia Chromium: qualche secondo in più del default.
export const maxDuration = 60;

// Scarica un documento ASDP nel formato scelto, con i permessi dell'utente (RLS).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const project = params.get("project");
  const path = params.get("path");
  const format = params.get("format") as ExportFormat;
  if (!project || !path || !EXPORT_FORMATS.includes(format)) notFound();

  const file = await exportDocument(await createClient(), project, path, format);
  if (!file) notFound();
  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
