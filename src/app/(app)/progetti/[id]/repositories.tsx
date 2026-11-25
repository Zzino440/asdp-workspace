"use client";

import { useActionState, useState, useTransition } from "react";
import { ExternalLink, Plus, X } from "lucide-react";
import { addRepository, removeRepository, type FormState } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Repository = { id: string; gitlab_path: string; role: string; branch: string; href: string | null };
type DocsRepository = { path: string | null; branch: string; root: string; href: string | null };

const ROLE_ITEMS = [
  { value: "be", label: "Backend" },
  { value: "fe", label: "Frontend" },
  { value: "altro", label: "Altro" },
];
const ROLE_LABELS = Object.fromEntries(ROLE_ITEMS.map((r) => [r.value, r.label]));

const initialState: FormState = { error: null };

// Repo documenti (fissa, dai dati del progetto) e repo di codice, che servono alle skill che
// leggono il codice e all'MCP. Gli href a GitLab arrivano già costruiti dal server.
export function Repositories({
  projectId,
  canEdit,
  docs,
  repositories,
}: {
  projectId: string;
  canEdit: boolean;
  docs: DocsRepository;
  repositories: Repository[];
}) {
  const [removing, startRemove] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <h3 className="text-xs text-muted-foreground">Documenti ASDP</h3>
        {docs.path ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <RepoLink path={docs.path} href={docs.href} />
            <span className="text-muted-foreground">
              {docs.branch} · {docs.root}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nessuna repo documenti collegata.</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs text-muted-foreground">Codice</h3>
        {repositories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna repository di codice collegata.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {repositories.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <Badge variant="secondary">{ROLE_LABELS[r.role]}</Badge>
                <RepoLink path={r.gitlab_path} href={r.href} />
                <span className="text-muted-foreground">{r.branch}</span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Scollega ${r.gitlab_path}`}
                    disabled={removing}
                    onClick={() =>
                      startRemove(async () => {
                        setWarning(null);
                        setRemoveError((await removeRepository(r.id)).error);
                      })
                    }
                  >
                    <X />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {removeError && <p className="text-sm text-destructive">{removeError}</p>}
        {warning && <p className="text-sm text-destructive">{warning}</p>}
      </section>

      {canEdit && <AddRepositoryDialog projectId={projectId} onAdded={setWarning} />}
    </div>
  );
}

function RepoLink({ path, href }: { path: string; href: string | null }) {
  if (!href) return <span className="font-mono">{path}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono hover:underline"
    >
      {path}
      <ExternalLink className="size-3.5 text-muted-foreground" />
    </a>
  );
}

function AddRepositoryDialog({ projectId, onAdded }: { projectId: string; onAdded: (warning: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await addRepository(projectId, prev, formData);
    if (result.ok) {
      onAdded(result.warning ?? null);
      setOpen(false);
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="self-start" />}>
        <Plus />
        Collega repository
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collega repository di codice</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="gitlab_path">Percorso GitLab</Label>
            <Input id="gitlab_path" name="gitlab_path" placeholder="dst/progetto/backend" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Ruolo</Label>
              <Select name="role" items={ROLE_ITEMS} defaultValue="be">
                <SelectTrigger className="w-full">
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
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="branch">Branch</Label>
              <Input id="branch" name="branch" defaultValue="main" required />
            </div>
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="self-end">
            {pending ? "Collegamento…" : "Collega"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
