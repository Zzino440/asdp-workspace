import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../login/actions";

// Il guscio della pagina è statico; la parte che legge la sessione arriva in streaming
// dietro <Suspense> (requisito di Cache Components in Next 16).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col gap-6 border-r bg-muted/30 p-4">
        <div className="px-3 text-sm font-semibold">ASDP Workspace</div>
        <Suspense fallback={<AppSidebar isAdmin={false} />}>
          <SidebarForUser />
        </Suspense>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

async function SidebarForUser() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, is_admin")
    .eq("id", userId)
    .single();

  return (
    <>
      <AppSidebar isAdmin={profile?.is_admin ?? false} />
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
