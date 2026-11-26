"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { updateProject, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NATURE_LABELS, PHASES, PROJECT_STATUS_LABELS } from "@/lib/labels";

type Project = {
  id: string;
  name: string;
  client: string;
  nature: string;
  status: string;
  current_phase: number;
  framework_version: string;
  gitlab_project_path: string | null;
};

const initialState: FormState = { error: null };
const toItems = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));
const natureItems = toItems(NATURE_LABELS);
const statusItems = toItems(PROJECT_STATUS_LABELS);
const phaseItems = PHASES.map(({ n, name }) => ({ value: String(n), label: `Fase ${n} · ${name}` }));

// Dati del progetto modificabili da admin e PM (lo decide la RLS). La repo documenti si può
// cambiare (si verifica e si reindicizza); branch e cartella no.
export function ProjectEditDialog({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await updateProject(project.id, prev, formData);
    if (result.ok && !result.warning) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Pencil />
        Modifica
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifica progetto</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Nome" defaultValue={project.name} required />
          <Field id="client" label="Cliente" defaultValue={project.client} required />
          <SelectField name="nature" label="Natura intervento" items={natureItems} defaultValue={project.nature} />
          <SelectField name="status" label="Stato" items={statusItems} defaultValue={project.status} />
          <SelectField
            name="current_phase"
            label="Fase corrente"
            items={phaseItems}
            defaultValue={String(project.current_phase)}
          />
          <Field
            id="framework_version"
            label="Versione framework"
            defaultValue={project.framework_version}
            required
          />
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="gitlab_project_path">Repo documenti (GitLab)</Label>
            <Input
              id="gitlab_project_path"
              name="gitlab_project_path"
              defaultValue={project.gitlab_project_path ?? ""}
              placeholder="dst/cliente/adsp"
            />
            <p className="text-xs text-muted-foreground">
              Se la cambi l&apos;app la verifica e reindicizza. Il webhook sulla repo vecchia va tolto a mano da GitLab.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            {state.warning && <p className="text-sm text-muted-foreground">{state.warning}</p>}
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending} className="self-end">
              {pending ? "Salvataggio…" : "Salva"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, ...props }: { id: string; label: string } & React.ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} {...props} />
    </div>
  );
}

function SelectField({
  name,
  label,
  items,
  defaultValue,
}: {
  name: string;
  label: string;
  items: { value: string; label: string }[];
  defaultValue: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select name={name} items={items} defaultValue={defaultValue}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
