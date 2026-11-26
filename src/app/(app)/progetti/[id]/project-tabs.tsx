"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "cn";

const TABS = [
  { segment: null, label: "Percorso", path: "" },
  { segment: "file", label: "File", path: "/file" },
  { segment: "impostazioni", label: "Impostazioni", path: "/impostazioni" },
] as const;

// Schede del progetto; la scheda attiva è il segmento sotto il layout (null = Percorso).
export function ProjectTabs({ projectId, files, settings }: { projectId: string; files: boolean; settings: boolean }) {
  const segment = useSelectedLayoutSegment();
  const tabs = TABS.filter((t) => (t.segment === "file" ? files : t.segment === "impostazioni" ? settings : true));

  return (
    <nav aria-label="Sezioni del progetto" className="flex gap-6 border-b">
      {tabs.map((t) => {
        const active = segment === t.segment;
        return (
          <Link
            key={t.label}
            href={`/progetti/${projectId}${t.path}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 pb-2 text-sm transition-colors",
              active
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
