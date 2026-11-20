"use client";

import { Fragment, useState, useTransition } from "react";
import { resetPermissions, savePermissions } from "./actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ASDP_ROLES, ROLE_LABELS, type AsdpRole } from "@/lib/labels";

type DocType = { code: string; name: string; phase: number | null };
type Permission = { document_type: string; role: AsdpRole; level: string };

const LEVELS = [
  { value: "none", label: "Nessuno" },
  { value: "view", label: "Vede" },
  { value: "edit", label: "Modifica" },
  { value: "approve", label: "Approva" },
];

const key = (type: string, role: string) => `${type}|${role}`;

export function PermissionMatrix({ types, permissions }: { types: DocType[]; permissions: Permission[] }) {
  const saved = new Map(permissions.map((p) => [key(p.document_type, p.role), p.level]));
  const [levels, setLevels] = useState(() => new Map(saved));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const changes = [...levels]
    .filter(([k, level]) => saved.get(k) !== level)
    .map(([k, level]) => {
      const [document_type, role] = k.split("|");
      return { document_type, role, level };
    });

  const phases = [...new Set(types.map((t) => t.phase))];

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Documento</TableHead>
            {ASDP_ROLES.map((role) => (
              <TableHead key={role}>{ROLE_LABELS[role]}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {phases.map((phase) => (
            <Fragment key={phase ?? "allegati"}>
              <TableRow>
                <TableCell colSpan={ASDP_ROLES.length + 1} className="text-xs font-medium text-muted-foreground">
                  {phase === null ? "Allegati" : `Fase ${phase}`}
                </TableCell>
              </TableRow>
              {types
                .filter((t) => t.phase === phase)
                .map((t) => (
                  <TableRow key={t.code}>
                    <TableCell>
                      <span className="font-mono text-xs">{t.code}</span> {t.name}
                    </TableCell>
                    {ASDP_ROLES.map((role) => (
                      <TableCell key={role}>
                        <Select
                          items={LEVELS}
                          value={levels.get(key(t.code, role)) ?? "none"}
                          onValueChange={(level) =>
                            setLevels((m) => new Map(m).set(key(t.code, role), level as string))
                          }
                        >
                          <SelectTrigger size="sm" aria-label={`${t.code}: ${ROLE_LABELS[role]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LEVELS.map((l) => (
                              <SelectItem key={l.value} value={l.value}>
                                {l.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Nessuno: non vede il documento · Vede: sola lettura · Modifica: può scrivere · Approva: può
        anche approvarlo al gate.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={pending || changes.length === 0}
          onClick={() => startTransition(async () => setError((await savePermissions(changes)).error))}
        >
          {pending ? "Salvataggio…" : `Salva modifiche${changes.length ? ` (${changes.length})` : ""}`}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => startTransition(async () => setError((await resetPermissions()).error))}
        >
          Ripristina default framework
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
