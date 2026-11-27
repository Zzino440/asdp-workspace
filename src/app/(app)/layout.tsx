import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { listToApprove } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";
import { APP_VERSION } from "@/lib/version";
import { logout } from "../login/actions";

// Il guscio della pagina è statico; la parte che legge la sessione arriva in streaming
// dietro <Suspense> (requisito di Cache Components in Next 16).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r bg-muted/30 p-4">
        <div className="flex items-baseline justify-between px-3">
          <span className="text-sm font-semibold">ASDP Workspace</span>
          <span className="font-mono text-xs text-muted-foreground">v{APP_VERSION}</span>
        </div>
        {/* Fallback vuoto: AppSidebar legge usePathname(), che sulle route dinamiche
            non è disponibile nel prerender. */}
        <Suspense fallback={null}>
          <SidebarForUser />
        </Suspense>
      </aside>
      <main className="min-w-0 flex-1 p-8">{children}</main>
      <Toaster position="bottom-right" />
    </div>
  );
}

async function SidebarForUser() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect("/login");

  const [{ data: profile }, toApprove] = await Promise.all([
    supabase.from("profiles").select("full_name, email, is_admin").eq("id", userId).single(),
    listToApprove(supabase),
  ]);

  return (
    <>
      <AppSidebar isAdmin={profile?.is_admin ?? false} toApprove={toApprove.length} />
      <div className="mt-auto flex flex-col gap-2 px-3 text-sm">
        <span className="truncate font-medium">{profile?.full_name || profile?.email}</span>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Esci
          </Button>
        </form>
      </div>
    </>
  );
}
