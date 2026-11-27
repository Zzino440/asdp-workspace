"use client";

import { useState } from "react";
import Link from "next/link";
import { FilePen, FilePlus, FolderInput, PencilLine, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FileActivity } from "@/lib/microsoft";
import { timeAgo } from "@/lib/time";

const KINDS = {
  tutte: { label: "Tutte", actions: [] },
  aggiunti: { label: "Aggiunti", actions: ["create", "restore"] },
  modificati: { label: "Modificati", actions: ["edit"] },
  spostati: { label: "Spostati o rinominati", actions: ["move", "rename"] },
  eliminati: { label: "Eliminati", actions: ["delete"] },
} as const satisfies Record<string, { label: string; actions: FileActivity["action"][] }>;
type Kind = keyof typeof KINDS;

const PERIODS = { "1": "Oggi", "7": "7 giorni", "30": "30 giorni" } as const;
type Period = keyof typeof PERIODS;

const VERB: Record<FileActivity["action"], { text: string; Icon: typeof FilePlus }> = {
  create: { text: "Aggiunto", Icon: FilePlus },
  restore: { text: "Ripristinato", Icon: FilePlus },
  edit: { text: "Modificato", Icon: FilePen },
  move: { text: "Spostato", Icon: FolderInput },
  rename: { text: "Rinominato", Icon: PencilLine },
  delete: { text: "Eliminato", Icon: Trash2 },
};

// Fuso fisso: server e browser raggruppano allo stesso modo.
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
const dayLabel = (key: string, now: number) => {
  const today = dayKey(new Date(now).toISOString());
  const yesterday = dayKey(new Date(now - 86_400_000).toISOString());
  if (key === today) return "Oggi";
  if (key === yesterday) return "Ieri";
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
};

const toggleItem =
  "h-7 px-2 text-xs data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground";

// Vista "Attività" di una cartella collegata: chi ha aggiunto, modificato, spostato o eliminato
// cosa, anche da Teams. I filtri lavorano sull'elenco già caricato (ultimi 30 giorni).
export function FileActivityList({
  activities,
  base,
  locationId,
}: {
  activities: FileActivity[];
  base: string;
  locationId: string;
}) {
  // Momento di riferimento fisso per filtri e "Oggi"/"Ieri" (ricalcolato a ogni caricamento).
  const [now] = useState(() => Date.now());
  // Link a una cartella nella vista File (path relativo alla cartella collegata).
  const folderHref = (path: string) =>
    `${base}?${new URLSearchParams(path ? { file: locationId, cartella: path } : { file: locationId })}`;
  const [text, setText] = useState("");
  const [mine, setMine] = useState(false);
  const [kind, setKind] = useState<Kind>("tutte");
  const [period, setPeriod] = useState<Period>("7");

  const since = period === "1" ? dayKey(new Date(now).toISOString()) : null;
  const from = now - Number(period) * 86_400_000;
  const needle = text.trim().toLocaleLowerCase("it");
  const actions: readonly string[] = KINDS[kind].actions;
  const visible = activities.filter(
    (a) =>
      (since ? dayKey(a.at) === since : Date.parse(a.at) >= from) &&
      (!mine || a.mine) &&
      (kind === "tutte" || actions.includes(a.action)) &&
      (!needle || `${a.name} ${a.oldName ?? ""} ${a.folder} ${a.actor}`.toLocaleLowerCase("it").includes(needle)),
  );
  const days = new Map<string, FileActivity[]>();
  for (const a of visible) days.set(dayKey(a.at), [...(days.get(dayKey(a.at)) ?? []), a]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cerca file, cartella o persona"
            aria-label="Cerca nell'attività"
            className="h-8 w-64 pl-8"
          />
        </div>
        <Filter label="Persone" value={mine ? "io" : "tutti"} onChange={(v) => setMine(v === "io")}>
          {{ tutti: "Tutti", io: "Solo io" }}
        </Filter>
        <Filter label="Azione" value={kind} onChange={(v) => setKind(v as Kind)}>
          {Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, v.label]))}
        </Filter>
        <Filter label="Periodo" value={period} onChange={(v) => setPeriod(v as Period)}>
          {PERIODS}
        </Filter>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna attività con questi filtri.</p>
      ) : (
        <div className="flex max-h-[max(16rem,calc(100dvh-var(--project-header-h)-16rem))] flex-col gap-4 overflow-y-auto">
          {[...days].map(([day, items]) => (
            <section key={day} className="flex flex-col gap-1">
              <h3 className="sticky top-0 bg-background py-1 text-xs text-muted-foreground first-letter:uppercase">
                {dayLabel(day, now)}
              </h3>
              <ul className="flex flex-col">
                {items.map((a) => (
                  <Row key={a.id} activity={a} folderHref={folderHref} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ activity: a, folderHref }: { activity: FileActivity; folderHref: (path: string) => string }) {
  const { text, Icon } = VERB[a.action];
  return (
    <li className="flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">
          {a.webUrl && !a.isFolder ? (
            <a href={a.webUrl} target="_blank" rel="noreferrer" className="hover:underline" title={a.name}>
              {a.name}
            </a>
          ) : a.webUrl ? (
            <Link href={folderHref(a.folder ? `${a.folder}/${a.name}` : a.name)} className="hover:underline">
              {a.name}
            </Link>
          ) : (
            <span title={a.name}>{a.name}</span>
          )}
          {a.oldName && <span className="text-muted-foreground"> (era «{a.oldName}»)</span>}
          {a.from !== undefined && (
            <span className="text-muted-foreground"> (da {a.from || "cartella principale"})</span>
          )}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {text} da {a.mine ? "te" : a.actor} · {timeAgo(a.at)} · in{" "}
          <Link href={folderHref(a.folder)} className="hover:underline">
            {a.folder || "cartella principale"}
          </Link>
        </span>
      </div>
    </li>
  );
}

function Filter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: Record<string, string>;
}) {
  return (
    <ToggleGroup
      size="sm"
      variant="outline"
      spacing={1}
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0] as string)}
      aria-label={label}
      className="flex-wrap"
    >
      {Object.entries(children).map(([k, text]) => (
        <ToggleGroupItem key={k} value={k} className={toggleItem}>
          {text}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
