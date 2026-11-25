"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, RefreshCw } from "lucide-react";
import { reindexDocuments, type ReindexResult } from "../actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Reindicizzazione in un menu secondario; esito e attesa stanno fuori dal menu, che si chiude al clic.
export function ReindexMenu({ projectId }: { projectId: string }) {
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
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Altre azioni" />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            disabled={pending}
            onClick={() => startTransition(async () => setResult(await reindexDocuments(projectId)))}
          >
            <RefreshCw />
            Reindicizza da GitLab
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
