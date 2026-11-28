"use client";

import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, PanelRightClose, PanelRightOpen, Pencil, SlidersHorizontal, X } from "lucide-react";
import { cn } from "cn";
import { parse } from "yaml";
import { toast } from "sonner";
import { saveDocumentAction } from "./actions";
import { AnswerQuestionDialog } from "./answer-question";
import { ApprovalActions } from "./approval-actions";
import { DocumentDetails, toText } from "./document-details";
import { DocumentOutline } from "./document-outline";
import { MilkdownEditor } from "./milkdown-editor";
import { type Anchor, anchorOf, captureAnchor, editorBlocks, readBlocks, restoreAnchor } from "./scroll-anchor";
import { DocumentStateBadge } from "@/components/document-state-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Gate } from "@/lib/gates";
import { changedBlocks, spliceMarkdown } from "@/lib/markdown-splice";
import { optionsOf, QUESTION_STATUS_LABEL, questionsOf, statusOf, tracesOf, type QuestionStatus } from "@/lib/questions";
import { Markdown } from "@/components/markdown";

const OUTLINE_COLLAPSED_KEY = "asdp:indice-ridotto";

// Punto di lettura da ritrovare in lettura dopo Salva: il salvataggio rimonta la pagina (key).
let savedAnchor: { path: string; anchor: Anchor } | null = null;
const rememberAnchor = (path: string, anchor: Anchor | null) => {
  if (anchor) savedAnchor = { path, anchor };
};
const takeAnchor = (path: string) => {
  const found = savedAnchor?.path === path ? savedAnchor.anchor : null;
  if (found) savedAnchor = null;
  return found;
};

