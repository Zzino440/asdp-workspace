"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { History, Info, Pencil, X } from "lucide-react";
import { cn } from "cn";
import { parse, parseDocument, stringify } from "yaml";
import { saveDocumentAction } from "./actions";
import { DocumentOutline } from "./document-outline";
import { MilkdownEditor } from "./milkdown-editor";
import { DocumentStateBadge } from "@/components/document-state-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FRONT_MATTER_LABELS } from "@/lib/labels";
import { changedBlocks, spliceMarkdown } from "@/lib/markdown-splice";
import { Markdown } from "@/components/markdown";

// Campi gestiti dal flusso di approvazione (milestone 3) o dallo schema: solo lettura qui.
const LOCKED = new Set(["versione_frontespizio", "approvato_da", "approvato_il", "versione_approvata", "evidenza_approvazione"]);
const STATES = ["Da fare", "In corso", "Completo"].map((s) => ({ value: s, label: s }));
const DATE_FIELDS = new Set(["creato_il", "scadenza", "completato_il"]);
// Campi del frontespizio utili a chi legge; gli altri stanno in "Dati tecnici".
const KEY_FIELDS = ["stato", "versione", "autore", "ruolo_owner", "scadenza", "creato_il", "completato_il", "approvato_da", "approvato_il"];
const CONTENT_ID = "contenuto-documento";

type Panel = "dettagli" | "cronologia" | null;

type Value = string | number | boolean | null | Value[];
// baseline: testo dell'editor da cui è partita la bozza, per ritrovare cosa ha cambiato l'utente.
type Draft = { baseCommit: string; baseline: string; body: string; fields: Record<string, string>; savedAt: string };

const label = (key: string) => FRONT_MATTER_LABELS[key] ?? key;
const toText = (value: unknown) =>
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

const MESSAGE_LEAVE = "Hai modifiche non salvate. Uscire senza salvarle?";

