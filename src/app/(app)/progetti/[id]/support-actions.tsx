"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, MoreHorizontal, MoveRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createSupportFileAction, deleteSupportFileAction, moveSupportFileAction } from "./documenti/actions";
import { ConfirmDialog, NameDialog } from "./file-manager";

// Nuovo file di supporto nella cartella corrente; il nome può contenere sottocartelle ("note/kickoff").
export function NewSupportFile({ projectId, folder }: { projectId: string; folder: string }) {
  const router = useRouter();
  return (
    <NameDialog
      title="Nuovo file di supporto"
      submitLabel="Crea"
      hint="Diventa un file .md; con «/» crei anche le sottocartelle (es. riunioni/kickoff)."
      trigger={
        <>
          <FilePlus /> Nuovo file
        </>
      }
      onSubmit={async (name) => {
        const result = await createSupportFileAction({ projectId, path: folder ? `${folder}/${name}` : name });
        if (!result.error && result.href) router.push(result.href);
        return result;
      }}
    />
  );
}

// ⋯ della riga: rinomina o sposta (il percorso dentro supporto/) ed elimina.
export function SupportFileActions({
  projectId,
  path,
  relative,
  lastCommitId,
}: {
  projectId: string;
  path: string;
  relative: string;
  lastCommitId: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"move" | "delete" | null>(null);
  const close = () => setDialog(null);
  const done = <T extends { error: string | null }>(result: T) => {
    if (!result.error) router.refresh();
    return result;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Altre azioni" title="Altre azioni" />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => setDialog("move")}>
            <MoveRight /> Rinomina o sposta
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDialog("delete")}>
            <Trash2 /> Elimina
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NameDialog
        open={dialog === "move"}
        onOpenChange={(open) => !open && close()}
        title="Rinomina o sposta"
        submitLabel="Salva"
        defaultValue={relative}
        hint="Percorso dentro i file di supporto: cambia il nome o le cartelle (es. archivio/kickoff.md)."
        onSubmit={async (to) => done(await moveSupportFileAction({ projectId, path, lastCommitId, to }))}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={close}
        title={`Eliminare «${relative.split("/").pop()}»?`}
        description="Il file sparisce dalla repo con un commit a tuo nome; resta nello storico di GitLab, da dove si può recuperare."
        onConfirm={async () => done(await deleteSupportFileAction({ projectId, path, lastCommitId }))}
      />
    </>
  );
}
