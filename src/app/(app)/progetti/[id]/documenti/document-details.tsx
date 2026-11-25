"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { saveDocumentAction } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type FieldValue as Value, setFrontMatterFields } from "@/lib/front-matter";
import { FRONT_MATTER_LABELS } from "@/lib/labels";

// Campo gestito dallo schema: sempre solo lettura qui.
const LOCKED = new Set(["versione_frontespizio"]);
// Campi di approvazione: li cambia solo chi ha il permesso Approva.
const APPROVAL = new Set(["approvato_da", "approvato_il", "versione_approvata", "evidenza_approvazione"]);
const STATES = ["Da fare", "In corso", "Completo"].map((s) => ({ value: s, label: s }));
const APPROVER_STATES = [...STATES, { value: "Approvato", label: "Approvato" }];
const DATE_FIELDS = new Set(["creato_il", "scadenza", "completato_il", "approvato_il"]);
// Campi del frontespizio GUIDA-FRONT raggruppati per tema; quelli sconosciuti vanno in "Altri campi".
const GROUPS = [
  { title: "Stato e date", keys: ["stato", "scadenza", "creato_il", "completato_il"] },
  { title: "Responsabilità", keys: ["autore", "ruolo_owner", "versione"] },
  { title: "Approvazione", keys: ["approvato_da", "approvato_il", "versione_approvata", "gate", "evidenza_approvazione"] },
  {
    title: "Identità",
    keys: [
      "titolo", "id", "progetto", "cliente", "parent", "fase_asdp", "natura_intervento", "riferimento_richiesta",
      "tipo_backlog", "urgenza", "job_size_gg", "story_points", "linked_items",
    ],
  },
  { title: "Dati tecnici", keys: ["versione_frontespizio", "template_origine", "template_versione"] },
];

export const label = (key: string) => FRONT_MATTER_LABELS[key] ?? key;
export const toText = (value: unknown) =>
  value === null || value === undefined ? "" : Array.isArray(value) ? value.join(", ") : String(value);

// Riporta il testo del form al tipo originale del campo, così i campi non toccati non cambiano.
function fromText(text: string, original: unknown): Value {
  if (text.trim() === "") return null;
  if (Array.isArray(original)) return text.split(",").map((s) => s.trim()).filter(Boolean);
  // Numero se il campo era numerico, o vuoto e il testo è un numero (es. story_points).
  const numeric = /^-?\d+(\.\d+)?$/.test(text.trim());
  if ((typeof original === "number" || original === null || original === undefined) && numeric) return Number(text);
  return text;
}

