"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { toast } from "sonner";
import { answerQuestionAction } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isOtherOption, type Question } from "@/lib/questions";

// Risposta a una D[N] con un clic: si sceglie un'opzione e l'app spunta solo quella casella con un
// salvataggio a nome dell'utente. Per applicare la risposta al documento si rilancia la skill.
export function AnswerQuestionDialog(props: {
  projectId: string;
  path: string;
  lastCommitId: string;
  question: Question;
  options: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const checkedNow = props.question.answer ? props.options.indexOf(props.question.answer) : -1;
  const [choice, setChoice] = useState<number | null>(checkedNow >= 0 ? checkedNow : null);
  const otherIndex = props.options.findIndex(isOtherOption);
  const otherNow = otherIndex >= 0 ? props.options[otherIndex].replace(/^altro:/i, "").replace(/^[\s_]+|[\s_]+$/g, "") : "";
  const [other, setOther] = useState(otherNow);
  const [error, setError] = useState<{ message: string; conflict: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const needsText = choice !== null && isOtherOption(props.options[choice]);
  const ready = choice !== null && (!needsText || other.trim() !== "");

  function save() {
    if (choice === null) return;
    startTransition(async () => {
      const response = await answerQuestionAction({
        projectId: props.projectId,
        path: props.path,
        lastCommitId: props.lastCommitId,
        questionId: props.question.id,
        option: choice,
        other: needsText ? other : undefined,
      });
      if (response.error) {
        setError({ message: response.error, conflict: Boolean(response.conflict) });
        return;
      }
      toast.success(
        /^da decidere/i.test(props.options[choice])
          ? `${props.question.id} rimandata all'analisi.`
          : `Risposta a ${props.question.id} salvata: rilancia la skill per applicarla.`,
      );
      props.onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {props.question.id} · {props.question.title}
          </DialogTitle>
          <DialogDescription>
            Scegli una sola risposta: l&apos;app spunta la casella nel documento con un salvataggio a tuo nome. Per
            portarla nel testo si rilancia poi la skill («Risposta da applicare · copia prompt»).
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>{error.message}</AlertTitle>
            {error.conflict && (
              <AlertDescription className="flex flex-col items-start gap-2">
                Aggiorna per leggere la versione nuova, poi rispondi di nuovo.
                <Button size="sm" variant="outline" onClick={() => router.refresh()}>
                  Aggiorna
                </Button>
              </AlertDescription>
            )}
          </Alert>
        )}
        {props.options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Questa domanda non ha opzioni da spuntare: rispondi in Modifica testo o in chat con Claude.
          </p>
        ) : (
          <fieldset className="flex flex-col gap-2" disabled={pending}>
            <legend className="sr-only">Risposta</legend>
            {props.options.map((option, i) => (
              <label
                key={i}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted",
                  choice === i && "border-primary bg-primary/10",
                )}
              >
                <input
                  type="radio"
                  name="answer"
                  className="mt-0.5 accent-(--primary)"
                  checked={choice === i}
                  onChange={() => setChoice(i)}
                />
                <span>{isOtherOption(option) ? "Altro" : option}</span>
              </label>
            ))}
            {needsText && (
              <Input
                autoFocus
                aria-label="Risposta per Altro"
                placeholder="Scrivi la risposta"
                value={other}
                onChange={(e) => setOther(e.target.value)}
              />
            )}
          </fieldset>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={props.onClose} disabled={pending}>
            Annulla
          </Button>
          <Button onClick={save} disabled={pending || !ready}>
            {pending ? "Salvataggio…" : "Salva la risposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