// Lettura e modifica dello stesso documento nella stessa pagina: il corpo con l'editor visuale,
// il frontespizio nel pannello Dettagli. Il server la rimonta (key) a ogni nuova
// versione salvata.
export function DocumentWorkspace(props: {
  projectId: string;
  path: string;
  title: string;
  frontMatterSource: string | null;
  body: string | null;
  lastCommitId: string;
  canEdit: boolean;
  readView: ReactNode;
  versionView: ReactNode | null;
  // Il primo titolo del testo coincide con il titolo della pagina: in lettura non si ripete.
  hideFirstHeading: boolean;
  breadcrumb: ReactNode;
  updated: string | null;
  tree: ReactNode;
  history: ReactNode;
}) {
  const router = useRouter();
  const draftKey = `asdp-bozza:${props.projectId}:${props.path}`;
  const crlf = (props.body ?? "").includes("\r\n") || Boolean(props.frontMatterSource?.includes("\r\n"));
  const newline = crlf ? "\r\n" : "\n";
  const originalBody = useMemo(() => (props.body ?? "").replace(/\r\n/g, "\n"), [props.body]);
  const front = useMemo(
    () => (props.frontMatterSource ? (parse(props.frontMatterSource) as Record<string, unknown>) : {}),
    [props.frontMatterSource],
  );
  const initialFields = useMemo(() => Object.fromEntries(Object.entries(front).map(([k, v]) => [k, toText(v)])), [front]);

  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<Panel>(props.versionView ? "cronologia" : null);
  const [fields, setFields] = useState(initialFields);
  const [bodyDirty, setBodyDirty] = useState(false);
  const [resume, setResume] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  // Bozza partita da una versione precedente: le parti cambiate dall'utente, da riapplicare.
  const [mine, setMine] = useState<{ blocks: string[]; fields: [string, string][] } | null>(null);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ error: string; conflict?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const editor = useRef<{ baseline: string; read: () => string } | null>(null);
  const leaving = useRef(false);

  const editable = Object.entries(front).filter(
    ([key, value]) =>
      !LOCKED.has(key) && !(key === "stato" && value === "Approvato") && (typeof value !== "object" || value === null || Array.isArray(value)),
  );
  const fieldsDirty = editable.some(([key]) => fields[key] !== initialFields[key]);
  // Aprendo una versione dal pannello l'editor si chiude.
  const isEditing = editing && !props.versionView;
  const dirty = isEditing && (bodyDirty || fieldsDirty);

  // Bozza rimasta in questo browser (salvataggio non riuscito, pagina chiusa, conflitto).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage esiste solo nel browser
      if (saved) setDraft(JSON.parse(saved) as Draft);
    } catch {}
  }, [draftKey]);

  function storeDraft(body: string, nextFields: Record<string, string>) {
    const baseline = editor.current?.baseline ?? originalBody;
    const unchanged = body === baseline && editable.every(([key]) => nextFields[key] === initialFields[key]);
    try {
      if (unchanged) return localStorage.removeItem(draftKey);
      const value: Draft = { baseCommit: props.lastCommitId, baseline, body, fields: nextFields, savedAt: new Date().toISOString() };
      localStorage.setItem(draftKey, JSON.stringify(value));
    } catch {}
  }
  function clearDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setDraft(null);
  }

  // Uscita con modifiche non salvate: chiusura/ricarica della pagina e link interni.
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!leaving.current) e.preventDefault();
    };
    const click = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest("a[href]");
      if (!link || link.getAttribute("href")?.startsWith("#") || confirm(MESSAGE_LEAVE)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);

  function setField(key: string, value: string) {
    const next = { ...fields, [key]: value };
    setFields(next);
    storeDraft(editor.current?.read() ?? originalBody, next);
  }

  function startEditing(fromDraft: Draft | null) {
    setResume(fromDraft?.body ?? null);
    setFields(fromDraft ? { ...initialFields, ...fromDraft.fields } : initialFields);
    setBodyDirty(false);
    setResult(null);
    setEditing(true);
  }

  // Il documento è cambiato dopo la bozza: si modifica la versione nuova e si mostrano a fianco
  // solo le parti cambiate dall'utente, così non si cancellano le modifiche degli altri.
  function startFromStaleDraft(stale: Draft) {
    setMine({
      blocks: changedBlocks(stale.baseline, stale.body),
      fields: Object.entries(stale.fields).filter(([key, value]) => key in initialFields && value !== initialFields[key]),
    });
    startEditing(null);
  }

  function cancel() {
    if (dirty && !confirm("Annullare le modifiche non salvate?")) return;
    clearDraft();
    editor.current = null;
    setMine(null);
    setEditing(false);
    setFields(initialFields);
  }

  // Sostituisce nel YAML originale solo il testo dei valori cambiati: commenti, allineamenti e
  // tutto il resto restano identici.
  function frontMatterText() {
    const source = props.frontMatterSource;
    if (source === null) return null;
    const doc = parseDocument(source);
    const edits = editable
      .filter(([key]) => fields[key] !== initialFields[key])
      .map(([key, value]) => {
        const next = fromText(fields[key], value);
        const range = (doc.get(key, true) as { range?: [number, number, number] } | undefined)?.range;
        const text = next === null ? "" : stringify(next, { collectionStyle: "flow", flowCollectionPadding: false }).trimEnd();
        return { start: range![0], end: range![1], text };
      })
      .sort((a, b) => b.start - a.start);
    let out = source;
    for (const { start, end, text } of edits) {
      // Valore vuoto ("gate:"): serve uno spazio dopo i due punti; svuotando si toglie lo spazio.
      const prefix = start === end && text && out[start - 1] === ":" ? " " : "";
      const from = !text && out[start - 1] === " " && out[start - 2] === ":" ? start - 1 : start;
      out = out.slice(0, from) + prefix + text + out.slice(end);
    }
    return out;
  }

  function bodyText() {
    if (!bodyDirty || !editor.current) return props.body ?? "";
    const current = editor.current.read();
    const spliced = spliceMarkdown(originalBody, editor.current.baseline, current) ?? current;
    return crlf ? spliced.replace(/\n/g, "\r\n") : spliced;
  }

  function save() {
    const yamlText = frontMatterText();
    const body = bodyText();
    const content = yamlText === null ? body : `---${newline}${yamlText}${newline}---${newline}${body}`;
    startTransition(async () => {
      const response = await saveDocumentAction({
        projectId: props.projectId,
        path: props.path,
        content,
        lastCommitId: props.lastCommitId,
        message,
      });
      if (response.error) {
        setResult({ error: response.error, conflict: response.conflict });
        return;
      }
      clearDraft();
      leaving.current = true;
      router.refresh();
    });
  }


  // Pannello a destra: Dettagli, Cronologia o (di default) l'indice delle sezioni. In modifica
  // l'indice non c'è e al suo posto si aprono i Dettagli.
  const shownPanel = panel ?? (isEditing ? "dettagli" : null);
  const togglePanel = (next: Panel) => setPanel(panel === next ? null : next);
  // I dati di approvazione compaiono solo quando ci sono.
  const keyFields = KEY_FIELDS.filter((key) => key in front && (!key.startsWith("approvato") || toText(front[key])));
  const otherFields = Object.keys(front).filter((key) => !KEY_FIELDS.includes(key));
  const isEditable = (key: string) => editable.some(([k]) => k === key);

  function field(key: string) {
    if (!isEditing || !isEditable(key))
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
          <Select items={STATES} value={fields.stato} onValueChange={(v) => setField("stato", String(v))}>
            <SelectTrigger id={`fm-${key}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATES.map((s) => (
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
            onChange={(e) => setField(key, e.target.value)}
          />
        )}
      </div>
    );
  }

  const meta = [
    front.versione ? `v${String(front.versione).replace(/^v/, "")}` : null,
    front.autore ? `${String(front.autore)}${front.ruolo_owner ? ` (${String(front.ruolo_owner)})` : ""}` : null,
    props.updated,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <nav aria-label="Documenti del progetto" className="hidden w-56 shrink-0 xl:block">
        <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">{props.tree}</div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="sticky top-0 z-20 -mx-2 flex flex-col gap-1 bg-background px-2 pt-2 pb-3">
          {props.breadcrumb}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{props.title}</h1>
            <div className="ml-auto flex items-center gap-2">
              {isEditing ? (
                <>
                  {dirty && <span className="text-xs text-muted-foreground">Modifiche non salvate</span>}
                  <Button variant="ghost" size="sm" onClick={cancel} disabled={pending}>
                    Annulla
                  </Button>
                  <Button size="sm" onClick={save} disabled={pending || !dirty}>
                    {pending ? "Salvataggio…" : "Salva"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant={shownPanel === "dettagli" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => togglePanel("dettagli")}
                  >
                    <Info />
                    Dettagli
                  </Button>
                  <Button
                    variant={shownPanel === "cronologia" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => togglePanel("cronologia")}
                  >
                    <History />
                    Cronologia
                  </Button>
                  {props.canEdit && !props.versionView && (
                    <Button size="sm" onClick={() => startEditing(null)}>
                      <Pencil />
                      Modifica
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {front.stato ? <DocumentStateBadge state={String(front.stato)} /> : null}
            {meta.map((item, i) => (
              <span key={item} className={cn((i > 0 || Boolean(front.stato)) && "before:mr-2 before:content-['·']")}>
                {item}
              </span>
            ))}
          </div>
        </header>

        {result && (
          <Alert variant="destructive">
            <AlertTitle>{result.error}</AlertTitle>
            {result.conflict && (
              <AlertDescription className="flex flex-col items-start gap-2">
                Qualcuno ha salvato una nuova versione mentre lavoravi. Le tue modifiche sono conservate in questo
                browser: ricarica la pagina e scegli «Modifica con la mia bozza a fianco».
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    leaving.current = true;
                    window.location.reload();
                  }}
                >
                  Ricarica
                </Button>
              </AlertDescription>
            )}
          </Alert>
        )}

        {draft && !isEditing && props.canEdit && !props.versionView && (
          <Alert>
            <AlertTitle>
              Hai una bozza non salvata del{" "}
              {new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(new Date(draft.savedAt))}
            </AlertTitle>
            {draft.baseCommit === props.lastCommitId ? (
              <AlertDescription className="flex gap-2">
                <Button size="sm" onClick={() => startEditing(draft)}>
                  Riprendi la bozza
                </Button>
                <Button size="sm" variant="ghost" onClick={clearDraft}>
                  Scarta
                </Button>
              </AlertDescription>
            ) : (
              <AlertDescription className="flex flex-col items-start gap-2">
                Nel frattempo qualcuno ha salvato una versione nuova. Apri la versione nuova: accanto
                all&apos;editor trovi le parti che avevi cambiato, da riportare dove servono.
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => startFromStaleDraft(draft)}>
                    Modifica con la mia bozza a fianco
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearDraft}>
                    Scarta
                  </Button>
                </div>
              </AlertDescription>
            )}
          </Alert>
        )}

        {isEditing && mine && (
          <Alert>
            <AlertTitle>Le tue modifiche nella bozza</AlertTitle>
            <AlertDescription className="flex w-full flex-col gap-2">
              {mine.blocks.length === 0 && mine.fields.length === 0 && "Nessuna differenza da riportare."}
              {mine.blocks.map((block, i) => (
                <div key={i} className="rounded-md border p-2 text-foreground">
                  <Markdown>{block}</Markdown>
                </div>
              ))}
              {mine.fields.map(([key, value]) => (
                <span key={key}>
                  {label(key)}: <span className="text-foreground">{value || "—"}</span>
                </span>
              ))}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent>
            {props.versionView ??
              (isEditing && props.body !== null ? (
                <MilkdownEditor
                  initial={originalBody}
                  draft={resume}
                  onReady={(baseline, read) => {
                    editor.current = { baseline, read };
                    const current = read();
                    setBodyDirty(current !== baseline);
                  }}
                  onChange={(markdown) => {
                    if (!editor.current) return;
                    setBodyDirty(markdown !== editor.current.baseline);
                    storeDraft(markdown, fields);
                  }}
                />
              ) : (
                <div id={CONTENT_ID} className={cn(props.hideFirstHeading && "[&>h1:first-child]:hidden")}>
                  {props.readView}
                </div>
              ))}
          </CardContent>
        </Card>

        {isEditing && (
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nota sulla modifica (facoltativa)"
            aria-label="Nota sulla modifica"
            maxLength={200}
            className="max-w-xl"
          />
        )}
      </div>

      <aside className={cn("w-full shrink-0 lg:w-72", shownPanel ? "block" : "hidden xl:block")}>
        <div className="sticky top-8 flex max-h-[calc(100vh-4rem)] flex-col gap-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {shownPanel === "dettagli" ? "Dettagli" : shownPanel === "cronologia" ? "Cronologia" : "In questa pagina"}
            </h2>
            {panel && (
              <Button variant="ghost" size="icon-sm" aria-label="Chiudi il pannello" onClick={() => setPanel(null)}>
                <X />
              </Button>
            )}
          </div>

          {shownPanel === "dettagli" && (
            <div className="flex flex-col gap-4">
              {keyFields.length > 0 ? (
                <dl className="flex flex-col gap-3">{keyFields.map(field)}</dl>
              ) : (
                <p className="text-sm text-muted-foreground">Questo documento non ha un frontespizio.</p>
              )}
              <details className="group rounded-md border p-3">
                <summary className="cursor-pointer text-sm text-muted-foreground select-none group-open:mb-3">
                  Dati tecnici
                </summary>
                <dl className="flex flex-col gap-3">
                  {otherFields.map(field)}
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs text-muted-foreground">File</dt>
                    <dd className="font-mono text-xs break-all">{props.path}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs text-muted-foreground">Ultimo commit</dt>
                    <dd className="font-mono text-xs">{props.lastCommitId.slice(0, 8)}</dd>
                  </div>
                </dl>
              </details>
            </div>
          )}
          {shownPanel === "cronologia" && props.history}
          {shownPanel === null && <DocumentOutline containerId={CONTENT_ID} />}
        </div>
      </aside>
    </div>
  );
}
