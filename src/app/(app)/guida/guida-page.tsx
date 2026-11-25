import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { Markdown } from "@/components/markdown";
import { DocumentOutline } from "@/app/(app)/progetti/[id]/documenti/document-outline";
import { PHASES } from "@/lib/labels";
import { GUIDA, GUIDA_SEZIONI, guidaHref, type GuidaDocumento } from "@/lib/guida";

// Pagina della Guida in stile documentazione: indice a sinistra, testo al centro,
// "In questa pagina" a destra. Tutto statico: niente sessione né DB.
export function GuidaPage({ slug }: { slug: string }) {
  const data = readGuidaPage(slug);
  if (!data) notFound();
  const { page, body, prev, next } = data;
  const textId = `guida-testo-${slug || "inizio"}`;

  return (
    <div className="flex gap-8">
      <nav aria-label="Indice della guida" className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <GuidaNav current={slug} />
        </div>
      </nav>

      <article className="min-w-0 max-w-3xl flex-1">
        <details className="mb-6 rounded-md border lg:hidden">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Indice della guida</summary>
          <div className="border-t p-3">
            <GuidaNav current={slug} />
          </div>
        </details>

        <p className="text-sm text-muted-foreground">{page.sezione}</p>
        <h1 className="mt-1 text-3xl font-semibold">{page.titolo}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{page.sottotitolo}</p>

        {page.documento && <DocumentoFacts doc={page.documento} />}

        <div id={textId} className="mt-6">
          <Markdown>{body}</Markdown>
        </div>

        <div className="mt-10 grid gap-3 border-t pt-6 sm:grid-cols-2">
          {prev ? <PagerLink page={prev} direction="prev" /> : <span />}
          {next && <PagerLink page={next} direction="next" />}
        </div>
      </article>

      <aside className="hidden w-52 shrink-0 xl:block">
        <div className="sticky top-8 flex max-h-[calc(100vh-4rem)] flex-col gap-2 overflow-y-auto">
          <p className="px-2 text-xs font-medium text-muted-foreground uppercase">In questa pagina</p>
          {/* id per pagina: Next tiene nel DOM, nascoste, le pagine già visitate */}
          <DocumentOutline containerId={textId} />
        </div>
      </aside>
    </div>
  );
}

// Lettura sincrona: le pagine della guida sono statiche e il testo finisce nel prerender.
function readGuidaPage(slug: string) {
  const index = GUIDA.findIndex((p) => p.slug === slug);
  if (index === -1) return null;
  const page = GUIDA[index];
  const body = readFileSync(path.join(process.cwd(), "src/content/guida", `${page.file}.md`), "utf-8");
  return { page, body, prev: GUIDA[index - 1] ?? null, next: GUIDA[index + 1] ?? null };
}

function GuidaNav({ current }: { current: string }) {
  return (
    <div className="flex flex-col gap-4">
      {GUIDA_SEZIONI.map((sezione) => (
        <div key={sezione}>
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground uppercase">{sezione}</p>
          <ul className="flex flex-col gap-0.5 text-sm">
            {GUIDA.filter((p) => p.sezione === sezione).map((p) => (
              <li key={p.slug}>
                <Link
                  href={guidaHref(p.slug)}
                  aria-current={p.slug === current ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground",
                    p.slug === current && "bg-accent font-medium text-foreground",
                  )}
                >
                  {p.titolo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function DocumentoFacts({ doc }: { doc: GuidaDocumento }) {
  const fase = PHASES.find((p) => p.n === doc.fase);
  const rows: [string, React.ReactNode][] = [
    ["Fase", <Link key="f" href={guidaHref(`fase-${doc.fase}`)} className="text-primary hover:underline">{`Fase ${doc.fase} · ${fase?.name}`}</Link>],
    ["Chi scrive", doc.scrive],
    ["Chi approva", doc.approva],
    [
      "Input",
      <ul key="i" className="list-disc pl-5">
        {doc.input.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>,
    ],
    ["Skill", <code key="s" className="rounded bg-muted px-1 font-mono text-sm">/{doc.skill}</code>],
    ["Output", doc.output],
  ];
  return (
    <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-md border bg-card p-4 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PagerLink({ page, direction }: { page: (typeof GUIDA)[number]; direction: "prev" | "next" }) {
  const isNext = direction === "next";
  return (
    <Link
      href={guidaHref(page.slug)}
      className={cn("flex flex-col gap-1 rounded-md border p-3 hover:bg-muted", isNext && "items-end text-right sm:col-start-2")}
    >
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {!isNext && <ChevronLeft className="size-3" />}
        {isNext ? "Successivo" : "Precedente"}
        {isNext && <ChevronRight className="size-3" />}
      </span>
      <span className="text-sm font-medium">{page.titolo}</span>
    </Link>
  );
}
