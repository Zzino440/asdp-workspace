export function ComingSoon({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">In arrivo: {milestone} (vedi docs/ARCHITETTURA.md).</p>
    </div>
  );
}
