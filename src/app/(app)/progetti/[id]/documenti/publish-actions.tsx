"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { ChevronDown, Download, ExternalLink, FolderOpen, Send } from "lucide-react";
import { publishDocumentAction } from "./actions";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Esporta (scarica un file) e Pubblica su Teams (copia condivisa con stato), come in Notion e
// Google Docs. Il motore è lo stesso: src/lib/documents/export.

type Format = "pdf" | "docx" | "md";
const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: "pdf", label: "PDF", hint: "da leggere e condividere" },
  { id: "docx", label: "Word", hint: "da commentare in Office" },
  { id: "md", label: "Markdown", hint: "il file sorgente, con il frontespizio" },
];
const label = (f: string) => FORMATS.find((x) => x.id === f)?.label ?? f;

export type PublicationView = {
  formats: string[];
  items: Partial<Record<string, { web_url: string }>>;
  folder_web_url: string;
  location_id: string;
  published_at: string;
  outdated: boolean;
};

const dateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "short" });

// Un solo menu per scaricare il documento e per la sua copia su Teams: la barra del documento ha
// gli stessi pulsanti in ogni stato. Il pallino dice se il documento è su Teams (e se va ripubblicato).
export function ExportMenu(props: {
  projectId: string;
  path: string;
  // Pubblica su Teams: solo se il documento è Approvato e c'è una cartella collegata.
  publish: { locations: { id: string; label: string }[] } | null;
  publication: PublicationView | null;
  phaseFolder: string;
}) {
  const [publishing, setPublishing] = useState(false);
  const { publication } = props;
  const href = (format: Format) =>
    `/api/documents/export?${new URLSearchParams({ project: props.projectId, path: props.path, format })}`;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="sm" />}
          title={
            publication
              ? publication.outdated
                ? "Su Teams c'è una versione vecchia: da ripubblicare"
                : "Pubblicato su Teams"
              : undefined
          }
        >
          <Download />
          Esporta
          {publication && (
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                publication.outdated ? "bg-(--state-progress-border)" : "bg-(--state-approved-border)",
              )}
            />
          )}
          <ChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Scarica</DropdownMenuLabel>
            {FORMATS.map((f) => (
              <DropdownMenuItem key={f.id} render={<a href={href(f.id)} download />}>
                <span>{f.label}</span>
                <span className="ml-auto pl-4 text-xs whitespace-nowrap text-muted-foreground">{f.hint}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          {(publication || props.publish) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  Su Teams
                  {publication &&
                    (publication.outdated
                      ? " · da ripubblicare"
                      : ` · pubblicato il ${dateFormat.format(new Date(publication.published_at))}`)}
                </DropdownMenuLabel>
                {publication?.formats.map((f) => {
                  const url = publication.items[f]?.web_url;
                  return url ? (
                    <DropdownMenuItem key={f} render={<a href={url} target="_blank" rel="noreferrer" />}>
                      <ExternalLink />
                      Apri il {label(f)}
                    </DropdownMenuItem>
                  ) : null;
                })}
                {publication && (
                  <DropdownMenuItem
                    render={<Link href={filesHref(props.projectId, publication.location_id, props.phaseFolder)} />}
                  >
                    <FolderOpen />
                    Vedi nei File
                  </DropdownMenuItem>
                )}
                {props.publish && (
                  <DropdownMenuItem onClick={() => setPublishing(true)}>
                    <Send />
                    {publication ? "Ripubblica su Teams…" : "Pubblica su Teams…"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {props.publish && (
        <PublishDialog
          open={publishing}
          onOpenChange={setPublishing}
          projectId={props.projectId}
          path={props.path}
          locations={props.publish.locations}
          phaseFolder={props.phaseFolder}
          publication={publication}
        />
      )}
    </>
  );
}

// Cartella di pubblicazione nella scheda File del progetto, dentro l'app.
const filesHref = (projectId: string, locationId: string, phaseFolder: string) =>
  `/progetti/${projectId}/file?${new URLSearchParams({ file: locationId, cartella: `ASDP/${phaseFolder}` })}`;

function PublishDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  path: string;
  locations: { id: string; label: string }[];
  phaseFolder: string;
  publication: PublicationView | null;
}) {
  const router = useRouter();
  const [formats, setFormats] = useState<string[]>(props.publication?.formats ?? ["pdf"]);
  const [locationId, setLocationId] = useState(props.locations[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PublicationView | null>(null);
  const [pending, startTransition] = useTransition();
  const republish = props.publication !== null;
  const location = props.locations.find((l) => l.id === locationId);
  const setOpen = props.onOpenChange;

  // A ogni apertura si riparte dai formati già pubblicati.
  const [wasOpen, setWasOpen] = useState(props.open);
  if (props.open !== wasOpen) {
    setWasOpen(props.open);
    if (props.open) {
      setFormats(props.publication?.formats ?? ["pdf"]);
      setError(null);
      setDone(null);
    }
  }

  function publish() {
    startTransition(async () => {
      const response = await publishDocumentAction({
        projectId: props.projectId,
        path: props.path,
        formats: FORMATS.map((f) => f.id).filter((f) => formats.includes(f)),
        locationId: locationId || undefined,
      });
      if (response.error || !response.publication) {
        setError(response.error ?? "Pubblicazione non riuscita.");
        return;
      }
      setDone({ ...response.publication, outdated: false });
      router.refresh();
    });
  }

  return (
    <Dialog open={props.open} onOpenChange={(value) => !value && !pending && setOpen(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{done ? "Pubblicato su Teams" : republish ? "Ripubblica su Teams" : "Pubblica su Teams"}</DialogTitle>
          <DialogDescription>
            {done
              ? `I file sono in ASDP › ${props.phaseFolder}, nella cartella Teams del progetto. Chi ha accesso al canale li trova lì.`
              : "Una copia del documento approvato nella cartella Teams del progetto. Ripubblicando, i file vengono sostituiti: il link resta lo stesso e SharePoint tiene le versioni precedenti."}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col gap-2">
            {done.formats.map((f) => (
              <a
                key={f}
                href={done.items[f]?.web_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="size-4" />
                Apri il {label(f)}
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-sm font-medium">Formati</legend>
              {FORMATS.map((f) => (
                <Label key={f.id} className="font-normal">
                  <Checkbox
                    checked={formats.includes(f.id)}
                    onCheckedChange={(value) => setFormats(value ? [...formats, f.id] : formats.filter((x) => x !== f.id))}
                  />
                  {f.label}
                  <span className="text-muted-foreground">· {f.hint}</span>
                </Label>
              ))}
            </fieldset>
            {props.locations.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <Label>Cartella del progetto</Label>
                <Select value={locationId} onValueChange={(value) => setLocationId(String(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{location?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {props.locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <p className="text-sm">
              <span className="text-muted-foreground">Dove: </span>
              {location?.label} › ASDP › {props.phaseFolder}
            </p>
          </div>
        )}

        <DialogFooter>
          {done ? (
            <>
              <a href={done.folder_web_url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
                <ExternalLink />
                Apri su SharePoint
              </a>
              <Link href={filesHref(props.projectId, done.location_id, props.phaseFolder)} className={buttonVariants()}>
                <FolderOpen />
                Vedi nei File del progetto
              </Link>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Annulla
              </Button>
              <Button onClick={publish} disabled={pending || formats.length === 0 || !location}>
                {pending ? "Pubblicazione…" : republish ? "Ripubblica" : "Pubblica"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
