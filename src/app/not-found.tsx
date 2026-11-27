import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Pagina, progetto o documento che non esiste o che l'utente non può vedere (la RLS non li distingue).
export default function NotFound() {
  return (
    <div className="flex max-w-xl flex-col gap-3 p-8">
      <h1 className="text-2xl font-semibold">Pagina non trovata</h1>
      <p className="text-sm text-muted-foreground">
        Non esiste, è stata spostata o non hai i permessi per vederla. Se pensi che dovresti vederla, chiedi al PM del
        progetto.
      </p>
      <Link href="/progetti" className={buttonVariants({ variant: "outline", size: "sm", className: "self-start" })}>
        Torna ai progetti
      </Link>
    </div>
  );
}
