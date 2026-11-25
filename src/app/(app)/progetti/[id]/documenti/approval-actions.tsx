"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, CheckCheck, Undo2, MessageSquareWarning } from "lucide-react";
import { changeApprovalAction } from "./actions";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Gate } from "@/lib/gates";

type Step = "complete" | "approve" | "request_changes" | "revoke";

const TITLES: Record<Exclude<Step, "complete">, { title: string; description: string; button: string }> = {
  approve: {
    title: "Approva il documento",
    description: "Spunta ogni voce del gate: l'approvazione si registra nel frontespizio con un commit a tuo nome.",
    button: "Approva",
  },
  request_changes: {
    title: "Richiedi modifiche",
    description: "Il documento torna In corso. Il motivo resta nel commit e si legge in Cronologia.",
    button: "Richiedi modifiche",
  },
  revoke: {
    title: "Revoca l'approvazione",
    description: "Il documento torna In corso e i dati di approvazione si svuotano. Il motivo resta nel commit.",
    button: "Revoca approvazione",
  },
};

// Pulsanti del flusso di approvazione nella barra del documento: Completo vale come «in approvazione».
export function ApprovalActions(props: {
  projectId: string;
  path: string;
  lastCommitId: string;
  state: string | null;
  canEdit: boolean;
  canApprove: boolean;
  gate: Gate;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState<Exclude<Step, "complete"> | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [evidence, setEvidence] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(next: Step) {
    startTransition(async () => {
      const response = await changeApprovalAction({
        projectId: props.projectId,
        path: props.path,
        lastCommitId: props.lastCommitId,
        step: next,
        checked,
        evidence,
        reason,
      });
      if (response.error) {
        setError(response.conflict ? `${response.error} Ricarica la pagina e riprova.` : response.error);
        return;
      }
      setStep(null);
      // Dopo una decisione la pagina propone il prossimo documento da approvare.
      if (next === "approve" || next === "request_changes") {
        router.replace(`${pathname}?esito=${next === "approve" ? "approvato" : "modifiche"}`);
      }
      router.refresh();
    });
  }

  function open(next: Exclude<Step, "complete">) {
    setChecked([]);
    setEvidence("");
    setReason("");
    setError(null);
    setStep(next);
  }

  const ready =
    step === "approve"
      ? props.gate.checklist.every((item) => checked.includes(item)) && (!props.gate.externalEvidence || evidence.trim() !== "")
      : reason.trim() !== "";

  const canComplete = props.canEdit && (props.state === "Da fare" || props.state === "In corso");
  const toReview = props.canApprove && props.state === "Completo";
  const approved = props.canApprove && props.state === "Approvato";
  if (!canComplete && !toReview && !approved) return null;

  return (
    <>
      {canComplete && (
        <Button size="sm" variant="outline" onClick={() => run("complete")} disabled={pending} title="Lo vede chi approva">
          <Check />
          {pending ? "Salvataggio…" : "Segna come completo"}
        </Button>
      )}
      {toReview && (
        <>
          <Button size="sm" variant="outline" onClick={() => open("request_changes")}>
            <MessageSquareWarning />
            Richiedi modifiche
          </Button>
          <Button size="sm" onClick={() => open("approve")}>
            <CheckCheck />
            Approva
          </Button>
        </>
      )}
      {approved && (
        <Button size="sm" variant="ghost" onClick={() => open("revoke")}>
          <Undo2 />
          Revoca approvazione
        </Button>
      )}
      {!step && error && <span className="text-xs text-destructive">{error}</span>}

      <Dialog open={step !== null} onOpenChange={(value) => !value && !pending && setStep(null)}>
        {step && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{TITLES[step].title}</DialogTitle>
              <DialogDescription>{TITLES[step].description}</DialogDescription>
            </DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
            {step === "approve" ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm">
                  <span className="text-muted-foreground">Gate: </span>
                  {props.gate.name ?? "nessun gate formale"}
                  <span className="text-muted-foreground"> · approva {props.gate.approver}</span>
                </p>
                {props.gate.checklist.length > 0 && (
                  <ul className="flex flex-col gap-3">
                    {props.gate.checklist.map((item) => (
                      <li key={item}>
                        <Label className="font-normal">
                          <Checkbox
                            checked={checked.includes(item)}
                            onCheckedChange={(value) =>
                              setChecked(value ? [...checked, item] : checked.filter((c) => c !== item))
                            }
                          />
                          {item}
                        </Label>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="approval-evidence">
                    Evidenza{props.gate.externalEvidence ? " (obbligatoria)" : ""}
                  </Label>
                  <Input
                    id="approval-evidence"
                    value={evidence}
                    placeholder={
                      props.gate.externalEvidence
                        ? "Es. email del PO del 12/12, verbale della riunione"
                        : `Vuota: commit ${props.lastCommitId.slice(0, 8)}`
                    }
                    onChange={(e) => setEvidence(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="approval-reason">Motivo</Label>
                <Textarea
                  id="approval-reason"
                  value={reason}
                  rows={4}
                  placeholder="Cosa va cambiato e perché"
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(null)} disabled={pending}>
                Annulla
              </Button>
              <Button
                variant={step === "approve" ? "default" : "destructive"}
                onClick={() => run(step)}
                disabled={pending || !ready}
              >
                {pending ? "Salvataggio…" : TITLES[step].button}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
