"use client";

import { useActionState } from "react";
import { setPassword, type PasswordState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: PasswordState = { error: null };

export default function ImpostaPasswordPage() {
  const [state, formAction, pending] = useActionState(setPassword, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Imposta la password</CardTitle>
          <CardDescription>Scegli la password per accedere ad ASDP Workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Nuova password</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm">Conferma password</Label>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : "Salva e accedi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
