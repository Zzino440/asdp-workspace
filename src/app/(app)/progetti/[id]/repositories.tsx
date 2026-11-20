"use client";

import { useActionState, useState, useTransition } from "react";
import { X } from "lucide-react";
import { addRepository, removeRepository, type FormState } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Repository = { id: string; gitlab_path: string; role: string; branch: string };

const ROLE_ITEMS = [
  { value: "be", label: "Backend" },
  { value: "fe", label: "Frontend" },
  { value: "altro", label: "Altro" },
];
const ROLE_LABELS = Object.fromEntries(ROLE_ITEMS.map((r) => [r.value, r.label]));

const initialState: FormState = { error: null };

// Repo di codice del progetto: servono alle skill che leggono il codice e all'MCP.
export function Repositories({
  projectId,
  canEdit,
  repositories,
}: {
  projectId: string;
  canEdit: boolean;
  repositories: Repository[];
}) {
  const [state, formAction, pending] = useActionState(addRepository.bind(null, projectId), initialState);
  const [removing, startRemove] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {repositories.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessuna repository di codice collegata.</p>
      )}
      {repositories.length > 0 && (
        <ul className="flex flex-col gap-2">
          {repositories.map((r) => (
            <li key={r.id} className="flex items-center gap-3 text-sm">
              <Badge variant="secondary">{ROLE_LABELS[r.role]}</Badge>
              <span className="font-mono">{r.gitlab_path}</span>
              <span className="text-muted-foreground">{r.branch}</span>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Scollega ${r.gitlab_path}`}
                  disabled={removing}
                  onClick={() => startRemove(async () => setRemoveError((await removeRepository(r.id)).error))}
                >
                  <X />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {removeError && <p className="text-sm text-destructive">{removeError}</p>}

      {canEdit && (
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <Input name="gitlab_path" placeholder="dst/progetto/backend" aria-label="Percorso GitLab" className="w-64" required />
          <Select name="role" items={ROLE_ITEMS} defaultValue="be">
            <SelectTrigger aria-label="Ruolo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_ITEMS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input name="branch" defaultValue="main" aria-label="Branch" className="w-32" required />
          <Button type="submit" variant="outline" disabled={pending}>
            Collega repository
          </Button>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
