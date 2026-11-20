"use client";

import { useActionState, useState } from "react";
import { saveTeam, type FormState } from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type Member = { user_id: string; name: string; email: string; roles: AsdpRole[]; isNew?: boolean };
type Person = { id: string; name: string; email: string };

const initialState: FormState = { error: null };

// Matrice persone × ruoli ASDP. I controlli compaiono solo ad admin e PM del progetto, ma è la
// RLS a decidere se il salvataggio passa.
export function TeamEditor({
  projectId,
  canEdit,
  members: initialMembers,
  people,
}: {
  projectId: string;
  canEdit: boolean;
  members: Member[];
  people: Person[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [state, formAction, pending] = useActionState(saveTeam.bind(null, projectId), initialState);

  const holders = (role: AsdpRole) => members.filter((m) => m.roles.includes(role));
  const warnings = [
    holders("pm").length === 0 && "Manca un Project Manager.",
    holders("tl").length === 0 && "Manca un Tech Lead.",
  ].filter(Boolean) as string[];
  const merged = members.some((m) => m.roles.includes("pm") && m.roles.includes("tl"));

  const candidates = people
    .filter((p) => !members.some((m) => m.user_id === p.id))
    .map((p) => ({ value: p.id, label: `${p.name} · ${p.email}` }));

  function toggle(userId: string, role: AsdpRole, checked: boolean) {
    setMembers((list) =>
      list.map((m) =>
        m.user_id !== userId
          ? m
          : { ...m, roles: checked ? [...m.roles, role] : m.roles.filter((r) => r !== role) },
      ),
    );
  }

  function add(userId: string | null) {
    const person = people.find((p) => p.id === userId);
    if (!person) return;
    setMembers((list) => [
      ...list,
      { user_id: person.id, name: person.name, email: person.email, roles: [], isNew: true },
    ]);
  }

  // Le persone appena aggiunte senza ruoli non vanno salvate; quelle esistenti senza ruoli
  // vengono rimosse dal team.
  const payload = members
    .filter((m) => !(m.isNew && m.roles.length === 0))
    .map(({ user_id, roles }) => ({ user_id, roles }));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="team" value={JSON.stringify(payload)} />

      {warnings.map((w) => (
        <Alert key={w} variant="destructive">
          <AlertDescription>{w}</AlertDescription>
        </Alert>
      ))}
      {merged && (
        <Alert>
          <AlertDescription>PM e TL sulla stessa persona: registrato come accorpamento.</AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Persona</TableHead>
            {ASDP_ROLES.map((role) => (
              <TableHead key={role} className="text-center">
                {ROLE_LABELS[role]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 && (
            <TableRow>
              <TableCell colSpan={ASDP_ROLES.length + 1} className="text-muted-foreground">
                Nessuna persona nel team.
              </TableCell>
            </TableRow>
          )}
          {members.map((m) => (
            <TableRow key={m.user_id}>
              <TableCell>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.email}</div>
              </TableCell>
              {ASDP_ROLES.map((role) => (
                <TableCell key={role} className="text-center">
                  <Checkbox
                    aria-label={`${m.name}: ${ROLE_LABELS[role]}`}
                    checked={m.roles.includes(role)}
                    disabled={!canEdit}
                    onCheckedChange={(checked) => toggle(m.user_id, role, checked)}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <Select items={candidates} value={null} onValueChange={add}>
            <SelectTrigger className="min-w-64">
              <SelectValue placeholder="Aggiungi persona…" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvataggio…" : "Salva team"}
          </Button>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        </div>
      )}
    </form>
  );
}
