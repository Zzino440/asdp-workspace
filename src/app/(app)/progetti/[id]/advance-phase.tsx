"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { advancePhase } from "../actions";
import { Button } from "@/components/ui/button";

// Compare quando tutti i documenti della fase corrente sono Completo o Approvato.
export function AdvancePhaseButton({ projectId, nextPhase }: { projectId: string; nextPhase: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="flex items-center gap-2">
      <Button
        size="xs"
        disabled={pending}
        onClick={() => startTransition(async () => setError((await advancePhase(projectId, nextPhase)).error))}
      >
        Passa alla Fase {nextPhase}
        <ArrowRight data-icon="inline-end" />
      </Button>
      {error && <span className="text-destructive">{error}</span>}
    </span>
  );
}
