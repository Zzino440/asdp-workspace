"use client";

import { RepoPathInput } from "../repo-path-input";
import { useActionState } from "react";
import { updateProject, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  description: string | null;
  start_date: string | null;
  end_date: string | null;
};

const initialState: FormState = { error: null };
const toItems = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));
const natureItems = toItems(NATURE_LABELS);
const statusItems = toItems(PROJECT_STATUS_LABELS);
const phaseItems = PHASES.map(({ n, name }) => ({ value: String(n), label: `Fase ${n} · ${name}` }));

// Impostazioni › Generale: dati del progetto, modificabili da admin e PM (lo decide la RLS). La
// repo documenti si può cambiare (si verifica e si reindicizza); branch e cartella no. Le fasi
// precedenti all'attuale le sceglie solo l'admin (trigger projects_phase_back).
export function ProjectSettingsForm({ project, isAdmin }: { project: Project; isAdmin: boolean }) {
  const [state, formAction, pending] = useActionState(
    (prev: FormState, formData: FormData) => updateProject(project.id, prev, formData),
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Field id="name" label="Nome" defaultValue={project.name} required />
      <Field id="client" label="Cliente" defaultValue={project.client} required />
      <SelectField name="nature" label="Natura intervento" items={natureItems} defaultValue={project.nature} />
      <SelectField name="status" label="Stato" items={statusItems} defaultValue={project.status} />
      <SelectField
        name="current_phase"
        label="Fase corrente"
        items={phaseItems}
        defaultValue={String(project.current_phase)}
        disabled={(value) => !isAdmin && Number(value) < project.current_phase}
      />
      <Field id="framework_version" label="Versione framework" defaultValue={project.framework_version} required />
      <Field id="start_date" label="Inizio previsto" type="date" defaultValue={project.start_date ?? ""} />
      <Field id="end_date" label="Fine prevista" type="date" defaultValue={project.end_date ?? ""} />
      <div className="flex flex-col gap-2 sm:col-span-2 xl:col-span-3">
        <Label htmlFor="description">Descrizione</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={project.description ?? ""} />
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2 xl:col-span-3">
        <Label htmlFor="gitlab_project_path">Repo documenti (GitLab)</Label>
        <RepoPathInput id="gitlab_project_path" name="gitlab_project_path" defaultValue={project.gitlab_project_path ?? ""} placeholder="dst/cliente/adsp" />
        <p className="text-xs text-muted-foreground">
          Se la cambi l&apos;app la verifica e reindicizza. Il webhook sulla repo vecchia va tolto a mano da GitLab.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvataggio…" : "Salva"}
        </Button>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state.ok && !state.error && <p className="text-sm text-muted-foreground">{state.warning ?? "Salvato."}</p>}
      </div>
    </form>
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
  disabled,
}: {
  name: string;
  label: string;
  items: { value: string; label: string }[];
  defaultValue: string;
  disabled?: (value: string) => boolean;
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
            <SelectItem key={item.value} value={item.value} disabled={disabled?.(item.value)}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
