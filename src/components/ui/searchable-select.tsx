"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectItem {
  id: string;
  /** Main label — bold, left side */
  label: string;
  /** Secondary text — muted, right side (e.g. RNC, code) */
  sublabel?: string | null;
  /** Extra badge line below — e.g. "30 días de crédito" */
  badge?: string | null;
}

interface SearchableSelectProps {
  items: SearchableSelectItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}

/**
 * Combobox with an inline search input inside the dropdown.
 * Filters items client-side by label or sublabel.
 */
export function SearchableSelect({
  items,
  value,
  onChange,
  placeholder = "Seleccionar…",
  searchPlaceholder = "Buscar por nombre…",
  className,
}: SearchableSelectProps) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef    = useRef<HTMLInputElement>(null);

  const selected = items.find(i => i.id === value);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(i =>
        i.label.toLowerCase().includes(q) ||
        (i.sublabel?.toLowerCase().includes(q) ?? false)
      )
    : items;

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>

      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => { setOpen(p => !p); setQuery(""); }}
        className="w-full h-9 flex items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-sm transition-colors hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-ring/50"
      >
        {selected ? (
          <span className="flex-1 text-left truncate">{selected.label}</span>
        ) : (
          <span className="flex-1 text-left text-muted-foreground">{placeholder}</span>
        )}
        <span className="flex items-center gap-0.5 shrink-0 text-muted-foreground">
          {selected && (
            <span
              onClick={clear}
              className="p-0.5 rounded hover:bg-muted/60 hover:text-foreground transition-colors"
              aria-label="Limpiar"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={14} className={cn("transition-transform duration-150", open && "rotate-180")} />
        </span>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-xl border shadow-xl overflow-hidden"
          style={{
            backgroundColor: "var(--card-bg-hex, var(--card))",
            borderColor:     "var(--card-border-hex, var(--border))",
          }}
        >
          {/* Search row */}
          <div className="px-2 pt-2 pb-1.5 border-b" style={{ borderColor: "var(--card-border-hex, var(--border))" }}>
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Escape") { setOpen(false); setQuery(""); }
                  if (e.key === "Enter" && filtered.length === 1) select(filtered[0].id);
                }}
                placeholder={searchPlaceholder}
                className="w-full h-7 pl-7 pr-3 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/50"
                autoComplete="off"
              />
            </div>
            {q && (
              <p className="mt-1 text-[10px] text-muted-foreground px-0.5">
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Results list */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-4 text-sm text-center text-muted-foreground">Sin resultados para &ldquo;{query}&rdquo;</p>
            ) : (
              filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={() => select(item.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 transition-colors border-b last:border-0 hover:bg-muted/40",
                    item.id === value && "bg-muted/30",
                  )}
                  style={{ borderColor: "var(--card-border-hex, var(--border))" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-sm truncate">{item.label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.sublabel && (
                        <span className="text-xs text-muted-foreground font-mono">{item.sublabel}</span>
                      )}
                      {item.id === value && (
                        <Check size={12} className="text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] mt-0.5 block" style={{ color: "#3b82f6" }}>{item.badge}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
