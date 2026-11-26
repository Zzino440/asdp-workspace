"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, loginWithMicrosoft, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const microsoftError = searchParams.get("error") === "microsoft";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>ASDP Workspace</CardTitle>
          <CardDescription>Accedi con il tuo account DST.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={loginWithMicrosoft} className="flex flex-col gap-2">
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="outline">
              Accedi con Microsoft
            </Button>
            {microsoftError && (
              <p className="text-sm text-destructive">
                Accesso con Microsoft non riuscito. Serve un account DST: se il problema resta,
                contatta un amministratore.
              </p>
            )}
          </form>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            oppure con email e password
            <span className="h-px flex-1 bg-border" />
          </div>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Accesso in corso…" : "Accedi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
