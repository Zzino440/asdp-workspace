"use client";

import { useActionState, useState } from "react";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { saveTeam, type FormState } from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
// Proposte dal Team Microsoft del progetto: persone già nell'app e nomi di chi non c'è.
type Suggested = { team: string; people: Person[]; missing: string[] } | null;

const initialState: FormState = { error: null };

// Team del progetto: elenco con i ruoli per tutti; admin e PM lo modificano in un dialog con la
// matrice persone × ruoli. È la RLS a decidere se il salvataggio passa.
export function TeamEditor({
  projectId,
  canEdit,
  members,
  people,
  suggested,
  autoOpen = false,
  isAdmin = false,
}: {
  projectId: string;
  canEdit: boolean;
  members: Member[];
  people: Person[];
  suggested: Suggested;
  autoOpen?: boolean; // subito dopo aver creato il canale Teams
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(canEdit && autoOpen && Boolean(suggested));
  const router = useRouter();
  const pathname = usePathname();
  // Dopo il salvataggio le proposte non servono più: si tolgono dall'indirizzo.
  const saved = () => {
    setOpen(false);
    if (autoOpen) router.replace(pathname);
  };
  const missing = (["pm", "tl"] as const).filter((role) => !members.some((m) => m.roles.includes(role)));

  return (
    <div className="flex flex-col gap-4">
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna persona nel team.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="truncate text-xs text-muted-foreground">{m.email}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {ASDP_ROLES.filter((r) => m.roles.includes(r)).map((r) => (
                  <Badge key={r} variant="secondary">
                    {ROLE_LABELS[r]}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 && (
        <p className="text-sm text-destructive">
          Manca {missing.map((r) => (r === "pm" ? "un Project Manager" : "un Tech Lead")).join(" e ")}.
        </p>
      )}
      {canEdit && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" className="self-start" />}>
            <Users />
            Gestisci team
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Gestisci team</DialogTitle>
            </DialogHeader>
            {/* Montato solo a dialog aperto: annullare scarta le modifiche non salvate. */}
            {open && (
              <TeamMatrix
                projectId={projectId}
                members={members}
                people={people}
                onSaved={saved}
                suggested={suggested}
                suggestedOpen={autoOpen}
                isAdmin={isAdmin}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Matrice persone × ruoli ASDP.
function TeamMatrix({
  projectId,
  members: initialMembers,
  people,
  onSaved,
  suggested,
  suggestedOpen,
  isAdmin,
}: {
  projectId: string;
  members: Member[];
  people: Person[];
  onSaved: () => void;
  suggested: Suggested;
  suggestedOpen: boolean;
  isAdmin: boolean;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [state, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await saveTeam(projectId, prev, formData);
    if (result.ok) onSaved();
    return result;
  }, initialState);

  const holders = (role: AsdpRole) => members.filter((m) => m.roles.includes(role));
  const missingRoles = [holders("pm").length === 0 && "un PM", holders("tl").length === 0 && "un TL"].filter(Boolean);
  // Persone del Team Microsoft già nell'app e non ancora nella tabella.
  const fromTeam = (suggested?.people ?? []).filter((p) => !members.some((m) => m.user_id === p.id));
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
                    className="mx-auto"
                    aria-label={`${m.name}: ${ROLE_LABELS[role]}`}
                    checked={m.roles.includes(role)}
                    onCheckedChange={(checked) => toggle(m.user_id, role, checked)}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
      {missingRoles.length > 0 && <p className="text-xs text-destructive">Manca {missingRoles.join(" e ")}.</p>}

      {suggested && (
        <details open={suggestedOpen} className="rounded-md border px-3 py-2 text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            Dal Team «{suggested.team}» · {suggested.people.length + suggested.missing.length} persone
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            {fromTeam.length > 0 && (
              <div className="flex flex-col gap-1">
                <h3 className="text-xs text-muted-foreground">Nell&apos;app</h3>
                <ul className="flex flex-col">
                  {fromTeam.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 py-1">
                      <span className="min-w-0 truncate">
                        {p.name} <span className="text-xs text-muted-foreground">{p.email}</span>
                      </span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => add(p.id)}>
                        <Plus />
                        Aggiungi
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {suggested.missing.length > 0 && (
              <div className="flex flex-col gap-1">
                <h3 className="text-xs text-muted-foreground">Non ancora nell&apos;app ({suggested.missing.length})</h3>
                <p className="text-muted-foreground">{suggested.missing.join(" · ")}</p>
                {isAdmin && (
                  <Link href="/amministrazione/utenti" className="text-xs text-primary hover:underline">
                    Invitale da Amministratore → Utenti
                  </Link>
                )}
              </div>
            )}
            {fromTeam.length === 0 && suggested.missing.length === 0 && (
              <p className="text-muted-foreground">Tutte le persone del Team sono già nel team del progetto.</p>
            )}
          </div>
        </details>
      )}
    </form>
  );
}