// Pallino dello stato di una D[N] nel pannello, con i colori dei riquadri nel testo.
const QUESTION_DOT: Record<QuestionStatus, string> = {
  aperta: "bg-(--state-complete-border)",
  rimandata: "bg-(--state-todo-border)",
  da_applicare: "bg-(--state-progress-border)",
  da_correggere: "bg-destructive",
};
// Stesso colore, per il lampeggio della domanda quando ci si salta.
const QUESTION_COLOR: Record<QuestionStatus, string> = {
  aperta: "var(--state-complete-border)",
  rimandata: "var(--state-todo-border)",
  da_applicare: "var(--state-progress-border)",
  da_correggere: "var(--destructive)",
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
  // Messaggio del parser se il YAML del frontespizio non è valido.
  frontMatterError: string | null;
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
    () =>
      props.frontMatterSource && !props.frontMatterError ? (parse(props.frontMatterSource) as Record<string, unknown>) : {},
    [props.frontMatterSource, props.frontMatterError],
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
  // Testo in lettura e editor di questa pagina: niente id, Next tiene nel DOM (nascoste) le pagine
  // visitate prima e un getElementById potrebbe trovare il testo di un altro documento.
  const contentRef = useRef<HTMLDivElement>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);
  // Entrando in modifica: il punto di lettura da ritrovare nell'editor e, col doppio clic, dove
  // mettere il cursore.
  const enterAnchor = useRef<Anchor | null>(null);
  const caret = useRef<{ x: number; y: number } | null>(null);
  // Pannello di destra ridotto a una colonnina di trattini, aperto al passaggio del mouse.
  const [collapsed, setCollapsed] = useState(false);

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

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage esiste solo nel browser
      setCollapsed(localStorage.getItem(OUTLINE_COLLAPSED_KEY) === "1");
    } catch {}
  }, []);
  function toggleCollapsed(value: boolean) {
    setCollapsed(value);
    try {
      localStorage.setItem(OUTLINE_COLLAPSED_KEY, value ? "1" : "0");
    } catch {}
  }

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

  // Linea sotto cui comincia il testo visibile: intestazione fissa e, in modifica, barra dell'editor.
  function visibleLine(editingNow: boolean) {
    const header = headerRef.current?.getBoundingClientRect().bottom ?? 0;
    const toolbar = editorRootRef.current?.querySelector<HTMLElement>("[data-editor-toolbar]")?.offsetHeight ?? 0;
    return header + (editingNow ? toolbar + 12 : 0);
  }

  // at: doppio clic su un blocco del testo (punto del cursore e blocco da tenere fermo).
  function startEditing(fromDraft: Draft | null, at?: { x: number; y: number; block: HTMLElement }) {
    enterAnchor.current = at
      ? anchorOf({ element: at.block, index: Number(at.block.dataset.block) }, visibleLine(false))
      : captureAnchor(readBlocks(contentRef.current), visibleLine(false));
    caret.current = at ? { x: at.x, y: at.y } : null;
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
    const anchor = captureAnchor(editorBlocks(editorRootRef.current), visibleLine(true));
    rememberAnchor(props.path, anchor);
    clearDraft();
    editor.current = null;
    setMine(null);
    setEditing(false);
  }

  // null: l'utente non conferma il salvataggio del testo riscritto per intero dall'editor.
  function bodyText() {
    if (!bodyDirty || !editor.current) return props.body ?? "";
    const current = editor.current.read();
    const spliced = spliceMarkdown(originalBody, editor.current.baseline, current);
    if (
      spliced === null &&
      !confirm(
        "Questo documento non si salva solo nelle parti cambiate: l'editor riscriverà tutto il testo e " +
          "potrebbe cambiarne la formattazione (tabelle, link, HTML). Dopo il salvataggio controlla le differenze " +
          "nella cronologia. Salvare comunque?",
      )
    )
      return null;
    const text = spliced ?? current;
    return crlf ? text.replace(/\n/g, "\r\n") : text;
  }

  function save() {
    const anchor = captureAnchor(editorBlocks(editorRootRef.current), visibleLine(true));
    const body = bodyText();
    if (body === null) return;
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
      toast.success("Documento salvato.");
      rememberAnchor(props.path, anchor);
      leaving.current = true;
      router.refresh();
    });
  }

  // Dati chiave sempre visibili sotto il titolo.
  const hasFront = props.frontMatterSource !== null && !props.frontMatterError;
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
  // Punti risolti da una D[N] o aggiornati su indicazione utente ("→ risolto da D1" nel testo).
  const traces = useMemo(() => (props.versionView ? [] : tracesOf(props.body ?? "")), [props.body, props.versionView]);
  const resolved = traces.filter((t) => t.kind === "risolta").length;
  const questionSummary = [
    [count("da_correggere"), "da correggere", "da correggere"],
    [count("aperta"), "aperta", "aperte"],
    [count("da_applicare"), "da applicare", "da applicare"],
    [count("rimandata"), "rimandata", "rimandate"],
    [resolved, "risolta", "risolte"],
  ]
    .filter(([n]) => n)
    .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`)
    .join(" · ");
  // Il link della testata porta alla prima domanda che chiede un intervento.
  const firstQuestion = (
    questions.find((q) => ["da_correggere", "aperta"].includes(statusOf(q))) ?? questions[0]
  )?.id.toLowerCase();
  // Clic su «Rispondi» nel riquadro di una D[N]: apre la scelta dell'opzione.
  const [answering, setAnswering] = useState<string | null>(null);
  const answeringQuestion = questions.find((q) => q.id === answering);
  // Clic su "Risposta da applicare · copia prompt" nel testo: copia la richiesta per Claude.
  const copyAnswersPrompt = async (event: React.MouseEvent) => {
    const answer = (event.target as HTMLElement).closest<HTMLElement>("[data-answer-question]");
    if (answer) return setAnswering(answer.dataset.answerQuestion!);
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
  // Porta un elemento del testo appena sotto l'intestazione fissa (alta quanto il titolo va a capo)
  // e, in modifica, sotto la barra dell'editor.
  const scrollToElement = (element: HTMLElement) => {
    const toolbar = editorRootRef.current?.querySelector<HTMLElement>("[data-editor-toolbar]")?.offsetHeight ?? 0;
    const line = (headerRef.current?.offsetHeight ?? 0) + (isEditing ? toolbar + 4 : 0);
    window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - line - 16, behavior: "smooth" });
  };
  // Porta alla domanda e la fa lampeggiare per un attimo. Nell'editor è il suo titolo "D3 · …".
  const goToQuestion = (event: React.MouseEvent, id: string) => {
    const target =
      contentRef.current?.querySelector<HTMLElement>(`#${id}`) ??
      [...(editorRootRef.current?.querySelectorAll<HTMLElement>(":is(h2, h3, h4, h5, h6)") ?? [])].find((h) =>
        (h.textContent ?? "").toLowerCase().startsWith(`${id} ·`),
      );
    if (!target) return;
    event.preventDefault();
    // Nell'editor il "❓ Da chiarire" è un blocco a sé subito prima del titolo: si scorre a quello.
    const note = target.previousElementSibling as HTMLElement | null;
    scrollToElement(isEditing && note?.textContent?.trimStart().startsWith("❓") ? note : target);
    if (!isEditing) history.replaceState(null, "", `#${id}`);
    // Velo e bordo sottile nel colore dello stato della domanda, come il suo riquadro e il pallino.
    const question = questions.find((q) => q.id.toLowerCase() === id);
    const color = QUESTION_COLOR[question ? statusOf(question) : "aperta"];
    const tint = (percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;
    // Stessa forma dei riquadri (rounded-md).
    const borderRadius = "var(--radius-md)";
    target.animate(
      [
        { backgroundColor: tint(15), boxShadow: `0 0 0 2px ${tint(70)}`, borderRadius },
        { backgroundColor: "transparent", boxShadow: "0 0 0 2px transparent", borderRadius },
      ],
      { duration: 1800, delay: 300, easing: "ease-in" },
    );
  };

  // Porta all'n-esimo punto risolto e lo fa lampeggiare in verde, come le domande. In lettura è il
  // blocco dell'etichetta n-esima; nell'editor il blocco più interno con la traccia n-esima.
  const goToTrace = (event: React.MouseEvent, index: number) => {
    event.preventDefault();
    const target = isEditing
      ? [...(editorRootRef.current?.querySelectorAll<HTMLElement>("li, p, td, th") ?? [])]
          .filter((b) => b.querySelector("li, p") === null)
          .flatMap((b) => Array<HTMLElement>((b.textContent ?? "").match(/→\s*(?:risolto da|aggiornato su indicazione utente)/gi)?.length ?? 0).fill(b))[index]
      : contentRef.current?.querySelectorAll<HTMLElement>("[data-trace]")[index]?.closest<HTMLElement>("[data-trace-block]");
    if (!target) return;
    scrollToElement(target);
    const tint = (percent: number) => `color-mix(in srgb, var(--state-approved-border) ${percent}%, transparent)`;
    const borderRadius = "var(--radius-md)";
    target.animate(
      [
        { backgroundColor: tint(15), boxShadow: `0 0 0 2px ${tint(70)}`, borderRadius },
        { backgroundColor: "transparent", boxShadow: "0 0 0 2px transparent", borderRadius },
      ],
      { duration: 1800, delay: 300, easing: "ease-in" },
    );
  };

  // Tornando in lettura (Annulla, o pagina rimontata dopo Salva): stesso blocco nello stesso punto.
  useLayoutEffect(() => {
    const anchor = isEditing ? null : takeAnchor(props.path);
    if (anchor) restoreAnchor(readBlocks(contentRef.current), anchor, visibleLine(false));
  }, [isEditing, props.path]);

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

  // Domande e "In questa pagina", nel pannello fisso e in quello che si apre dalla colonnina.
  const sidePanel = (action: ReactNode) => (
    <>
      {questions.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Domande</h2>
            {action}
          </div>
          <ul className="flex flex-col gap-0.5 text-sm">
            {questions.map((q) => (
              <li key={q.id}>
                <a
                  href={`#${q.id.toLowerCase()}`}
                  onClick={(e) => goToQuestion(e, q.id.toLowerCase())}
                  title={QUESTION_STATUS_LABEL[statusOf(q)]}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <span aria-hidden className={cn("size-2 shrink-0 rounded-full", QUESTION_DOT[statusOf(q)])} />
                  <span className="truncate">
                    {q.id} · {q.title}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      {traces.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Risolte</h2>
            {questions.length === 0 && action}
          </div>
          <ul className="flex flex-col gap-0.5 text-sm">
            {traces.map((t, i) => (
              <li key={i}>
                <a
                  href="#"
                  onClick={(e) => goToTrace(e, i)}
                  title={t.text}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-(--state-approved-border)" />
                  <span className="truncate">
                    {t.ids.length ? t.ids.join(", ") : "Indicazione utente"} · {t.text}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">In questa pagina</h2>
        {questions.length === 0 && traces.length === 0 && action}
      </div>
      <DocumentOutline containerRef={isEditing ? editorRootRef : contentRef} scrollTo={scrollToElement} />
    </>
  );

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
                  {questions.length + resolved > 0 && !isEditing && (
                    <Property label="Domande">
                      <a
                        href={firstQuestion ? `#${firstQuestion}` : "#"}
                        onClick={(e) => (firstQuestion ? goToQuestion(e, firstQuestion) : goToTrace(e, traces.findIndex((t) => t.kind === "risolta")))}
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

        {props.frontMatterError && (
          <Alert variant="destructive">
            <AlertTitle>Frontespizio non valido</AlertTitle>
            <AlertDescription>
              Il YAML tra le due righe «---» in testa al file non si legge, quindi stato e dettagli non sono
              disponibili e il documento non si può modificare qui. Correggilo su GitLab o nella copia locale.
              <code className="mt-1 block font-mono text-xs whitespace-pre-wrap">{props.frontMatterError}</code>
            </AlertDescription>
          </Alert>
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
                Le tue modifiche sono conservate in questo browser: ricarica la pagina e scegli «Modifica con la
                mia bozza a fianco».
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
                <div ref={editorRootRef}>
                  <MilkdownEditor
                    initial={originalBody}
                    draft={resume}
                    onReady={(baseline, read, focusAt) => {
                      editor.current = { baseline, read };
                      setBodyDirty(read() !== baseline);
                      // Dopo il primo disegno dell'editor: stesso blocco nello stesso punto, poi il cursore.
                      requestAnimationFrame(() => {
                        if (enterAnchor.current) restoreAnchor(editorBlocks(editorRootRef.current), enterAnchor.current, visibleLine(true));
                        if (caret.current) focusAt(caret.current.x, caret.current.y);
                        enterAnchor.current = null;
                        caret.current = null;
                      });
                    }}
                    onChange={(markdown) => {
                      if (!editor.current) return;
                      setBodyDirty(markdown !== editor.current.baseline);
                      storeDraft(markdown);
                    }}
                  />
                </div>
              ) : (
                <div
                  ref={contentRef}
                  className={cn(props.hideFirstHeading && "[&>h1:first-child]:hidden")}
                  onClick={copyAnswersPrompt}
                  onDoubleClick={(e) => {
                    const target = e.target as HTMLElement;
                    const block = target.closest<HTMLElement>("[data-block]");
                    if (!props.canEdit || !block || target.closest("[data-copy-prompt], [data-answer-question]")) return;
                    window.getSelection()?.removeAllRanges();
                    startEditing(null, { x: e.clientX, y: e.clientY, block });
                  }}
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

      {/* A destra: domande e indice delle sezioni (anche in modifica, così il testo non cambia
          larghezza) o la cronologia. Ridotto (o tra lg e xl) resta una colonnina di trattini che si
          apre al passaggio del mouse, sopra il testo. */}
      {showHistory ? (
        <aside className="w-full shrink-0 lg:w-72">
          <div className="sticky top-8 flex max-h-[calc(100vh-4rem)] flex-col gap-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Cronologia</h2>
              <Button variant="ghost" size="icon-sm" aria-label="Chiudi la cronologia" onClick={() => setHistoryOpen(false)}>
                <X />
              </Button>
            </div>
            {props.history}
          </div>
        </aside>
      ) : (
        <aside className={cn("hidden shrink-0 lg:block", collapsed ? "w-6" : "w-6 xl:w-72")}>
          {!collapsed && (
            <div className="sticky top-8 hidden max-h-[calc(100vh-4rem)] flex-col gap-3 overflow-y-auto xl:flex">
              {sidePanel(
                <Button variant="ghost" size="icon-sm" aria-label="Riduci il pannello" title="Riduci il pannello" onClick={() => toggleCollapsed(true)}>
                  <PanelRightClose />
                </Button>,
              )}
            </div>
          )}
          <div className={cn("group sticky top-8 z-30", !collapsed && "xl:hidden")}>
            <div className="flex max-h-[calc(100vh-4rem)] flex-col items-end gap-4 overflow-hidden py-2">
              {questions.length > 0 && (
                <ul className="flex flex-col items-end gap-2">
                  {questions.map((q) => (
                    <li key={q.id} className={cn("block h-0.5 w-4 rounded-full", QUESTION_DOT[statusOf(q)])} />
                  ))}
                </ul>
              )}
              {traces.length > 0 && (
                <ul className="flex flex-col items-end gap-2">
                  {traces.map((_, i) => (
                    <li key={i} className="block h-0.5 w-4 rounded-full bg-(--state-approved-border)" />
                  ))}
                </ul>
              )}
              <DocumentOutline compact containerRef={isEditing ? editorRootRef : contentRef} scrollTo={scrollToElement} />
            </div>
            <div className="invisible absolute top-0 right-0 z-30 flex max-h-[calc(100vh-4rem)] w-72 flex-col gap-3 overflow-y-auto rounded-lg border bg-popover p-3 opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
              // Dopo il clic su una voce il pannello si chiude appena il mouse esce (il focus lo terrebbe aperto).
              onClick={() => (document.activeElement as HTMLElement | null)?.blur()}
            >
              {sidePanel(
                <Button variant="ghost" size="icon-sm" aria-label="Fissa il pannello" title="Fissa il pannello" className="hidden xl:inline-flex" onClick={() => toggleCollapsed(false)}>
                  <PanelRightOpen />
                </Button>,
              )}
            </div>
          </div>
        </aside>
      )}
      {answeringQuestion && (
        <AnswerQuestionDialog
          projectId={props.projectId}
          path={props.path}
          lastCommitId={props.lastCommitId}
          question={answeringQuestion}
          options={optionsOf(props.body ?? "", answeringQuestion.id)}
          onClose={() => setAnswering(null)}
        />
      )}
    </div>
  );
}
