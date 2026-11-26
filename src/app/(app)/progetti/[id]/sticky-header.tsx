"use client";

import { useEffect, useRef } from "react";

// Intestazione del progetto fissa in alto; la sua altezza va in --project-header-h così
// gli elementi sticky della pagina si ancorano subito sotto.
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    const observer = new ResizeObserver(() =>
      header.parentElement!.style.setProperty("--project-header-h", `${header.offsetHeight}px`),
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="sticky top-0 z-20 -mx-8 -mt-8 flex flex-col gap-4 bg-background px-8 pt-8">
      {children}
    </div>
  );
}
