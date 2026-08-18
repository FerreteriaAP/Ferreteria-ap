"use client";

import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  vista: "lista" | "grid";
  listaHref: string;
  gridHref: string;
}

function saveVista(v: "lista" | "grid") {
  document.cookie = `vista-preferida=${v}; path=/; max-age=31536000; SameSite=Lax`;
}

export function ViewToggle({ vista, listaHref, gridHref }: ViewToggleProps) {
  const btnBase = "h-8 w-8 flex items-center justify-center rounded-lg transition-colors";
  const active = "text-foreground border";
  const inactive = "text-muted-foreground hover:text-foreground";

  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded-lg"
      style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}
    >
      <Link
        href={listaHref}
        onClick={() => saveVista("lista")}
        className={cn(btnBase, vista === "lista" ? active : inactive)}
        style={vista === "lista" ? { backgroundColor: "var(--card)", borderColor: "var(--border)" } : {}}
        title="Vista lista"
      >
        <List size={15} />
      </Link>
      <Link
        href={gridHref}
        onClick={() => saveVista("grid")}
        className={cn(btnBase, vista === "grid" ? active : inactive)}
        style={vista === "grid" ? { backgroundColor: "var(--card)", borderColor: "var(--border)" } : {}}
        title="Vista tarjetas"
      >
        <LayoutGrid size={15} />
      </Link>
    </div>
  );
}
