"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, Pencil, SlidersHorizontal, X } from "lucide-react";
import { cn } from "cn";
import { parse } from "yaml";
import { saveDocumentAction } from "./actions";
import { ApprovalActions } from "./approval-actions";
import { DocumentDetails, toText } from "./document-details";
import { DocumentOutline } from "./document-outline";
import { MilkdownEditor } from "./milkdown-editor";
import { DocumentStateBadge } from "@/components/document-state-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Gate } from "@/lib/gates";
import { changedBlocks, spliceMarkdown } from "@/lib/markdown-splice";
import { QUESTION_STATUS_LABEL, questionsOf, statusOf, type QuestionStatus } from "@/lib/questions";
import { Markdown } from "@/components/markdown";

const CONTENT_ID = "contenuto-documento";

// Pallino dello stato di una D[N] nel pannello, con i colori dei riquadri nel testo.
const QUESTION_DOT: Record<QuestionStatus, string> = {
  aperta: "bg-(--state-complete-border)",
  rimandata: "bg-(--state-todo-border)",
  da_applicare: "bg-(--state-progress-border)",
  da_correggere: "bg-destructive",
};

// baseline: testo dell'editor da cui è partita la bozza, per ritrovare cosa ha cambiato l'utente.
type Draft = { baseCommit: string; baseline: string; body: string; savedAt: string };

const MESSAGE_LEAVE = "Hai modifiche non salvate. Uscire senza salvarle?";
const dateTimeFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" });

