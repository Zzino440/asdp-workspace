"use client";

import { useActionState, useState } from "react";
import { createProject, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NATURE_LABELS } from "@/lib/labels";

const initialState: FormState = { error: null };
const natureItems = Object.entries(NATURE_LABELS).map(([value, label]) => ({ value, label }));
const NATURE_HINTS: Record<string, string> = {
  greenfield: "Sistema nuovo: le skill partono da zero.",
  evolutiva: "Sistema esistente: le skill lavorano in modalità delta sul codice e sui documenti che ci sono.",
};

// Iniziali delle parole del nome (massimo 6), finché l'utente non scrive un codice suo.
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/gi, "")[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 6);

const slug = (code: string) =>
  code.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// parentGroup: gruppo GitLab sotto cui l'app crea i progetti; null = si collega solo una repo esistente.
export function ProjectForm({ parentGroup }: { parentGroup: string | null }) {
  const [state, formAction, pending] = useActionState(createProject, initialState);
  const [name, setName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [nature, setNature] = useState("greenfield");
  const [repos, setRepos] = useState<"crea" | "collega">(parentGroup ? "crea" : "collega");
  const [codeRepos, setCodeRepos] = useState({ fe: true, be: true });
  const shownCode = code ?? initials(name);

  function changeNature(value: string | null) {
    if (!value) return;
    setNature(value);
    // Evolutiva: di solito il codice esiste già, le repo si collegano.
    setCodeRepos(value === "evolutiva" ? { fe: false, be: false } : { fe: true, be: true });
  }

  const groupPath = `${parentGroup}/${slug(shownCode) || "codice"}`;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Progetto</CardTitle>
          <CardDescription>Il codice identifica il progetto nell&apos;app, nelle repo e con Claude.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Codice</Label>
            <Input
              id="code"
              name="code"
              required
              maxLength={20}
              value={shownCode}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="client">Cliente</Label>
            <Input id="client" name="client" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Natura intervento</Label>
            <Select name="nature" items={natureItems} value={nature} onValueChange={changeNature}>
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
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">{NATURE_HINTS[nature]}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Repository</CardTitle>
          <CardDescription>
            I documenti ASDP stanno in una repo a sé (&quot;adsp&quot;), separata dal codice.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input type="hidden" name="repos" value={repos} />
          <div className="grid gap-2 sm:grid-cols-2">
            {parentGroup && (
              <Choice checked={repos === "crea"} onSelect={() => setRepos("crea")} title="Crea su GitLab">
                Un gruppo per il progetto con la repo documenti già strutturata.
              </Choice>
            )}
            <Choice checked={repos === "collega"} onSelect={() => setRepos("collega")} title="Collega una repo esistente">
              La repo documenti c&apos;è già (anche dentro una repo di codice).
            </Choice>
          </div>

          {repos === "crea" ? (
            <div className="flex flex-col gap-3 rounded-md border p-4">
              <div className="flex flex-wrap gap-4">
                {(["fe", "be"] as const).map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={codeRepos[r]} onCheckedChange={(c) => setCodeRepos((v) => ({ ...v, [r]: c }))} />
                    Repo {r === "fe" ? "frontend" : "backend"} vuota
                    {codeRepos[r] && <input type="hidden" name={r} value="on" />}
                  </label>
                ))}
              </div>
              <ul className="font-mono text-xs text-muted-foreground">
                <li>{groupPath}/adsp</li>
                {codeRepos.fe && <li>{groupPath}/fe</li>}
                {codeRepos.be && <li>{groupPath}/be</li>}
              </ul>
              <input type="hidden" name="gitlab_project_path" value="" />
              <input type="hidden" name="gitlab_branch" value="main" />
              <input type="hidden" name="docs_root" value="asdp/" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="gitlab_project_path">Repo documenti (GitLab)</Label>
                <Input id="gitlab_project_path" name="gitlab_project_path" placeholder="dst/cliente/adsp" />
                <p className="text-xs text-muted-foreground">
                  Le repo di codice si aggiungono dalla pagina del progetto.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="gitlab_branch">Branch</Label>
                <Input id="gitlab_branch" name="gitlab_branch" defaultValue="main" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="docs_root">Cartella documenti</Label>
                <Input id="docs_root" name="docs_root" defaultValue="asdp/" required />
              </div>
            </div>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Avanzate</summary>
            <div className="mt-3 flex max-w-xs flex-col gap-2">
              <Label htmlFor="framework_version">Versione framework</Label>
              <Input id="framework_version" name="framework_version" defaultValue="0.8.0" required />
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Dopo la creazione</CardTitle>
          <CardDescription>
            Nella pagina del progetto la scheda &quot;Prepara l&apos;area di lavoro&quot; ti guida nei passi che
            mancano: canale Teams, team, collegamento di Claude e primo passo ASDP (Kickoff).
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-2">
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Creazione e preparazione…" : "Crea progetto"}
        </Button>
      </div>
    </form>
  );
}

function Choice({
  checked,
  onSelect,
  title,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onSelect}
      className="flex flex-col gap-1 rounded-md border p-3 text-left text-sm transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-accent"
    >
      <span className="font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{children}</span>
    </button>
  );
}