// Finestra «Tutti i dettagli»: il frontespizio completo per tema. Ha un salvataggio suo, che
// cambia solo il frontespizio e lascia il testo identico.
export function DocumentDetails(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  path: string;
  lastCommitId: string;
  frontMatterSource: string;
  body: string;
  front: Record<string, unknown>;
  canApprove: boolean;
  // null: modificabile; altrimenti il motivo per cui è in sola lettura.
  readOnlyReason: string | null;
}) {
  const router = useRouter();
  const { front } = props;
  const initial = Object.fromEntries(Object.entries(front).map(([k, v]) => [k, toText(v)]));
  const [fields, setFields] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(GROUPS[0].title);
  const [pending, startTransition] = useTransition();

  const isEditable = (key: string) =>
    props.readOnlyReason === null &&
    !LOCKED.has(key) &&
    (props.canApprove || (!APPROVAL.has(key) && !(key === "stato" && front.stato === "Approvato"))) &&
    (typeof front[key] !== "object" || front[key] === null || Array.isArray(front[key]));
  const changed = Object.keys(front).filter((key) => isEditable(key) && fields[key] !== initial[key]);

  function openChange(open: boolean) {
    if (!open && changed.length > 0 && !confirm("Chiudere senza salvare i dettagli modificati?")) return;
    if (!open) {
      setFields(initial);
      setError(null);
    }
    props.onOpenChange(open);
  }

  const frontMatterText = () =>
    setFrontMatterFields(
      props.frontMatterSource,
      Object.fromEntries(changed.map((key) => [key, fromText(fields[key], front[key])])),
    );

  function save() {
    const newline = props.body.includes("\r\n") || props.frontMatterSource.includes("\r\n") ? "\r\n" : "\n";
    const content = `---${newline}${frontMatterText()}${newline}---${newline}${props.body}`;
    startTransition(async () => {
      const response = await saveDocumentAction({
        projectId: props.projectId,
        path: props.path,
        content,
        lastCommitId: props.lastCommitId,
        message: `Aggiorna i dettagli: ${changed.map(label).join(", ")}`,
      });
      if (response.error) {
        setError(response.conflict ? `${response.error} Ricarica la pagina e riprova.` : response.error);
        return;
      }
      props.onOpenChange(false);
      router.refresh();
    });
  }

  const states = props.canApprove ? APPROVER_STATES : STATES;

  function field(key: string) {
    if (!isEditable(key))
      return (
        <div key={key} className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{label(key)}</dt>
          <dd className="text-sm break-words">{toText(front[key]) || "—"}</dd>
        </div>
      );
    return (
      <div key={key} className="flex flex-col gap-1.5">
        <Label htmlFor={`fm-${key}`}>{label(key)}</Label>
        {key === "stato" ? (
          <Select items={states} value={fields.stato} onValueChange={(v) => setFields({ ...fields, stato: String(v) })}>
            <SelectTrigger id={`fm-${key}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={`fm-${key}`}
            type={DATE_FIELDS.has(key) && /^(\d{4}-\d{2}-\d{2})?$/.test(fields[key]) ? "date" : "text"}
            value={fields[key]}
            placeholder={Array.isArray(front[key]) ? "Valori separati da virgola" : undefined}
            onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
          />
        )}
      </div>
    );
  }

  const known = new Set(GROUPS.flatMap((g) => g.keys));
  const groups = [
    ...GROUPS.map((g) => ({ title: g.title, keys: g.keys.filter((key) => key in front) })),
    { title: "Altri campi", keys: Object.keys(front).filter((key) => !known.has(key)) },
  ].filter((g) => g.keys.length > 0 || g.title === "Dati tecnici");
  const current = groups.find((g) => g.title === tab) ?? groups[0];

  return (
    <Dialog open={props.open} onOpenChange={openChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-4xl">
        <DialogHeader className="border-b p-4">
          <DialogTitle>Dettagli del documento</DialogTitle>
          <DialogDescription>
            {props.readOnlyReason ?? "Le modifiche ai dettagli si salvano come versione nuova; il testo non cambia."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[min(28rem,65vh)] flex-col sm:flex-row">
          {/* Temi: in colonna a sinistra, in riga sugli schermi stretti. */}
          <nav aria-label="Temi" className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 sm:w-48 sm:flex-col sm:border-r sm:border-b-0">
            {groups.map((group) => (
              <button
                key={group.title}
                type="button"
                onClick={() => setTab(group.title)}
                aria-current={group === current ? "true" : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm whitespace-nowrap hover:bg-muted",
                  group === current ? "bg-accent font-medium" : "text-muted-foreground",
                )}
              >
                {group.title}
                {group.keys.some((key) => changed.includes(key)) && (
                  <span className="size-1.5 rounded-full bg-primary" aria-label="modificato" />
                )}
              </button>
            ))}
          </nav>

          <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
            {current.title === "Stato e date" && front.stato === "Approvato" && props.readOnlyReason === null && !props.canApprove && (
              <Alert>
                <AlertDescription>Il documento è Approvato: lo stato si cambia dal flusso di approvazione.</AlertDescription>
              </Alert>
            )}
            <dl className="grid content-start gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {current.keys.map(field)}
              {current.title === "Dati tecnici" && (
                <>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs text-muted-foreground">Ultimo commit</dt>
                    <dd className="font-mono text-xs">{props.lastCommitId.slice(0, 8)}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:col-span-full">
                    <dt className="text-xs text-muted-foreground">File</dt>
                    <dd className="font-mono text-xs break-all">{props.path}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>

        <DialogFooter className="m-0 items-center">
          {changed.length > 0 && (
            <span className="mr-auto text-xs text-muted-foreground">
              Modificati: {changed.map(label).join(", ")}
            </span>
          )}
          <Button variant="ghost" onClick={() => openChange(false)} disabled={pending}>
            {props.readOnlyReason === null ? "Annulla" : "Chiudi"}
          </Button>
          {props.readOnlyReason === null && (
            <Button onClick={save} disabled={pending || changed.length === 0}>
              {pending ? "Salvataggio…" : "Salva"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