// "2026-12-12" → "12/12/2026"; altri formati restano come sono.
const formatDate = (value: unknown) => {
  const text = toText(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : text;
};

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

// Lettura e modifica dello stesso documento nella stessa pagina: il testo con l'editor visuale,
// i dati chiave del frontespizio sotto il titolo e il resto nella finestra «Tutti i dettagli».
// Il server la rimonta (key) a ogni nuova versione salvata.
export function DocumentWorkspace(props: {
  projectId: string;
  path: string;
  title: string;
  frontMatterSource: string | null;
  body: string | null;
  lastCommitId: string;
  canEdit: boolean;
  canApprove: boolean;
  gate: Gate;
  // Esito dell'ultima decisione di approvazione, con il prossimo documento della coda.
  outcome: { esito: "approvato" | "modifiche"; next: { title: string; project: string; href: string } | null } | null;
  readView: ReactNode;
  versionView: ReactNode | null;
  // Il primo titolo del testo coincide con il titolo della pagina: in lettura non si ripete.
  hideFirstHeading: boolean;
  breadcrumb: ReactNode;
  updated: string | null;
  tree: ReactNode;
  history: ReactNode;
  // Esporta: scarica il documento e gestisce la sua copia su Teams.
  exportMenu: ReactNode;
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

  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(Boolean(props.versionView));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [bodyDirty, setBodyDirty] = useState(false);
  const [resume, setResume] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  // Bozza partita da una versione precedente: le parti cambiate dall'utente, da riapplicare.
  const [mine, setMine] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ error: string; conflict?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const editor = useRef<{ baseline: string; read: () => string } | null>(null);
  const leaving = useRef(false);
  const headerRef = useRef<HTMLElement>(null);

  // Aprendo una versione dalla cronologia l'editor si chiude.
  const isEditing = editing && !props.versionView;
  const dirty = isEditing && bodyDirty;

  // Bozza rimasta in questo browser (salvataggio non riuscito, pagina chiusa, conflitto).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage esiste solo nel browser
      if (saved) setDraft(JSON.parse(saved) as Draft);
    } catch {}
  }, [draftKey]);

  function storeDraft(body: string) {
    const baseline = editor.current?.baseline ?? originalBody;
    try {
      if (body === baseline) return localStorage.removeItem(draftKey);
      const value: Draft = { baseCommit: props.lastCommitId, baseline, body, savedAt: new Date().toISOString() };
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

  function startEditing(fromDraft: Draft | null) {
    setResume(fromDraft?.body ?? null);
    setBodyDirty(false);
    setResult(null);
    setEditing(true);
  }

  // Il documento è cambiato dopo la bozza: si modifica la versione nuova e si mostrano a fianco
  // solo le parti cambiate dall'utente, così non si cancellano le modifiche degli altri.
  function startFromStaleDraft(stale: Draft) {
    setMine(changedBlocks(stale.baseline, stale.body));
    startEditing(null);
  }

  function cancel() {
    if (dirty && !confirm("Annullare le modifiche non salvate?")) return;
    clearDraft();
    editor.current = null;
    setMine(null);
    setEditing(false);
  }

  function bodyText() {
    if (!bodyDirty || !editor.current) return props.body ?? "";
    const current = editor.current.read();
    const spliced = spliceMarkdown(originalBody, editor.current.baseline, current) ?? current;
    return crlf ? spliced.replace(/\n/g, "\r\n") : spliced;
  }

  function save() {
    const body = bodyText();
    const yamlText = props.frontMatterSource;
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

  // Dati chiave sempre visibili sotto il titolo.
  const hasFront = props.frontMatterSource !== null;
  const state = front.stato ? String(front.stato) : null;
  const owner = [toText(front.autore), front.ruolo_owner ? `(${toText(front.ruolo_owner)})` : ""].filter(Boolean).join(" ");
  const deadline = toText(front.scadenza);
  const overdue =
    /^\d{4}-\d{2}-\d{2}$/.test(deadline) &&
    deadline < new Date().toISOString().slice(0, 10) &&
    state !== "Completo" &&
    state !== "Approvato";
  const approval = front.approvato_da
    ? `${toText(front.approvato_da)}${front.approvato_il ? ` il ${formatDate(front.approvato_il)}` : ""}`
    : null;
  const meta = [front.versione ? `v${toText(front.versione).replace(/^v/, "")}` : null, props.updated].filter(Boolean);

  const showHistory = historyOpen;
  // Domande D[N] del testo corrente (non di una versione aperta dalla cronologia).
  const questions = useMemo(() => (props.versionView ? [] : questionsOf(props.body ?? "")), [props.body, props.versionView]);
  const count = (status: QuestionStatus) => questions.filter((q) => statusOf(q) === status).length;
  const questionSummary = [
    [count("da_correggere"), "da correggere", "da correggere"],
    [count("aperta"), "aperta", "aperte"],
    [count("da_applicare"), "da applicare", "da applicare"],
    [count("rimandata"), "rimandata", "rimandate"],
  ]
    .filter(([n]) => n)
    .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`)
    .join(" · ");
  // Il link della testata porta alla prima domanda che chiede un intervento.
  const firstQuestion = (
    questions.find((q) => ["da_correggere", "aperta"].includes(statusOf(q))) ?? questions[0]
  )?.id.toLowerCase();
  // Clic su "Risposta da applicare · copia prompt" nel testo: copia la richiesta per Claude.
  const copyAnswersPrompt = async (event: React.MouseEvent) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-copy-prompt]");
    if (!button) return;
    const prompt = button.dataset.copyPrompt!;
    // Senza permesso sugli appunti (browser o pagina non sicura) il testo si copia a mano.
    const ok = await navigator.clipboard.writeText(prompt).then(
      () => true,
      () => false,
    );
    if (!ok) return window.prompt("Copia il prompt e incollalo in Claude:", prompt);
    const label = button.textContent;
    button.textContent = "Prompt copiato";
    setTimeout(() => (button.textContent = label), 1500);
  };
  // Porta alla domanda appena sotto l'intestazione fissa (alta quanto il titolo va a capo) e la
  // fa lampeggiare per un attimo.
  const goToQuestion = (event: React.MouseEvent, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - (headerRef.current?.offsetHeight ?? 0) - 16;
    window.scrollTo({ top, behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
    target.animate(
      [
        { outline: "2px solid var(--state-complete-border)", outlineOffset: "6px" },
        { outline: "2px solid transparent", outlineOffset: "6px" },
      ],
      { duration: 1800, delay: 300, easing: "ease-in" },
    );
  };

  // Altezza dell'intestazione fissa in --doc-header-h: la barra dell'editor si ancora subito sotto.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(() =>
      header.parentElement!.style.setProperty("--doc-header-h", `${header.offsetHeight}px`),
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <nav aria-label="Documenti del progetto" className="hidden w-56 shrink-0 xl:block">
        <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">{props.tree}</div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header ref={headerRef} className="sticky top-0 z-20 -mx-2 flex flex-col gap-1 border-b bg-background px-2 pt-2 pb-3">
          {props.breadcrumb}
          <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
            <h1 className="min-w-0 flex-1 basis-80 text-2xl font-semibold">{props.title}</h1>
            <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">
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
                    variant={showHistory ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setHistoryOpen(!historyOpen)}
                  >
                    <History />
                    Cronologia
                  </Button>
                  {!props.versionView && props.exportMenu}
                  {!props.versionView && props.body !== null && (
                    <ApprovalActions
                      projectId={props.projectId}
                      path={props.path}
                      lastCommitId={props.lastCommitId}
                      state={state}
                      canEdit={props.canEdit}
                      canApprove={props.canApprove}
                      gate={props.gate}
                    />
                  )}
                  {props.canEdit && !props.versionView && (
                    <Button size="sm" onClick={() => startEditing(null)}>
                      <Pencil />
                      Modifica testo
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          {(hasFront || meta.length > 0) && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
              {hasFront && (
                <dl className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <Property label="Stato">
                    <DocumentStateBadge state={state} />
                  </Property>
                  <Property label="Owner">{owner || <span className="text-muted-foreground">—</span>}</Property>
                  <Property label="Scadenza">
                    {deadline ? (
                      <span className={cn(overdue && "font-medium text-destructive")}>
                        {formatDate(deadline)}
                        {overdue && " · scaduta"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Property>
                  <Property label="Approvazione">
                    {approval ?? (
                      <span className="text-muted-foreground">
                        {state === "Completo" ? `In attesa di ${props.gate.approver}` : "Da approvare"}
                      </span>
                    )}
                  </Property>
                  {questions.length > 0 && !isEditing && (
                    <Property label="Domande">
                      <a
                        href={`#${firstQuestion}`}
                        onClick={(e) => goToQuestion(e, firstQuestion)}
                        className="hover:underline"
                      >
                        {questionSummary}
                      </a>
                    </Property>
                  )}
                </dl>
              )}
              {meta.length > 0 && <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>}
              {hasFront && (
                <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setDetailsOpen(true)}>
                  <SlidersHorizontal />
                  Tutti i dettagli
                </Button>
              )}
            </div>
          )}
        </header>

        {hasFront && props.body !== null && (
          <DocumentDetails
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            projectId={props.projectId}
            path={props.path}
            lastCommitId={props.lastCommitId}
            frontMatterSource={props.frontMatterSource!}
            body={props.body}
            front={front}
            canApprove={props.canApprove}
            readOnlyReason={
              !props.canEdit
                ? "Non hai i permessi per modificare questo documento."
                : isEditing
                  ? "Stai modificando il testo: salvalo o annulla per cambiare i dettagli."
                  : null
            }
          />
        )}

        {props.outcome && !isEditing && (
          <Alert>
            <AlertTitle>
              {props.outcome.esito === "approvato" ? "Documento approvato." : "Modifiche richieste."}
            </AlertTitle>
            <AlertDescription>
              {props.outcome.next ? (
                <span>
                  Prossimo da approvare:{" "}
                  <Link href={props.outcome.next.href} className="font-medium text-foreground hover:underline">
                    {props.outcome.next.title} · {props.outcome.next.project} →
                  </Link>
                </span>
              ) : (
                <span>
                  Non hai altri documenti da approvare.{" "}
                  <Link href="/approvazioni" className="text-foreground hover:underline">
                    Vai alle Approvazioni
                  </Link>
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {isEditing && state === "Approvato" && (
          <Alert>
            <AlertTitle>Il documento è Approvato</AlertTitle>
            <AlertDescription>
              Salvando una modifica al testo il documento torna In corso e va approvato di nuovo.
            </AlertDescription>
          </Alert>
        )}

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
            <AlertTitle>Hai una bozza non salvata del {dateTimeFormat.format(new Date(draft.savedAt))}</AlertTitle>
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
              {mine.length === 0 && "Nessuna differenza da riportare."}
              {mine.map((block, i) => (
                <div key={i} className="rounded-md border p-2 text-foreground">
                  <Markdown>{block}</Markdown>
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* overflow-visible: con overflow-hidden la barra dell'editor non resterebbe ancorata */}
        <Card className="overflow-visible">
          <CardContent>
            {props.versionView ??
              (isEditing && props.body !== null ? (
                <MilkdownEditor
                  initial={originalBody}
                  draft={resume}
                  onReady={(baseline, read) => {
                    editor.current = { baseline, read };
                    setBodyDirty(read() !== baseline);
                  }}
                  onChange={(markdown) => {
                    if (!editor.current) return;
                    setBodyDirty(markdown !== editor.current.baseline);
                    storeDraft(markdown);
                  }}
                />
              ) : (
                <div
                  id={CONTENT_ID}
                  className={cn(props.hideFirstHeading && "[&>h1:first-child]:hidden")}
                  onClick={copyAnswersPrompt}
                >
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

      {/* A destra: l'indice delle sezioni o la cronologia. In modifica l'indice non c'è. */}
      <aside className={cn("w-full shrink-0 lg:w-72", showHistory ? "block" : isEditing ? "hidden" : "hidden xl:block")}>
        <div className="sticky top-8 flex max-h-[calc(100vh-4rem)] flex-col gap-3 overflow-y-auto">
          {!showHistory && !isEditing && questions.length > 0 && (
            <>
              <h2 className="text-sm font-semibold">Domande</h2>
              <ul className="flex flex-col gap-0.5 text-sm">
                {questions.map((q) => (
                  <li key={q.id}>
                    <a
                      href={`#${q.id.toLowerCase()}`}
                      onClick={(e) => goToQuestion(e, q.id.toLowerCase())}
                      title={QUESTION_STATUS_LABEL[statusOf(q)]}
                      className="flex items-center gap-2 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <span
                        aria-hidden
                        className={cn("size-2 shrink-0 rounded-full", QUESTION_DOT[statusOf(q)])}
                      />
                      <span className="truncate">
                        {q.id} · {q.title}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{showHistory ? "Cronologia" : "In questa pagina"}</h2>
            {historyOpen && (
              <Button variant="ghost" size="icon-sm" aria-label="Chiudi la cronologia" onClick={() => setHistoryOpen(false)}>
                <X />
              </Button>
            )}
          </div>
          {showHistory ? props.history : !isEditing && <DocumentOutline containerId={CONTENT_ID} />}
        </div>
      </aside>
    </div>
  );
}
