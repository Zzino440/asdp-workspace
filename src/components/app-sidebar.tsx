"use client";

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

export function AppSidebar({ isAdmin, toApprove }: { isAdmin: boolean; toApprove: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
            pathname.startsWith(href) && "bg-muted font-medium text-foreground",
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
      ))}
    </nav>
  );
}
