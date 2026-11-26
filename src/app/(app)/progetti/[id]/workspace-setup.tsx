import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { guidaHref } from "@/lib/guida";
import { missingSteps, type SetupState } from "@/lib/workspace";
import { GitLabSetupButton } from "./gitlab-setup-button";

// Checklist "Prepara l'area di lavoro" in cima al progetto, per admin e PM, finché manca qualcosa
// in Fase 0.
// Ogni passo si fa (o si rifà) da qui; quando è tutto pronto la card sparisce.
export function WorkspaceSetup({
  projectId,
  code,
  state,
  currentPhase,
  canCreateGitLab,
  clone,
  warning,
}: {
  projectId: string;
  code: string;
  state: SetupState;
  currentPhase: number;
  canCreateGitLab: boolean;
  clone: string[];
  warning: string | null;
}) {
  // Non invasiva: dopo la Fase 0 compare solo se manca la repo documenti (senza non si salva).
  if (!warning && (missingSteps(state).length === 0 || (currentPhase > 0 && state.docsRepository))) return null;
  const teamMissing = [!state.team.pm && "un PM", !state.team.tl && "un TL"].filter(Boolean).join(" e ");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prepara l&apos;area di lavoro</CardTitle>
        <CardDescription>
          Pochi passi perché team, Claude e skill trovino tutto al suo posto. Puoi farli in qualsiasi ordine.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {warning && (
          <Alert variant="destructive">
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        )}
        <ol className="flex flex-col divide-y divide-border">
          <Step done={state.docsRepository} title="Repo documenti su GitLab">
            {state.docsRepository ? (
              "Collegata: i documenti ASDP si salvano qui, con le versioni."
            ) : canCreateGitLab ? (
              <GitLabSetupButton projectId={projectId} />
            ) : (
              "Nessuna repo documenti: chiedi all'amministratore di crearla e collegarla."
            )}
          </Step>
          <Step done={state.codeRepositories > 0} title="Repo di codice">
            {state.codeRepositories > 0 ? (
              `${state.codeRepositories} collegate: le skill tecniche e Claude Code sanno quali aprire.`
            ) : (
              <>
                Servono dalla Fase 2 in poi.{" "}
                <a href="#repository" className="underline">
                  Aggiungile
                </a>
                {canCreateGitLab && !state.docsRepository && " o creale insieme alla repo documenti"}.
              </>
            )}
          </Step>
          {state.teamsFolder !== null && (
            <Step done={state.teamsFolder} title="Canale Teams">
              {state.teamsFolder ? (
                "Collegato: i file di progetto si vedono nella scheda File di progetto."
              ) : (
                <>
                  Crea il canale del progetto in un Team esistente (con le cartelle Input cliente, Verbali e
                  trascrizioni, Governance, Consegne) o collegane uno.{" "}
                  <Link href={`/progetti/${projectId}/file/collega`} className="underline">
                    Scegli il Team
                  </Link>
                </>
              )}
            </Step>
          )}
          <Step done={state.team.pm && state.team.tl} title="Team del progetto">
            {state.team.pm && state.team.tl ? (
              "PM e TL assegnati: i permessi sui documenti seguono i ruoli."
            ) : (
              <>
                Manca {teamMissing}: i ruoli decidono chi modifica e chi approva ogni documento.{" "}
                <a href="#team" className="underline">
                  Gestisci team
                </a>
              </>
            )}
          </Step>
          <Step done={null} title="Collega Claude">
            Le skill ASDP leggono e salvano i documenti dall&apos;app.{" "}
            <Link href={guidaHref("collegare-claude")} className="underline">
              Come collegarlo
            </Link>
            {clone.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer">Per il TL: cartella di lavoro locale</summary>
                <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                  {[`mkdir ${code.toLowerCase()} && cd ${code.toLowerCase()}`, ...clone.map((c) => `git clone ${c}`)].join("\n")}
                </pre>
              </details>
            )}
          </Step>
          <Step done={state.documents > 0} title="Primo passo: Kickoff">
            {state.documents > 0 ? (
              "Il percorso è partito: il prossimo passo è nella mappa qui sotto."
            ) : (
              <>
                In Claude, con il plugin asdp: lancia la skill <span className="font-mono">asdp:t0-1-kickoff</span> sul
                progetto <span className="font-mono">{code}</span>.{" "}
                <Link href={guidaHref("fase-0")} className="underline">
                  Cosa succede nella Fase 0
                </Link>
              </>
            )}
          </Step>
        </ol>
        {missingSteps(state).length === 0 && (
          <Link href={`/progetti/${projectId}`} className={buttonVariants({ variant: "outline", className: "self-start" })}>
            Chiudi
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// done: null = passo informativo, senza stato.
function Step({ done, title, children }: { done: boolean | null; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      {done ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-(--state-approved-border)" aria-label="Fatto" />
      ) : (
        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={done === null ? "" : "Da fare"} />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium">{title}</span>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}
