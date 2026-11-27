"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Undo2 } from "lucide-react";
import { setPhase } from "../actions";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PHASES } from "@/lib/labels";

// Cambio di fase con conferma. Avanti: compare quando la fase corrente è completa (admin o PM).
// Indietro: solo admin (lo impone il trigger projects_phase_back). Nessun documento viene toccato.
export function PhaseChangeButton({
  projectId,
  from,
  to,
  look = "button",
}: {
  projectId: string;
  from: number;
  to: number;
  look?: "button" | "link";
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const back = to < from;
  const target = `Fase ${to} · ${PHASES[to]?.name}`;

  function show() {
    setError(null);
    setOpen(true);
  }

  function confirm() {
    startTransition(async () => {
      const response = await setPhase(projectId, to);
      if (response.error) setError(response.error);
      else setOpen(false);
    });
  }

  return (
    <>
      {look === "link" ? (
        <button type="button" onClick={show} className="text-primary hover:underline">
          Torna alla Fase {to}
        </button>
      ) : (
        <Button size="xs" variant={back ? "ghost" : "default"} onClick={show}>
          {back && <Undo2 data-icon="inline-start" />}
          {back ? `Torna alla Fase ${to}` : `Passa alla Fase ${to}`}
          {!back && <ArrowRight data-icon="inline-end" />}
        </Button>
      )}

      <Dialog open={open} onOpenChange={(value) => !pending && setOpen(value)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{back ? `Tornare alla ${target}?` : `Passare alla ${target}?`}</DialogTitle>
            <DialogDescription>
              {back
                ? `Il prossimo passo ripartirà dai documenti della Fase ${to}. Nessun documento viene modificato o cancellato: quelli delle fasi successive restano come sono. «Passa alla Fase ${to + 1}» ricompare quando la Fase ${to} è di nuovo completa.`
                : `I documenti della Fase ${from} sono pronti. Il prossimo passo diventa la Fase ${to}; nessun documento viene modificato. Se serve, un amministratore può riportare il progetto alla Fase ${from}.`}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Annulla
            </Button>
            <Button onClick={confirm} disabled={pending}>
              {pending ? "Salvataggio…" : back ? `Torna alla Fase ${to}` : `Passa alla Fase ${to}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
