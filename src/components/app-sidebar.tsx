"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CheckSquare, FolderKanban, LayoutDashboard, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/progetti", label: "Progetti", icon: FolderKanban, adminOnly: false },
  { href: "/approvazioni", label: "Approvazioni", icon: CheckSquare, adminOnly: false },
  { href: "/guida", label: "Guida", icon: BookOpen, adminOnly: false },
  { href: "/amministrazione", label: "Amministrazione", icon: Settings, adminOnly: true },
];

export function AppSidebar({
  isAdmin,
  toApprove,
  projects,
}: {
  isAdmin: boolean;
  toApprove: number;
  // Progetti non chiusi visibili; sotto «Progetti» quelli del proprio team più quello aperto.
  projects: { id: string; name: string; mine: boolean }[];
}) {
  const pathname = usePathname();
  const isProject = (id: string) => pathname === `/progetti/${id}` || pathname.startsWith(`/progetti/${id}/`);
  const activeProject = projects.find((p) => isProject(p.id));
  const shown = projects.filter((p) => p.mine || p === activeProject);

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly).map(({ href, label, icon: Icon }) => (
        <Fragment key={href}>
          <Link
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              pathname.startsWith(href) &&
                (href === "/progetti" && activeProject ? "text-foreground" : "bg-muted font-medium text-foreground"),
            )}
          >
            <Icon className="size-4" />
            {label}
            {href === "/approvazioni" && toApprove > 0 && (
              <Badge className="ml-auto" aria-label={`${toApprove} da approvare`}>
                {toApprove}
              </Badge>
            )}
          </Link>
          {href === "/progetti" && shown.length > 0 && (
            <div className="ml-5 flex flex-col gap-0.5 border-l pl-2">
              {shown.map((p) => (
                <Link
                  key={p.id}
                  href={`/progetti/${p.id}`}
                  title={p.name}
                  aria-current={p === activeProject ? "page" : undefined}
                  className={cn(
                    "truncate rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                    p === activeProject && "bg-muted font-medium text-foreground",
                  )}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
