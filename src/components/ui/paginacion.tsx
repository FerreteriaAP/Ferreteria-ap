import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginacionProps {
  page: number;
  pages: number;
  buildHref: (p: number) => string;
}

export function Paginacion({ page, pages, buildHref }: PaginacionProps) {
  if (pages <= 1) return null;

  // Mostrar hasta 7 páginas alrededor de la actual
  const WINDOW = 3;
  const start = Math.max(1, page - WINDOW);
  const end = Math.min(pages, page + WINDOW);
  const nums: number[] = [];
  for (let i = start; i <= end; i++) nums.push(i);

  const btnBase =
    "inline-flex items-center justify-center h-8 min-w-[2rem] px-2 rounded-md text-sm font-medium transition-colors";
  const btnActive = "bg-primary text-primary-foreground";
  const btnInactive = "border hover:bg-muted/60 text-foreground";
  const btnDisabled = "opacity-30 pointer-events-none border";

  return (
    <div className="flex items-center justify-center gap-1">
      {/* Anterior */}
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={cn(btnBase, btnInactive)}>
          <ChevronLeft size={14} />
        </Link>
      ) : (
        <span className={cn(btnBase, btnDisabled)}>
          <ChevronLeft size={14} />
        </span>
      )}

      {/* Primera página + ellipsis */}
      {start > 1 && (
        <>
          <Link href={buildHref(1)} className={cn(btnBase, btnInactive)}>1</Link>
          {start > 2 && <span className="px-1 text-muted-foreground text-sm">…</span>}
        </>
      )}

      {/* Páginas visibles */}
      {nums.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          className={cn(btnBase, p === page ? btnActive : btnInactive)}
        >
          {p}
        </Link>
      ))}

      {/* Última página + ellipsis */}
      {end < pages && (
        <>
          {end < pages - 1 && <span className="px-1 text-muted-foreground text-sm">…</span>}
          <Link href={buildHref(pages)} className={cn(btnBase, btnInactive)}>{pages}</Link>
        </>
      )}

      {/* Siguiente */}
      {page < pages ? (
        <Link href={buildHref(page + 1)} className={cn(btnBase, btnInactive)}>
          <ChevronRight size={14} />
        </Link>
      ) : (
        <span className={cn(btnBase, btnDisabled)}>
          <ChevronRight size={14} />
        </span>
      )}
    </div>
  );
}
