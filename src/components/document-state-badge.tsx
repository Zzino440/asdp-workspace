import { cn } from "cn";

// Stati del frontespizio GUIDA-FRONT con i token --state-* di DESIGN.md.
const STATE_CLASSES: Record<string, string> = {
  "Da fare": "border-(--state-todo-border) bg-(--state-todo) text-(--state-todo-foreground)",
  "In corso": "border-(--state-progress-border) bg-(--state-progress) text-(--state-progress-foreground)",
  Completo: "border-(--state-complete-border) bg-(--state-complete) text-(--state-complete-foreground)",
  Approvato: "border-(--state-approved-border) bg-(--state-approved) text-(--state-approved-foreground)",
};

export function DocumentStateBadge({ state }: { state: string | null }) {
  if (!state) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STATE_CLASSES[state] ?? STATE_CLASSES["Da fare"],
      )}
    >
      {state}
    </span>
  );
}
