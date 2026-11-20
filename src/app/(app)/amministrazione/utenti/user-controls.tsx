"use client";

import { useActionState, useState, useTransition } from "react";
import {
  deleteUser,
  inviteUser,
  resendAccess,
  setAdmin,
  setStatus,
  setUserProjectRoles,
  type ActionResult,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { ASDP_ROLES, ROLE_LABELS, type AsdpRole } from "@/lib/labels";

function useServerAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => setError((await action()).error));
  return { pending, error, run };
}

export function AdminSwitch({ userId, checked, disabled }: { userId: string; checked: boolean; disabled?: boolean }) {
  const { pending, error, run } = useServerAction();
  return (
    <div className="flex items-center gap-2">
      <Switch
        aria-label="Admin piattaforma"
        checked={checked}
        disabled={disabled || pending}
        onCheckedChange={(value) => run(() => setAdmin(userId, value))}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

export function SuspendButton({ userId, status, disabled }: { userId: string; status: string; disabled?: boolean }) {
  const { pending, error, run } = useServerAction();
  if (status === "invitato") return null;
  const suspended = status === "sospeso";
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={suspended ? "outline" : "destructive"}
        size="sm"
        disabled={disabled || pending}
        onClick={() => run(() => setStatus(userId, suspended ? "attivo" : "sospeso"))}
      >
        {suspended ? "Riattiva" : "Sospendi"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

export function ResendAccessButton({ userId, status, disabled }: { userId: string; status: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || pending}
        onClick={() => startTransition(async () => setResult(await resendAccess(userId)))}
      >
        {status === "invitato" ? "Reinvia invito" : "Reimposta password"}
      </Button>
      {result?.error && <span className="text-xs text-destructive">{result.error}</span>}
      {result?.message && <span className="text-xs text-muted-foreground">{result.message}</span>}
    </div>
  );
}

export function DeleteUserButton({ userId, name, disabled }: { userId: string; name: string; disabled?: boolean }) {
  const { pending, error, run } = useServerAction();
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="destructive"
        size="sm"
        disabled={disabled || pending}
        onClick={() => {
          if (confirm(`Eliminare ${name}? L'account e i ruoli nei progetti vengono cancellati e non si possono recuperare.`)) {
            run(() => deleteUser(userId));
          }
        }}
      >
        Elimina
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

const initialInvite: ActionResult = { error: null };

export function InviteDialog() {
  const [state, formAction, pending] = useActionState(inviteUser, initialInvite);
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>Invita utente</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invita utente</DialogTitle>
          <DialogDescription>Riceverà un&apos;email con il link per impostare la password.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="full_name">Nome e cognome</Label>
            <Input id="full_name" name="full_name" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.message && <p className="text-sm text-muted-foreground">{state.message}</p>}
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Invio…" : "Invia invito"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectRolesRow({
  userId,
  project,
  roles: initialRoles,
}: {
  userId: string;
  project: { id: string; name: string; code: string };
  roles: AsdpRole[];
}) {
  const [roles, setRoles] = useState(initialRoles);
  const { pending, error, run } = useServerAction();
  return (
    <TableRow>
      <TableCell className="font-medium">
        {project.name} <span className="text-muted-foreground">· {project.code}</span>
      </TableCell>
      {ASDP_ROLES.map((role) => (
        <TableCell key={role} className="text-center">
          <Checkbox
            aria-label={`${project.code}: ${ROLE_LABELS[role]}`}
            checked={roles.includes(role)}
            onCheckedChange={(checked) =>
              setRoles((r) => (checked ? [...r, role] : r.filter((x) => x !== role)))
            }
          />
        </TableCell>
      ))}
      <TableCell>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setUserProjectRoles(userId, project.id, roles))}>
            Salva
          </Button>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function AddToProject({
  userId,
  projects,
}: {
  userId: string;
  projects: { id: string; name: string; code: string }[];
}) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const { pending, error, run } = useServerAction();
  const projectItems = projects.map((p) => ({ value: p.id, label: `${p.name} · ${p.code}` }));
  const roleItems = ASDP_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select items={projectItems} value={projectId} onValueChange={setProjectId}>
        <SelectTrigger className="min-w-64">
          <SelectValue placeholder="Progetto…" />
        </SelectTrigger>
        <SelectContent>
          {projectItems.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select items={roleItems} value={role} onValueChange={setRole}>
        <SelectTrigger>
          <SelectValue placeholder="Ruolo…" />
        </SelectTrigger>
        <SelectContent>
          {roleItems.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        disabled={!projectId || !role || pending}
        onClick={() => run(() => setUserProjectRoles(userId, projectId!, [role!]))}
      >
        Aggiungi a progetto
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
