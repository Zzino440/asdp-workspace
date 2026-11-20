"use client";

import { useActionState } from "react";
import { createProject, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NATURE_LABELS } from "@/lib/labels";

const initialState: FormState = { error: null };
const natureItems = Object.entries(NATURE_LABELS).map(([value, label]) => ({ value, label }));

export default function NuovoProgettoPage() {
  const [state, formAction, pending] = useActionState(createProject, initialState);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nuovo progetto</h1>
      <Card>
        <CardContent>
          <form action={formAction} className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Nome" required />
            <Field id="code" label="Codice" required />
            <Field id="client" label="Cliente" required />
            <div className="flex flex-col gap-2">
              <Label>Natura intervento</Label>
              <Select name="nature" items={natureItems} defaultValue="greenfield">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {natureItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Evolutiva attiva le modalità delta delle skill.
              </p>
            </div>
            <Field id="framework_version" label="Versione framework" defaultValue="0.8.0" required />
            <Field id="gitlab_project_path" label="Project GitLab" placeholder="dst/cliente/adsp" />
            <Field id="gitlab_branch" label="Branch" defaultValue="main" required />
            <div className="flex flex-col gap-2 sm:col-span-2">
              {state.error && <p className="text-sm text-destructive">{state.error}</p>}
              <Button type="submit" disabled={pending} className="self-start">
                {pending ? "Creazione…" : "Crea progetto"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
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
