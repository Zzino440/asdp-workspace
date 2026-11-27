"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { FileVersion } from "@/lib/microsoft";
import { fileVersions } from "../file-actions";

// Cronologia delle versioni di un file Teams, come su SharePoint: la prima è quella attuale
// (si apre in Office web), le precedenti si scaricano.

const dayFormat = new Intl.DateTimeFormat("it", { day: "numeric", month: "short", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("it", { hour: "2-digit", minute: "2-digit" });

function dayLabel(date: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Oggi";
  if (date.toDateString() === yesterday.toDateString()) return "Ieri";
  return dayFormat.format(date);
}

function formatSize(bytes?: number) {
  if (bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

// Raggruppate per giorno, nell'ordine di Graph (dalla più recente).
function byDay(versions: FileVersion[]) {
  const groups: { day: string; versions: FileVersion[] }[] = [];
  for (const v of versions) {
    const day = dayLabel(new Date(v.lastModifiedDateTime));
    if (groups.at(-1)?.day !== day) groups.push({ day, versions: [] });
    groups.at(-1)!.versions.push(v);
  }
  return groups;
}

export function VersionsSheet({
  projectId,
  locationId,
  item,
  onClose,
}: {
  projectId: string;
  locationId: string;
  item: { id: string; name: string; driveId: string; webUrl: string };
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<FileVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fileVersions(projectId, locationId, item.id).then((result) => {
      if (result.error) setError(result.error);
      else setVersions(result.versions ?? []);
    });
  }, [projectId, locationId, item.id]);

  const current = versions?.[0]?.id;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="truncate pr-8">{item.name}</SheetTitle>
          <SheetDescription>
            {versions
              ? `Cronologia versioni · ${versions.length === 1 ? "1 versione" : `${versions.length} versioni`}`
              : "Cronologia versioni"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!error && !versions && <p className="text-sm text-muted-foreground">Caricamento…</p>}
          {versions?.length === 0 && <p className="text-sm text-muted-foreground">Nessuna cronologia disponibile.</p>}
          {versions &&
            byDay(versions).map(({ day, versions: group }) => (
              <section key={day} className="flex flex-col gap-1">
                <h3 className="text-xs font-medium text-muted-foreground">{day}</h3>
                <ol className="flex flex-col gap-1">
                  {group.map((v) => {
                    const isCurrent = v.id === current;
                    return (
                      <li key={v.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted">
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="flex items-center gap-2 text-sm">
                            Versione {v.id}
                            {isCurrent && <Badge variant="secondary">Attuale</Badge>}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {[
                              v.lastModifiedBy?.user?.displayName,
                              timeFormat.format(new Date(v.lastModifiedDateTime)),
                              formatSize(v.size),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                        {isCurrent ? (
                          <a
                            href={item.webUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                          >
                            <ExternalLink /> Apri
                          </a>
                        ) : (
                          <a
                            href={`/api/microsoft/download?drive=${encodeURIComponent(item.driveId)}&item=${encodeURIComponent(item.id)}&version=${encodeURIComponent(v.id)}`}
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                          >
                            <Download /> Scarica
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
