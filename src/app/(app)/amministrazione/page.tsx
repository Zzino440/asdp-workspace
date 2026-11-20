import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  { href: "/amministrazione/utenti", title: "Utenti", description: "Inviti, admin, stato e ruoli per progetto." },
  {
    href: "/amministrazione/permessi",
    title: "Ruoli e permessi",
    description: "Cosa ogni ruolo ASDP può vedere, modificare e approvare.",
  },
];

export default function AmministrazionePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Amministrazione</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full hover:bg-accent">
              <CardHeader>
                <CardTitle>{s.title}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
