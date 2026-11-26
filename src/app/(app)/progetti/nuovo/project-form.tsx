"use client";

import { RepoPathInput } from "../repo-path-input";
import { useActionState, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { createProject, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { NATURE_LABELS } from "@/lib/labels";

type Person = { id: string; name: string; email: string };
type Team = { id: string; displayName: string };
type CodeChoice = "nessuna" | "nuova" | "esistente";

const initialState: FormState = { error: null };
const STEPS = ["Progetto", "Repository", "Persone e Teams", "Riepilogo"];
const NATURE_HINTS: Record<string, string> = {
  greenfield: "Sistema nuovo: le skill partono da zero.",
  evolutiva: "Sistema esistente: le skill lavorano in modalità delta sul codice e sui documenti che ci sono.",
};
const CODE_LABELS: Record<CodeChoice, string> = { nessuna: "Nessuna", nuova: "Nuova vuota", esistente: "Esistente" };
const ROLE_NAMES = { fe: "Frontend", be: "Backend" } as const;

// Iniziali delle parole del nome (massimo 6), finché l'utente non scrive un codice suo. Se le
// iniziali sono meno di 3 (es. una o due parole) si usano le prime 3 lettere del nome: il codice
// ha almeno 3 caratteri (anche GitLab rifiuta i gruppi con percorsi troppo corti).
const initials = (name: string) => {
  const words = name.split(/\s+/).map((w) => w.replace(/[^a-z0-9]/gi, "")).filter(Boolean);
  const code = words.map((w) => w[0]).join("");
  return (code.length >= 3 ? code : words.join("").slice(0, 3)).toUpperCase().slice(0, 6);
};

const slug = (code: string) =>
  code.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString("it-IT") : "");

// Creazione guidata in quattro passi. Un solo form: i passi non attivi restano montati (nascosti),
// così a "Crea" arriva tutto a createProject; "Avanti" controlla solo i campi del passo aperto.
// parentGroup: gruppo GitLab sotto cui l'app crea i progetti (null = si collega solo una repo).
// microsoft: null se Teams non è disponibile; teams null se l'account non è collegato.
export function ProjectForm({
  parentGroup,
  people,
  microsoft,
}: {
  parentGroup: string | null;
  people: Person[];
  microsoft: { teams: Team[] | null } | null;
}) {
  const [state, formAction, pending] = useActionState(createProject, initialState);
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const fieldsets = useRef<(HTMLFieldSetElement | null)[]>([]);

  const [name, setName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [client, setClient] = useState("");
  const [nature, setNature] = useState("greenfield");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [repos, setRepos] = useState<"crea" | "collega">(parentGroup ? "crea" : "collega");
  const [docsPath, setDocsPath] = useState("");
  const [codeRepos, setCodeRepos] = useState<Record<"fe" | "be", CodeChoice>>(
    parentGroup ? { fe: "nuova", be: "nuova" } : { fe: "nessuna", be: "nessuna" },
  );
  const [codePaths, setCodePaths] = useState({ fe: "", be: "" });
  const [pm, setPm] = useState<string | null>(null);
  const [tl, setTl] = useState<string | null>(null);
  const [team, setTeam] = useState<string | null>(null);

  const shownCode = code ?? initials(name);
  const groupPath = `${parentGroup}/${slug(shownCode) || "codice"}`;
  const canCreateCode = Boolean(parentGroup) && repos === "crea";
  const last = STEPS.length - 1;
  const teamItems = (microsoft?.teams ?? []).map((t) => ({ value: t.id, label: t.displayName }));
  const personName = (id: string | null) => people.find((p) => p.id === id)?.name;

  // Natura e scelta della repo documenti cambiano le proposte per il codice: in un'evolutiva di
  // solito il codice esiste già; senza "Crea" non si possono avere repo nuove.
  function proposeCode(nextNature: string, nextRepos: "crea" | "collega") {
    const fresh = Boolean(parentGroup) && nextRepos === "crea" && nextNature === "greenfield";
    const choice: CodeChoice = fresh ? "nuova" : nextNature === "evolutiva" ? "esistente" : "nessuna";
    setCodeRepos({ fe: choice, be: choice });
  }

  function goTo(target: number) {
    setStep(target);
    setReached((r) => Math.max(r, target));
    window.scrollTo({ top: 0 });
  }

  function next() {
    const fieldset = fieldsets.current[step];
    const valid = [...(fieldset?.elements ?? [])].every((el) => (el as HTMLInputElement).reportValidity?.() ?? true);
    if (valid) goTo(step + 1);
  }

  const codeSummary = (role: "fe" | "be") =>
    codeRepos[role] === "nuova"
      ? `Nuova · ${groupPath}/${role}`
      : codeRepos[role] === "esistente"
        ? codePaths[role] || "Esistente, percorso mancante"
        : "Nessuna";

  const summary = [
    {
      step: 0,
      title: "Progetto",
      rows: [
        ["Nome", name && `${name} (${shownCode})`],
        ["Cliente", client],
        ["Natura", NATURE_LABELS[nature as keyof typeof NATURE_LABELS]],
        ["Date", [formatDate(start), formatDate(end)].filter(Boolean).join(" → ")],
        ["Descrizione", description],
      ],
    },
    {
      step: 1,
      title: "Repository",
      rows: [
        ["Documenti", repos === "crea" ? `Nuova · ${groupPath}/adsp` : docsPath || "Da collegare dopo"],
        ["Frontend", codeSummary("fe")],
        ["Backend", codeSummary("be")],
      ],
    },
    {
      step: 2,
      title: "Persone e Teams",
      rows: [
        ["PM", personName(pm) ?? "Da assegnare"],
        ["TL", personName(tl) ?? "Da assegnare"],
        ...(microsoft ? [["Canale Teams", teamItems.find((t) => t.value === team)?.label ?? "Più tardi"]] : []),
      ],
    },
  ];

  return (
    <form
      action={formAction}
      // Invio da tastiera nei passi intermedi: va avanti invece di creare il progetto.
      onSubmit={(e) => {
        if (step < last) {
          e.preventDefault();
          next();
        }
      }}
      className="flex flex-col gap-6"
    >
      <Stepper step={step} reached={reached} onSelect={goTo} />

      <div className={step < last ? "grid items-start gap-6 lg:grid-cols-[1fr_20rem] 2xl:grid-cols-[1fr_24rem]" : "flex flex-col gap-6"}>
        <div className="flex min-w-0 flex-col gap-6">
          {/* 1. Progetto */}
          <fieldset ref={(el) => void (fieldsets.current[0] = el)} hidden={step !== 0} className="min-w-0">
            <Card>
              <CardHeader>
                <CardTitle>Progetto</CardTitle>
                <CardDescription>Il codice identifica il progetto nell&apos;app, nelle repo e con Claude.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Field label="Nome" htmlFor="name">
                  <Input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Codice" htmlFor="code">
                  <Input
                    id="code"
                    name="code"
                    required
                    minLength={3}
                    maxLength={20}
                    value={shownCode}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                </Field>
                <Field label="Cliente" htmlFor="client" className="sm:col-span-2 xl:col-span-1">
                  <Input id="client" name="client" required value={client} onChange={(e) => setClient(e.target.value)} />
                </Field>
                <div className="flex flex-col gap-2 sm:col-span-2 xl:col-span-3">
                  <Label>Natura intervento</Label>
                  <input type="hidden" name="nature" value={nature} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(NATURE_LABELS).map(([value, label]) => (
                      <Choice
                        key={value}
                        checked={nature === value}
                        onSelect={() => {
                          setNature(value);
                          proposeCode(value, repos);
                        }}
                        title={label}
                      >
                        {NATURE_HINTS[value]}
                      </Choice>
                    ))}
                  </div>
                </div>
                <Field label="Descrizione (facoltativa)" htmlFor="description" className="sm:col-span-2 xl:col-span-3">
                  <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="Obiettivo e perimetro in due righe"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>
                <Field label="Inizio previsto" htmlFor="start_date">
                  <Input id="start_date" name="start_date" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </Field>
                <Field label="Fine prevista" htmlFor="end_date">
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    min={start || undefined}
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </Field>
              </CardContent>
            </Card>
          </fieldset>

          {/* 2. Repository */}
          <fieldset ref={(el) => void (fieldsets.current[1] = el)} hidden={step !== 1} className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Repo documenti</CardTitle>
                <CardDescription>
                  I documenti ASDP stanno in una repo a sé (&quot;adsp&quot;), separata dal codice.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <input type="hidden" name="repos" value={repos} />
                <div className="grid gap-2 sm:grid-cols-2">
                  {parentGroup && (
                    <Choice
                      checked={repos === "crea"}
                      onSelect={() => {
                        setRepos("crea");
                        proposeCode(nature, "crea");
                      }}
                      title="Crea su GitLab"
                    >
                      Un gruppo per il progetto con la repo documenti già strutturata.
                    </Choice>
                  )}
                  <Choice
                    checked={repos === "collega"}
                    onSelect={() => {
                      setRepos("collega");
                      proposeCode(nature, "collega");
                    }}
                    title="Collega una repo esistente"
                  >
                    La repo documenti c&apos;è già (anche dentro una repo di codice).
                  </Choice>
                </div>

                {repos === "crea" ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Gruppo <span className="font-mono text-foreground">{groupPath}</span> con la repo{" "}
                      <span className="font-mono text-foreground">adsp</span>.
                    </p>
                    <input type="hidden" name="gitlab_project_path" value="" />
                    <input type="hidden" name="gitlab_branch" value="main" />
                    <input type="hidden" name="docs_root" value="asdp/" />
                  </>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Repo documenti (GitLab)" htmlFor="gitlab_project_path" className="sm:col-span-2">
                      <RepoPathInput
                        id="gitlab_project_path"
                        name="gitlab_project_path"
                        placeholder="dst/cliente/adsp"
                        onInput={(e) => setDocsPath(e.currentTarget.value)}
                      />
                    </Field>
                    <Field label="Branch" htmlFor="gitlab_branch">
                      <Input id="gitlab_branch" name="gitlab_branch" defaultValue="main" required />
                    </Field>
                    <Field label="Cartella documenti" htmlFor="docs_root">
                      <Input id="docs_root" name="docs_root" defaultValue="asdp/" required />
                    </Field>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Repo di codice</CardTitle>
                <CardDescription>
                  Le skill le leggono come input.{" "}
                  {canCreateCode ? "Nuove repo vuote nel gruppo del progetto o repo che esistono già." : "Repo che esistono già su GitLab."}{" "}
                  Altre si aggiungono dopo da Impostazioni.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-border">
                {(["fe", "be"] as const).map((role) => (
                  <div key={role} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium">{ROLE_NAMES[role]}</span>
                      <input type="hidden" name={role} value={codeRepos[role]} />
                      <ToggleGroup
                        size="sm"
                        variant="outline"
                        spacing={1}
                        value={[codeRepos[role]]}
                        onValueChange={(v) => v[0] && setCodeRepos((c) => ({ ...c, [role]: v[0] as CodeChoice }))}
                        aria-label={`Repo ${ROLE_NAMES[role]}`}
                        className="flex-wrap"
                      >
                        {(Object.keys(CODE_LABELS) as CodeChoice[])
                          .filter((c) => c !== "nuova" || canCreateCode)
                          .map((c) => (
                            <ToggleGroupItem
                              key={c}
                              value={c}
                              className="h-7 px-2 text-xs data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground"
                            >
                              {CODE_LABELS[c]}
                            </ToggleGroupItem>
                          ))}
                      </ToggleGroup>
                    </div>
                    {codeRepos[role] === "nuova" && (
                      <p className="font-mono text-xs text-muted-foreground">
                        {groupPath}/{role}
                      </p>
                    )}
                    {codeRepos[role] === "esistente" && (
                      <RepoPathInput
                        name={`${role}_path`}
                        required
                        aria-label={`Percorso GitLab della repo ${ROLE_NAMES[role]}`}
                        placeholder={`dst/cliente/${role}`}
                        defaultValue={codePaths[role]}
                        onInput={(e) => {
                          const value = e.currentTarget.value;
                          setCodePaths((p) => ({ ...p, [role]: value }));
                        }}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </fieldset>

          {/* 3. Persone e Teams */}
          <fieldset ref={(el) => void (fieldsets.current[2] = el)} hidden={step !== 2} className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Team</CardTitle>
                <CardDescription>
                  PM e TL del progetto. Gli altri ruoli e altre persone si aggiungono dopo da Impostazioni › Team.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <PersonPicker label="Project Manager" name="pm" people={people} value={pm} onChange={setPm} />
                <PersonPicker label="Tech Lead" name="tl" people={people} value={tl} onChange={setTl} />
                {pm && pm === tl && (
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    PM e TL sulla stessa persona: registrato come accorpamento.
                  </p>
                )}
              </CardContent>
            </Card>

            {microsoft && (
              <Card>
                <CardHeader>
                  <CardTitle>Canale Teams</CardTitle>
                  <CardDescription>
                    Un canale «{shownCode || "CODICE"} {name || "Nome"}» nel Team scelto, con le cartelle per i file del
                    cliente. I documenti ASDP restano su GitLab.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {microsoft.teams ? (
                    <PersonSelect
                      label="Team"
                      name="teams_team"
                      items={teamItems}
                      value={team}
                      onChange={setTeam}
                      empty="Più tardi"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Account Microsoft non collegato: crea il canale dopo dalla scheda File del progetto, oppure{" "}
                      <a href="/api/microsoft/login?next=/progetti/nuovo" className="text-primary hover:underline">
                        collega l&apos;account
                      </a>{" "}
                      (la pagina si ricarica e i dati inseriti si perdono).
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </fieldset>

          {/* 4. Riepilogo */}
          <fieldset ref={(el) => void (fieldsets.current[3] = el)} hidden={step !== 3} className="min-w-0">
            <Card>
              <CardHeader>
                <CardTitle>Riepilogo</CardTitle>
                <CardDescription>Controlla e crea: quello che manca si completa dopo dalla pagina del progetto.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="grid gap-6 lg:grid-cols-3">
                  {summary.map((group) => (
                    <section key={group.title} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">{group.title}</h3>
                        <Button type="button" variant="ghost" size="sm" onClick={() => goTo(group.step)}>
                          Modifica
                        </Button>
                      </div>
                      <SummaryRows rows={group.rows} />
                    </section>
                  ))}
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Avanzate</summary>
                  <div className="mt-3 flex max-w-xs flex-col gap-2">
                    <Label htmlFor="framework_version">Versione framework</Label>
                    <Input id="framework_version" name="framework_version" defaultValue="0.8.0" required />
                  </div>
                </details>
              </CardContent>
            </Card>
          </fieldset>
        </div>

        {step < last && (
          <aside className="sticky top-6 hidden flex-col gap-4 rounded-lg border p-4 lg:flex">
            <h2 className="text-xs text-muted-foreground">Riepilogo</h2>
            {summary.map((group) => (
              <section key={group.title} className="flex flex-col gap-1.5">
                <h3 className="text-sm font-medium">{group.title}</h3>
                <SummaryRows rows={group.rows} />
              </section>
            ))}
          </aside>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || pending}
            onClick={() => goTo(step - 1)}
            className="flex-1 sm:flex-none"
          >
            Indietro
          </Button>
          {/* key diverse: altrimenti React trasforma lo stesso <button> in submit durante il clic su
              Avanti e il browser invia il form. */}
          {step < last ? (
            <Button key="avanti" type="button" onClick={next} className="flex-1 sm:flex-none">
              Avanti
            </Button>
          ) : (
            <Button key="crea" type="submit" disabled={pending} aria-busy={pending} className="flex-1 sm:flex-none">
              {pending && <Loader2 className="animate-spin" />}
              {pending ? "Creazione in corso…" : "Crea progetto"}
            </Button>
          )}
        </div>
        {pending && (
          <p className="text-xs text-muted-foreground" role="status">
            Creo il progetto{repos === "crea" ? ", le repo su GitLab" : ""}
            {team ? " e il canale Teams" : ""}: può servire fino a mezzo minuto, non chiudere la pagina.
          </p>
        )}
      </div>
    </form>
  );
}

// Passi numerati con spunta su quelli fatti; si torna a un passo già visto. Su mobile: "Passo n di m".
function Stepper({ step, reached, onSelect }: { step: number; reached: number; onSelect: (step: number) => void }) {
  return (
    <nav aria-label="Passi">
      <div className="flex flex-col gap-2 sm:hidden">
        <p className="text-sm">
          <span className="text-muted-foreground">
            Passo {step + 1} di {STEPS.length} ·
          </span>{" "}
          <span className="font-medium">{STEPS[step]}</span>
        </p>
        <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>
      <ol className="hidden items-center gap-2 sm:flex">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <button
              type="button"
              disabled={i > reached}
              aria-current={i === step ? "step" : undefined}
              onClick={() => onSelect(i)}
              className="flex items-center gap-2 text-sm text-muted-foreground enabled:hover:text-foreground disabled:opacity-50 aria-[current=step]:font-medium aria-[current=step]:text-foreground"
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                  i === step ? "border-primary bg-primary text-primary-foreground" : i < reached || i < step ? "border-primary text-primary" : ""
                }`}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className="whitespace-nowrap">{label}</span>
            </button>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function SummaryRows({ rows }: { rows: (string | undefined)[][] }) {
  return (
    <dl className="flex flex-col gap-1.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className={value ? "break-words" : "text-muted-foreground"}>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

// Scelta di una persona cercando per nome, cognome o email: ogni parola scritta deve comparire,
// in qualsiasi ordine. Scelta la persona, il campo mostra lei e una X per toglierla.
function PersonPicker({
  label,
  name,
  people,
  value,
  onChange,
}: {
  label: string;
  name: string;
  people: Person[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const chosen = people.find((p) => p.id === value);
  const words = query.trim().toLowerCase().split(/\s+/);
  // Campo vuoto: tutte le persone; scrivendo si filtra.
  const matches = people.filter((p) => words.every((w) => `${p.name} ${p.email}`.toLowerCase().includes(w)));
  const choose = (id: string) => {
    onChange(id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${name}-search`}>{label}</Label>
      <input type="hidden" name={name} value={value ?? ""} />
      {chosen ? (
        <div className="flex h-9 items-center justify-between gap-2 rounded-lg border px-3 text-sm">
          <span className="min-w-0 truncate">
            {chosen.name} <span className="text-xs text-muted-foreground">{chosen.email}</span>
          </span>
          <Button type="button" variant="ghost" size="icon" aria-label={`Togli ${chosen.name}`} onClick={() => onChange(null)}>
            <X />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <Input
            id={`${name}-search`}
            type="search"
            placeholder="Cerca per nome, cognome o email…"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              // Invio sceglie il primo risultato invece di andare avanti nel wizard.
              if (e.key === "Enter") {
                e.preventDefault();
                if (matches[0]) choose(matches[0].id);
              }
            }}
          />
          {open && (
            <ul className="max-h-48 overflow-y-auto rounded-md border">
              {matches.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">Nessuna persona trovata.</li>
              ) : (
                matches.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      // mousedown: sceglie prima che il blur del campo chiuda l'elenco.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        choose(p.id);
                      }}
                      className="w-full truncate px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      {p.name} <span className="text-xs text-muted-foreground">{p.email}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Select facoltativo con la voce vuota in cima (usato per persone e Team).
function PersonSelect({
  label,
  name,
  items,
  value,
  onChange,
  empty = "Da assegnare dopo",
}: {
  label: string;
  name: string;
  items: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
  empty?: string;
}) {
  const all = [{ value: "", label: empty }, ...items];
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select name={name} items={all} value={value ?? ""} onValueChange={(v) => onChange(v || null)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {all.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
