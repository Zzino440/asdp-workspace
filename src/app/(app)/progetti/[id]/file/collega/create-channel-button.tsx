"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Pulsante del form "Crea il canale del progetto": disattivato mentre la creazione è in corso
// (niente canali doppi da clic ripetuti) e con l'indicazione di cosa sta succedendo.
export function CreateChannelButton() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col gap-1">
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Creazione del canale…" : "Crea il canale del progetto"}
      </Button>
      {pending && (
        <p className="text-xs text-muted-foreground" role="status">
          Creo il canale e le cartelle su Teams: può servire fino a mezzo minuto, non chiudere la pagina.
        </p>
      )}
    </div>
  );
}
