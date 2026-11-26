"use client";

import { useActionState, useState } from "react";
import { Plus, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { saveTeam, type FormState } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ASDP_ROLES, ROLE_LABELS, type AsdpRole } from "@/lib/labels";

type Member = { user_id: string; name: string; email: string; roles: AsdpRole[]; isNew?: boolean; removed?: boolean };
type Person = { id: string; name: string; email: string };
// Proposte dal Team Microsoft del progetto: persone già nell'app e nomi di chi non c'è.
type Suggested = { team: string; people: Person[]; missing: string[] } | null;

const initialState: FormState = { error: null };

// Team del progetto: elenco con i ruoli per tutti; admin e PM lo modificano in un dialog con una
// riga per persona e i ruoli come pillole. È la RLS a decidere se il salvataggio passa.
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
          <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gestisci team</DialogTitle>
              <DialogDescription>
                Chi lavora al progetto e con quale ruolo: i ruoli decidono chi modifica e chi approva.
              </DialogDescription>
            </DialogHeader>
            {/* Montato solo a dialog aperto: annullare scarta le modifiche non salvate. */}
            {open && (
              <TeamForm
                projectId={projectId}
                members={members}
                people={people}
                onSaved={saved}
                suggested={suggested}
                isAdmin={isAdmin}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium"
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

// Una riga per persona con i ruoli come pillole, suggeriti dal Team Microsoft e piè con Salva.
function TeamForm({
  projectId,
  members: initialMembers,
  people,
  onSaved,
  suggested,
  isAdmin,
}: {
  projectId: string;
  members: Member[];
  people: Person[];
  onSaved: () => void;
  suggested: Suggested;
  isAdmin: boolean;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [state, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await saveTeam(projectId, prev, formData);
    if (result.ok) onSaved();
    return result;
  }, initialState);

  const visible = members.filter((m) => !m.removed);
  const hasRole = (role: AsdpRole) => visible.some((m) => m.roles.includes(role));
  const missingRoles = [!hasRole("pm") && "un PM", !hasRole("tl") && "un TL"].filter(Boolean);
  const merged = visible.some((m) => m.roles.includes("pm") && m.roles.includes("tl"));
  const inTeam = (id: string) => visible.some((m) => m.user_id === id);
  const fromTeam = (suggested?.people ?? []).filter((p) => !inTeam(p.id));
  const candidates = people
    .filter((p) => !inTeam(p.id))
    .map((p) => ({ value: p.id, label: `${p.name} · ${p.email}` }));

  const setRoles = (userId: string, roles: AsdpRole[]) =>
    setMembers((list) => list.map((m) => (m.user_id === userId ? { ...m, roles } : m)));

  function add(userId: string | null) {
    const person = people.find((p) => p.id === userId);
    if (!person) return;
    setMembers((list) =>
      list.some((m) => m.user_id === person.id)
        ? list.map((m) => (m.user_id === person.id ? { ...m, removed: false } : m))
        : [...list, { user_id: person.id, name: person.name, email: person.email, roles: [], isNew: true }],
    );
  }

  // Togliere una persona già nel team = salvarla senza ruoli (saveTeam la rimuove); una nuova sparisce.
  const remove = (userId: string) =>
    setMembers((list) =>
      list.flatMap((m) => (m.user_id !== userId ? [m] : m.isNew ? [] : [{ ...m, removed: true }])),
    );

  // Le persone appena aggiunte senza ruoli non vanno salvate.
  const payload = members
    .filter((m) => !(m.isNew && m.roles.length === 0))
    .map(({ user_id, roles, removed }) => ({ user_id, roles: removed ? [] : roles }));

  return (
    <form action={formAction} className="flex min-h-0 flex-col gap-4">
      <input type="hidden" name="team" value={JSON.stringify(payload)} />

      <Select items={candidates} value={null} onValueChange={add}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Aggiungi una persona…" />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="-mx-4 flex min-h-0 flex-col gap-5 overflow-y-auto px-4">
        {visible.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nessuno nel team: aggiungi una persona{fromTeam.length > 0 && " o scegli tra i suggeriti"}.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {visible.map((m) => (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar name={m.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                </div>
                <ToggleGroup
                  multiple
                  size="sm"
                  variant="outline"
                  spacing={1}
                  value={m.roles}
                  onValueChange={(roles) => setRoles(m.user_id, roles as AsdpRole[])}
                  aria-label={`Ruoli di ${m.name}`}
                  className="flex-wrap"
                >
                  {ASDP_ROLES.map((role) => (
                    <ToggleGroupItem
                      key={role}
                      value={role}
                      className="h-7 px-2 text-xs data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground"
                    >
                      {ROLE_LABELS[role]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Togli ${m.name}`}
                  onClick={() => remove(m.user_id)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {suggested && (fromTeam.length > 0 || suggested.missing.length > 0) && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs text-muted-foreground">Suggeriti dal Team «{suggested.team}»</h3>
            {fromTeam.length > 0 && (
              <ul className="flex flex-col">
                {fromTeam.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-1.5">
                    <Avatar name={p.name} />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {p.name} <span className="text-xs text-muted-foreground">{p.email}</span>
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => add(p.id)}>
                      <Plus />
                      Aggiungi
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {suggested.missing.length > 0 && (
              <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer">
                  {suggested.missing.length} persone del Team non sono nell&apos;app
                </summary>
                <p className="mt-2">{suggested.missing.join(" · ")}</p>
                {isAdmin && (
                  <Link href="/amministrazione/utenti" className="mt-1 inline-block text-xs text-primary hover:underline">
                    Invitale da Amministratore → Utenti
                  </Link>
                )}
              </details>
            )}
          </section>
        )}
      </div>

      <DialogFooter className="items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {state.error ? (
            <span className="text-destructive">{state.error}</span>
          ) : missingRoles.length > 0 ? (
            <span className="text-destructive">Manca {missingRoles.join(" e ")}.</span>
          ) : merged ? (
            "PM e TL sulla stessa persona: registrato come accorpamento."
          ) : null}
        </p>
        <div className="flex gap-2">
          <DialogClose render={<Button type="button" variant="outline" />}>Annulla</DialogClose>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvataggio…" : "Salva"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
