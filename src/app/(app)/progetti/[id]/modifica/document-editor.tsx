"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { parse, parseDocument, stringify } from "yaml";
import { saveDocumentAction } from "./actions";
import { Markdown } from "@/components/markdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Campi gestiti dal flusso di approvazione (milestone 3) o dallo schema: solo lettura qui.
const LOCKED = new Set(["versione_frontespizio", "approvato_da", "approvato_il", "versione_approvata", "evidenza_approvazione"]);
const STATES = ["Da fare", "In corso", "Completo"].map((s) => ({ value: s, label: s }));

// Tema con i token del design system (i temi di @uiw hanno colori fissi).
const theme = EditorView.theme(
  {
    "&": { backgroundColor: "var(--background)", color: "var(--foreground)", height: "100%" },
    ".cm-content": { fontFamily: "var(--font-mono)", caretColor: "var(--foreground)" },
    ".cm-gutters": { backgroundColor: "var(--card)", color: "var(--muted-foreground)", border: "none" },
    ".cm-activeLineGutter": { backgroundColor: "var(--muted)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "var(--accent)" },
    "&.cm-focused": { outline: "none" },
  },
  { dark: true },
);
const extensions = [markdown(), EditorView.lineWrapping];

type Value = string | number | boolean | null | Value[];
const toText = (value: unknown) =>
  value === null || value === undefined ? "" : Array.isArray(value) ? value.join(", ") : String(value);

// Riporta il testo del form al tipo originale del campo, così i campi non toccati non cambiano.
function fromText(text: string, original: unknown): Value {
  if (text.trim() === "") return null;
  if (Array.isArray(original)) return text.split(",").map((s) => s.trim()).filter(Boolean);
  if (typeof original === "number" && !Number.isNaN(Number(text))) return Number(text);
  return text;
}

export function DocumentEditor(props: {
  projectId: string;
  path: string;
  viewHref: string;
  frontMatterSource: string | null;
  body: string;
  lastCommitId: string;
}) {
  const newline = props.body.includes("\r\n") || props.frontMatterSource?.includes("\r\n") ? "\r\n" : "\n";
  const [source, setSource] = useState(props.frontMatterSource);
  const original = useMemo(() => (source ? (parse(source) as Record<string, unknown>) : {}), [source]);
  const [fields, setFields] = useState(() => Object.fromEntries(Object.entries(original).map(([k, v]) => [k, toText(v)])));
  const [body, setBody] = useState(props.body);
  const [message, setMessage] = useState("");
  const [lastCommitId, setLastCommitId] = useState(props.lastCommitId);
  const [result, setResult] = useState<{ error: string | null; conflict?: boolean; saved?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const editable = Object.entries(original).filter(
    ([key, value]) =>
      !LOCKED.has(key) && !(key === "stato" && value === "Approvato") && (typeof value !== "object" || value === null || Array.isArray(value)),
  );
  const locked = Object.entries(original).filter(([key]) => !editable.some(([k]) => k === key));

  // Sostituisce nel YAML originale solo il testo dei valori cambiati: commenti, allineamenti e
  // tutto il resto restano identici.
  function frontMatterText() {
    if (source === null) return null;
    const doc = parseDocument(source);
    const edits = editable
      .filter(([key, value]) => fields[key] !== toText(value))
      .map(([key, value]) => {
        const next = fromText(fields[key], value);
        const range = (doc.get(key, true) as { range?: [number, number, number] } | undefined)?.range;
        const text = next === null ? "" : stringify(next, { collectionStyle: "flow", flowCollectionPadding: false }).trimEnd();
        return { start: range![0], end: range![1], text };
      })
      .sort((a, b) => b.start - a.start);
    let result = source;
    for (const { start, end, text } of edits) {
      // Valore vuoto ("gate:"): serve uno spazio dopo i due punti.
      const prefix = start === end && text && result[start - 1] === ":" ? " " : "";
      result = result.slice(0, start) + prefix + text + result.slice(end);
    }
    return result;
  }

  function save() {
    const yamlText = frontMatterText();
    const content = yamlText === null ? body : `---${newline}${yamlText}${newline}---${newline}${body}`;
    startTransition(async () => {
      const response = await saveDocumentAction({ projectId: props.projectId, path: props.path, content, lastCommitId, message });
      if (response.lastCommitId) {
        setLastCommitId(response.lastCommitId);
        setSource(yamlText);
        setMessage("");
      }
      setResult({ error: response.error, conflict: response.conflict, saved: response.lastCommitId });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {result?.conflict && (
        <Alert variant="destructive">
          <AlertTitle>{result.error}</AlertTitle>
          <AlertDescription>
            Le tue modifiche non sono state salvate. Copiale, poi ricarica la pagina per partire dalla versione
            aggiornata.
          </AlertDescription>
        </Alert>
      )}

      {source !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Frontespizio</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {editable.map(([key]) =>
                key === "stato" ? (
                  <div key={key} className="flex flex-col gap-2">
                    <Label>stato</Label>
                    <Select items={STATES} value={fields.stato} onValueChange={(v) => setFields({ ...fields, stato: String(v) })}>
                      <SelectTrigger aria-label="stato">
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
                  </div>
                ) : (
                  <div key={key} className="flex flex-col gap-2">
                    <Label htmlFor={`fm-${key}`}>{key}</Label>
                    <Input
                      id={`fm-${key}`}
                      value={fields[key]}
                      onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
                    />
                  </div>
                ),
              )}
            </div>
            {locked.length > 0 && (
              <dl className="grid gap-3 border-t pt-4 sm:grid-cols-3">
                {locked.map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <dt className="text-xs text-muted-foreground">{key} (sola lettura)</dt>
                    <dd className="text-sm">{toText(value) || "—"}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-h-96">
          <CardHeader>
            <CardTitle>Sorgente</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <CodeMirror
              value={body}
              onChange={setBody}
              theme={theme}
              extensions={extensions}
              basicSetup={{ syntaxHighlighting: false, highlightActiveLine: false }}
              className="h-full overflow-hidden rounded-md border"
              aria-label="Testo Markdown"
            />
          </CardContent>
        </Card>
        <Card className="min-h-96">
          <CardHeader>
            <CardTitle>Anteprima</CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown>{body}</Markdown>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Aggiorna ${props.path.split("/").pop()}`}
          aria-label="Messaggio di commit"
          maxLength={200}
          className="w-96"
        />
        <Button onClick={save} disabled={pending}>
          {pending ? "Salvataggio…" : "Salva su GitLab"}
        </Button>
        <Link href={props.viewHref} className="text-sm text-muted-foreground hover:underline">
          Chiudi
        </Link>
        {result?.error && !result.conflict && <span className="text-sm text-destructive">{result.error}</span>}
        {result?.saved && (
          <span className="text-sm text-muted-foreground">Salvato · commit {result.saved.slice(0, 8)}</span>
        )}
      </div>
    </div>
  );
}
