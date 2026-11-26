import { Suspense } from "react";
import Link from "next/link";
import Form from "next/form";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, Lock, Search, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  channelFolder,
  getItem,
  graphClient,
  listChannels,
  listChildren,
  listTeams,
  MicrosoftError,
  microsoftEnabled,
} from "@/lib/microsoft";
import { createClient } from "@/lib/supabase/server";
import { linkFolder } from "../../../file-actions";
import { FileIcon } from "../../project-files";

// Collega una cartella di Teams al progetto (PM o admin): Team → canale → cartella, poi un nome.
// Qui il PM vede tutti i suoi Team; nella pagina del progetto si vedono solo le cartelle collegate.
export default function CollegaCartellaPage({ params, searchParams }: PageProps<"/progetti/[id]/file/collega">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Collega una cartella di Teams</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Query = { q?: string; team?: string; canale?: string; drive?: string; item?: string; cartella?: string; errore?: string };

async function Content({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!microsoftEnabled()) notFound();
  const supabase = await createClient();
  const [{ data: project }, { data: isAdmin }, { data: isPm }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", id).maybeSingle(),
    supabase.rpc("is_admin"),
    supabase.rpc("has_project_role", { p_project_id: id, p_roles: ["pm"] }),
  ]);
  if (!project || !(isAdmin || isPm)) notFound();

  const base = `/progetti/${id}/file/collega`;
  const href = (q: Query) =>
    `${base}?${new URLSearchParams(Object.entries(q).filter((e): e is [string, string] => Boolean(e[1])))}`;
  const back = (
    <Link href={`/progetti/${id}`} className="w-fit text-sm text-muted-foreground hover:underline">
      ← {project.name}
    </Link>
  );
  const errorAlert = query.errore && (
    <Alert variant="destructive">
      <AlertDescription>{query.errore}</AlertDescription>
    </Alert>
  );

  // Dati da Graph (fuori dalla resa: un errore di Microsoft diventa un messaggio).
  let data: Awaited<ReturnType<typeof load>> | null = null;
  let failure: MicrosoftError | null = null;
  try {
    data = await load(query);
  } catch (e) {
    if (!(e instanceof MicrosoftError)) throw e;
    failure = e;
  }
  if (data?.step === "channel") redirect(href({ drive: data.drive, item: data.item }));

  const connectHref = `/api/microsoft/login?next=${encodeURIComponent(base)}`;
  if (failure || !data) {
    return (
      <>
        {back}
        {failure && (
          <Alert variant="destructive">
            <AlertDescription>
              {failure.reconnect
                ? "Il collegamento a Microsoft è scaduto: ricollega l'account."
                : failure.isForbidden
                  ? "Non hai accesso a questa cartella o il canale non ha ancora una cartella dei file (aprilo una volta in Teams)."
                  : "Microsoft non risponde: riprova tra poco."}
            </AlertDescription>
          </Alert>
        )}
        {(!failure || failure.reconnect) && (
          <a href={connectHref} className={buttonVariants({ className: "w-fit" })}>
            {failure ? "Ricollega account Microsoft" : "Collega account Microsoft"}
          </a>
        )}
      </>
    );
  }

  // 1. Team
  if (data.step === "teams") {
    return (
      <>
        {back}
        {errorAlert}
        <p className="text-sm text-muted-foreground">Scegli il Team del progetto.</p>
        <Form action={base} className="flex w-fit items-center gap-1">
          <Input name="q" defaultValue={query.q} placeholder="Cerca un Team" className="h-8 w-64" />
          <Button type="submit" variant="outline" size="icon" aria-label="Cerca">
            <Search />
          </Button>
        </Form>
        <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {data.teams.map((t) => (
            <li key={t.id}>
              <Link
                href={href({ team: t.id })}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
              >
                <Users className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{t.displayName}</span>
              </Link>
            </li>
          ))}
        </ul>
        {data.teams.length === 0 && <p className="text-sm text-muted-foreground">Nessun Team trovato.</p>}
      </>
    );
  }

  // 2. Canale: si apre la sua cartella dei file.
  if (data.step === "channels") {
    return (
      <>
        <Link href={base} className="w-fit text-sm text-muted-foreground hover:underline">
          ← Tutti i Team
        </Link>
        <p className="text-sm text-muted-foreground">Scegli il canale: si apre la sua cartella dei file.</p>
        <ul className="flex flex-col gap-1">
          {data.channels.map((c) => (
            <li key={c.id}>
              <Link
                href={href({ team: query.team, canale: c.id })}
                className="flex w-fit items-center gap-2 text-sm hover:underline"
              >
                {c.membershipType === "standard" ? (
                  <Users className="size-4 text-muted-foreground" />
                ) : (
                  <Lock className="size-4 text-muted-foreground" aria-label="Canale privato o condiviso" />
                )}
                {c.displayName}
              </Link>
            </li>
          ))}
        </ul>
      </>
    );
  }

  // 3. Cartella: si naviga nelle sottocartelle e si collega quella aperta.
  const { drive, item, path, current, children } = data;
  const segments = path.split("/").filter(Boolean);
  const folders = children.filter((c) => c.folder);
  const files = children.length - folders.length;

  return (
    <>
      <Link href={base} className="w-fit text-sm text-muted-foreground hover:underline">
        ← Tutti i Team
      </Link>
      {errorAlert}
      <nav aria-label="Percorso" className="flex flex-wrap items-center gap-1 text-sm">
        <Link href={href({ drive, item })} className="font-medium hover:underline">
          Cartella del canale
        </Link>
        {segments.map((name, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <Link href={href({ drive, item, cartella: segments.slice(0, i + 1).join("/") })} className="hover:underline">
              {name}
            </Link>
          </span>
        ))}
      </nav>

      <form action={linkFolder.bind(null, id)} className="flex flex-wrap items-end gap-2 rounded-md border p-4">
        <input type="hidden" name="drive" value={drive} />
        <input type="hidden" name="item" value={item} />
        <input type="hidden" name="path" value={path} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="label">Nome nel progetto</Label>
          <Input id="label" name="label" defaultValue={current.name} required maxLength={60} className="w-64" />
        </div>
        <Button type="submit">Collega «{current.name}»</Button>
        <p className="basis-full text-xs text-muted-foreground">
          {folders.length} cartelle e {files} file. Nel progetto si vedrà questa cartella con le sue sottocartelle.
        </p>
      </form>

      <ul className="flex flex-col gap-1">
        {folders.map((f) => (
          <li key={f.id}>
            <Link
              href={href({ drive, item, cartella: path ? `${path}/${f.name}` : f.name })}
              className="flex w-fit items-center gap-2 text-sm hover:underline"
            >
              <FileIcon item={f} />
              {f.name}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

// Passo della scelta a partire dai parametri: Team, canali del Team, cartella del canale, cartella.
async function load(query: Query) {
  const graph = await graphClient(await createClient());
  if (!graph) return null;
  if (!query.team && !query.drive) {
    const filter = query.q?.trim().toLowerCase() ?? "";
    const teams = (await listTeams(graph)).filter((t) => t.displayName.toLowerCase().includes(filter));
    return { step: "teams" as const, teams };
  }
  if (query.team && query.canale) {
    const folder = await channelFolder(graph, query.team, query.canale);
    return { step: "channel" as const, drive: folder.parentReference.driveId, item: folder.id };
  }
  if (query.team) return { step: "channels" as const, channels: await listChannels(graph, query.team) };
  const drive = query.drive!;
  const item = query.item!;
  const path = query.cartella ?? "";
  const [current, children] = await Promise.all([
    getItem(graph, drive, item, path),
    listChildren(graph, drive, item, path),
  ]);
  return { step: "folder" as const, drive, item, path, current, children };
}
