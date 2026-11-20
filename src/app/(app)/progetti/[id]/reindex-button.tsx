"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { reindexDocuments, type ReindexResult } from "../actions";
import { Button } from "@/components/ui/button";

export function ReindexButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ReindexResult | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await reindexDocuments(projectId)))}
      >
        <RefreshCw />
        {pending ? "Indicizzazione…" : "Reindicizza da GitLab"}
      </Button>
      {result?.error && <span className="text-sm text-destructive">{result.error}</span>}
      {result && !result.error && (
        <span className="text-sm text-muted-foreground">{result.count} file indicizzati.</span>
      )}
    </div>
  );
}
