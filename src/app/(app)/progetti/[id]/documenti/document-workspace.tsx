"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { parse, parseDocument, stringify } from "yaml";
import { saveDocumentAction } from "./actions";
import { MilkdownEditor } from "./milkdown-editor";
import { DocumentStateBadge } from "@/components/document-state-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FRONT_MATTER_LABELS } from "@/lib/labels";
import { spliceMarkdown } from "@/lib/markdown-splice";

// Campi gestiti dal flusso di approvazione (milestone 3) o dallo schema: solo lettura qui.
const LOCKED = new Set(["versione_frontespizio", "approvato_da", "approvato_il", "versione_approvata", "evidenza_approvazione"]);
const STATES = ["Da fare", "In corso", "Completo"].map((s) => ({ value: s, label: s }));
const DATE_FIELDS = new Set(["creato_il", "scadenza", "completato_il"]);

type Value = string | number | boolean | null | Value[];
type Draft = { baseCommit: string; body: string; fields: Record<string, string>; savedAt: string };

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
// il frontespizio come form nel pannello laterale. Il server la rimonta (key) a ogni nuova
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
  aside: ReactNode;
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
  const [fields, setFields] = useState(initialFields);
  const [bodyDirty, setBodyDirty] = useState(false);
  const [resume, setResume] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
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
  const dirty = editing && (bodyDirty || fieldsDirty);

  // Bozza rimasta in questo browser (salvataggio non riuscito, pagina chiusa, conflitto).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage esiste solo nel browser
      if (saved) setDraft(JSON.parse(saved) as Draft);
    } catch {}
  }, [draftKey]);

  function storeDraft(body: string, nextFields: Record<string, string>) {
    try {
      const value: Draft = { baseCommit: props.lastCommitId, body, fields: nextFields, savedAt: new Date().toISOString() };
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

  function cancel() {
    if (dirty && !confirm("Annullare le modifiche non salvate?")) return;
    clearDraft();
    editor.current = null;
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

  const readFrontMatter = Object.entries(front).filter(([, value]) => value !== null && value !== "");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{props.title}</h1>
        <DocumentStateBadge state={front.stato ? String(front.stato) : null} />
        {dirty && <span className="text-xs text-muted-foreground">Modifiche non salvate</span>}
        <div className="ml-auto flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancel} disabled={pending}>
                Annulla
              </Button>
              <Button size="sm" onClick={save} disabled={pending || !dirty}>
                {pending ? "Salvataggio…" : "Salva"}
              </Button>
            </>
          ) : (
            props.canEdit &&
            !props.versionView && (
              <Button variant="outline" size="sm" onClick={() => startEditing(null)}>
                <Pencil />
                Modifica
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {result && (
            <Alert variant="destructive">
              <AlertTitle>{result.error}</AlertTitle>
              {result.conflict && (
                <AlertDescription className="flex flex-col items-start gap-2">
                  Qualcuno ha salvato una nuova versione mentre lavoravi. Le tue modifiche sono conservate in questo
                  browser: ricarica la pagina e scegli «Riprendi la bozza».
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

          {draft && !editing && props.canEdit && !props.versionView && (
            <Alert>
              <AlertTitle>
                Hai una bozza non salvata del{" "}
                {new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(new Date(draft.savedAt))}
              </AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-2">
                {draft.baseCommit !== props.lastCommitId &&
                  "Nel frattempo il documento è stato aggiornato: riprendendo la bozza, le parti che avevi cambiato sostituiscono quelle nuove. Controlla l'ultima versione nel pannello Versioni."}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => startEditing(draft)}>
                    Riprendi la bozza
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearDraft}>
                    Scarta
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent>
              {props.versionView ??
                (editing && props.body !== null ? (
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
                  props.readView
                ))}
            </CardContent>
          </Card>

          {editing && (
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

        <aside className="flex flex-col gap-4">
          {props.frontMatterSource !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Frontespizio</CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="flex flex-col gap-4">
                    {editable.map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-2">
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
                            placeholder={Array.isArray(value) ? "Valori separati da virgola" : undefined}
                            onChange={(e) => setField(key, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                    {Object.keys(front)
                      .filter((key) => !editable.some(([k]) => k === key))
                      .map((key) => (
                        <div key={key} className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">{label(key)} · sola lettura</span>
                          <span className="text-sm">{toText(front[key]) || "—"}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <dl className="flex flex-col gap-3">
                    {readFrontMatter.map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-0.5">
                        <dt className="text-xs text-muted-foreground">{label(key)}</dt>
                        <dd className="text-sm break-words">{toText(value)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </CardContent>
            </Card>
          )}
          {props.aside}
        </aside>
      </div>
    </div>
  );
}
