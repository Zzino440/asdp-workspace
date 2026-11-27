"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Download, ExternalLink, FolderOpen, Send } from "lucide-react";
import { publishDocumentAction } from "./actions";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

export function ExportMenu(props: { projectId: string; path: string }) {
  const href = (format: Format) =>
    `/api/documents/export?${new URLSearchParams({ project: props.projectId, path: props.path, format })}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
        <Download />
        Esporta
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        {FORMATS.map((f) => (
          <DropdownMenuItem key={f.id} render={<a href={href(f.id)} download />}>
            <span>{f.label}</span>
            <span className="ml-auto pl-4 text-xs whitespace-nowrap text-muted-foreground">{f.hint}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Cartella di pubblicazione nella scheda File del progetto, dentro l'app.
const filesHref = (projectId: string, locationId: string, phaseFolder: string) =>
  `/progetti/${projectId}/file?${new URLSearchParams({ file: locationId, cartella: `ASDP/${phaseFolder}` })}`;

// Stato della copia su Teams, tra le proprietà sotto il titolo. I file si aprono su SharePoint
// (icona ↗, nuova scheda); la cartella si apre nella scheda File dell'app.
export function PublicationInfo(props: { publication: PublicationView; projectId: string; phaseFolder: string }) {
  const { publication } = props;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {publication.formats.map((f) => {
        const url = publication.items[f]?.web_url;
        return url ? (
          <a
            key={f}
            href={url}
            target="_blank"
            rel="noreferrer"
            title={`Apri il ${label(f)} su SharePoint`}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {label(f)}
            <ExternalLink className="size-3.5" />
          </a>
        ) : null;
      })}
      <span className="text-muted-foreground">· {dateFormat.format(new Date(publication.published_at))}</span>
      {publication.outdated && <Badge variant="outline">Da ripubblicare</Badge>}
      <Link
        href={filesHref(props.projectId, publication.location_id, props.phaseFolder)}
        title={`Apri la cartella ASDP › ${props.phaseFolder} nella scheda File del progetto`}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        <FolderOpen className="size-4" />
        Vedi nei File
      </Link>
    </span>
  );
}

export function PublishButton(props: {
  projectId: string;
  path: string;
  locations: { id: string; label: string }[];
  phaseFolder: string;
  publication: PublicationView | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formats, setFormats] = useState<string[]>(props.publication?.formats ?? ["pdf"]);
  const [locationId, setLocationId] = useState(props.locations[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PublicationView | null>(null);
  const [pending, startTransition] = useTransition();
  const republish = props.publication !== null;
  const location = props.locations.find((l) => l.id === locationId);

  function show() {
    setFormats(props.publication?.formats ?? ["pdf"]);
    setError(null);
    setDone(null);
    setOpen(true);
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
    <>
      <Button size="sm" variant={props.publication?.outdated ? "default" : "outline"} onClick={show}>
        <Send />
        {republish ? "Ripubblica su Teams" : "Pubblica su Teams"}
      </Button>

      <Dialog open={open} onOpenChange={(value) => !value && !pending && setOpen(false)}>
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
    </>
  );
}
