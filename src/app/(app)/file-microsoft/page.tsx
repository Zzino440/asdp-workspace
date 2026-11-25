import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { File, Folder } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { graphClient, microsoftEnabled } from "@/lib/microsoft";
import { createClient } from "@/lib/supabase/server";

// Pagina di prova della milestone 7: i Team dell'utente e i file dei loro canali, in sola lettura,
// letti da Microsoft Graph con l'account Microsoft collegato. Nascosta: non è nel menu.
export default function FileMicrosoftPage({ searchParams }: PageProps<"/file-microsoft">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">File Microsoft (prova)</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Team = { id: string; displayName: string };
type DriveItem = {
  id: string;
  name: string;
  webUrl: string;
  folder?: object;
  lastModifiedDateTime: string;
  parentReference: { driveId: string };
};

// <a> e non <Link>: la route imposta un cookie e reindirizza, non va precaricata.
const connectButton = (
  <a href="/api/microsoft/login" className={buttonVariants({ className: "w-fit" })}>
    Collega account Microsoft
  </a>
);

async function Content({ searchParams }: { searchParams: PageProps<"/file-microsoft">["searchParams"] }) {
  const { errore, team, drive, item } = await searchParams;
  if (!microsoftEnabled()) notFound();
  const graph = await graphClient(await createClient());

  const error = errore && (
    <Alert variant="destructive">
      <AlertDescription>{String(errore)}</AlertDescription>
    </Alert>
  );
  if (!graph) return <>{error}{connectButton}</>;

  const me = await graph<{ displayName: string; mail: string }>("/me?$select=displayName,mail");
  const header = (
    <p className="text-sm text-muted-foreground">
      Collegato come {me.displayName} ({me.mail}).
    </p>
  );

  if (!team && !drive) {
    const { value: teams } = await graph<{ value: Team[] }>("/me/joinedTeams?$select=id,displayName");
    return (
      <>
        {error}
        {header}
        <ul className="flex flex-col gap-1">
          {teams.map((t) => (
            <li key={t.id}>
              <Link href={`/file-microsoft?team=${t.id}`} className="hover:underline">
                {t.displayName}
              </Link>
            </li>
          ))}
        </ul>
      </>
    );
  }

  // Radice del Team: una cartella per canale standard. Poi si naviga per drive e cartella.
  const path = drive ? `/drives/${drive}/items/${item}/children` : `/groups/${team}/drive/root/children`;
  const { value: items } = await graph<{ value: DriveItem[] }>(
    `${path}?$select=id,name,webUrl,folder,lastModifiedDateTime,parentReference`,
  );
  // Prima le cartelle, poi i file, in ordine di nome.
  items.sort((a, b) => Number(!!b.folder) - Number(!!a.folder) || a.name.localeCompare(b.name, "it"));

  return (
    <>
      {header}
      <Link href="/file-microsoft" className="w-fit text-sm hover:underline">
        ← Tutti i Team
      </Link>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Modificato</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((i) => (
            <TableRow key={i.id}>
              <TableCell>
                {i.folder ? (
                  <Link
                    href={`/file-microsoft?drive=${i.parentReference.driveId}&item=${i.id}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Folder className="size-4" /> {i.name}
                  </Link>
                ) : (
                  <a href={i.webUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
                    <File className="size-4" /> {i.name}
                  </a>
                )}
              </TableCell>
              <TableCell>{new Date(i.lastModifiedDateTime).toLocaleDateString("it-IT")}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-muted-foreground">
                Cartella vuota.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
