"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { reindexDocuments, type ReindexResult } from "../actions";
import { Button } from "@/components/ui/button";

// Pulsante di reindicizzazione sempre visibile; esito e attesa accanto al pulsante.
export function ReindexButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ReindexResult | null>(null);

  return (
    <div className="flex items-center gap-3">
      {pending && <span className="text-sm text-muted-foreground">Indicizzazione…</span>}
      {!pending && result?.error && <span className="text-sm text-destructive">{result.error}</span>}
      {!pending && result && !result.error && (
        <span className="text-sm text-muted-foreground">{result.count} file indicizzati.</span>
      )}
      {!pending && result?.warning && <span className="text-sm text-destructive">{result.warning}</span>}
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await reindexDocuments(projectId)))}
      >
        <RefreshCw className={pending ? "animate-spin" : undefined} />
        Reindicizza da GitLab
      </Button>
    </div>
  );
}
