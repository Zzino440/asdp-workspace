import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, File, FileImage, FileSpreadsheet, FileText, Folder, Presentation } from "lucide-react";
import { cn } from "cn";
import { TableHead } from "@/components/ui/table";

// Pezzi comuni ai navigatori di file della scheda File (Teams/SharePoint e file di supporto su GitLab).

// Icona per tipo di file, dall'estensione.
export function FileIcon({ item }: { item: { name: string; folder?: unknown } }) {
  if (item.folder) return <Folder className="size-4 shrink-0 text-muted-foreground" />;
  const ext = item.name.split(".").pop()?.toLowerCase() ?? "";
  const Icon = ["doc", "docx", "pdf", "txt", "md", "rtf"].includes(ext)
    ? FileText
    : ["xls", "xlsx", "csv"].includes(ext)
      ? FileSpreadsheet
      : ["ppt", "pptx"].includes(ext)
        ? Presentation
        : ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)
          ? FileImage
          : File;
  return <Icon className="size-4 shrink-0 text-muted-foreground" />;
}

// Intestazione ordinabile, a tre stati: crescente → decrescente → nessun ordinamento.
// href riceve il nuovo ordinamento (undefined = nessuno) e il verso.
export function SortHead({
  label,
  active,
  desc,
  href,
  className,
}: {
  label: string;
  active: boolean;
  desc: boolean;
  href: (sort: { reset: boolean; desc: boolean }) => string;
  className?: string;
}) {
  const reset = active && desc;
  const Icon = !active ? ArrowUpDown : desc ? ArrowDown : ArrowUp;
  return (
    <TableHead className={className} aria-sort={active ? (desc ? "descending" : "ascending") : undefined}>
      <Link
        href={href({ reset, desc: active && !desc })}
        scroll={false}
        title={reset ? "Togli ordinamento" : active ? "Ordina decrescente" : "Ordina crescente"}
        className={cn("inline-flex items-center gap-1 hover:text-foreground", !active && "text-muted-foreground")}
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-50")} />
      </Link>
    </TableHead>
  );
}
