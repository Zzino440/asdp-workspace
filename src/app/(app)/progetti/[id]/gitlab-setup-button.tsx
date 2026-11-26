"use client";

import { useState, useTransition } from "react";
import { runGitLabSetup } from "../actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

// Crea (o riusa) gruppo del progetto, repo documenti e repo di codice scelte.
export function GitLabSetupButton({ projectId }: { projectId: string }) {
  const [repos, setRepos] = useState({ fe: true, be: true });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <span>Crea il gruppo del progetto con la repo documenti già strutturata.</span>
      <div className="flex flex-wrap items-center gap-4">
        {(["fe", "be"] as const).map((r) => (
          <label key={r} className="flex items-center gap-2">
            <Checkbox checked={repos[r]} onCheckedChange={(c) => setRepos((v) => ({ ...v, [r]: c }))} />
            Repo {r === "fe" ? "frontend" : "backend"}
          </label>
        ))}
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await runGitLabSetup(projectId, repos);
              setMessage(result.error ?? result.warning ?? null);
            })
          }
        >
          {pending ? "Creazione…" : "Crea su GitLab"}
        </Button>
      </div>
      {message && <p className="text-destructive">{message}</p>}
    </div>
  );
}
