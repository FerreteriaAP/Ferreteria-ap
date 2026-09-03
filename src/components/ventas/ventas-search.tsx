"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getVentasSugerencias } from "@/actions/ventas";
import { Search, X } from "lucide-react";

interface Props {
  defaultValue?: string;
  tipo?: string;
  sortBy?: string;
  sortDir?: string;
  pdv?: boolean;
}

type Sugerencia = { label: string; sublabel?: string; value: string };

export function VentasSearch({ defaultValue = "", tipo = "", sortBy = "", sortDir = "desc", pdv = false }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  const navegar = (valor: string) => {
    const params = new URLSearchParams();
    if (tipo) params.set("tipo", tipo);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortDir) params.set("sortDir", sortDir);
    if (pdv) params.set("pdv", "1");
    params.set("q", valor);
    params.set("page", "1");
    router.push(`/ventas?${params.toString()}`);
    setAbierto(false);
  };

  const handleChange = (val: string) => {
    setQuery(val);
    setActivo(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val.trim()) { setSugerencias([]); setAbierto(false); return; }
    timerRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await getVentasSugerencias(val);
        setSugerencias(res);
        setAbierto(res.length > 0);
      });
    }, 220);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!abierto || !sugerencias.length) {
      if (e.key === "Enter") { e.preventDefault(); navegar(query); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActivo(p => Math.min(p + 1, sugerencias.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo(p => Math.max(p - 1, -1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (activo >= 0) { setQuery(sugerencias[activo].value); navegar(sugerencias[activo].value); }
      else navegar(query);
    }
    else if (e.key === "Escape") { setAbierto(false); setActivo(-1); }
  };

  // Cierra al clicar fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (listaRef.current && !listaRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const limpiar = () => { setQuery(""); setSugerencias([]); setAbierto(false); navegar(""); inputRef.current?.focus(); };

  return (
    <div className="relative max-w-sm w-full">
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-3 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (sugerencias.length > 0) setAbierto(true); }}
          placeholder="Número, cliente, NCF…"
          className="w-full h-9 rounded-md border bg-background pl-8 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {abierto && sugerencias.length > 0 && (
        <div
          ref={listaRef}
          className="absolute z-50 top-full mt-1 w-full border rounded-xl shadow-xl overflow-hidden"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          {sugerencias.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => { e.preventDefault(); setQuery(s.value); navegar(s.value); }}
              onMouseEnter={() => setActivo(i)}
              className="w-full text-left px-3 py-2.5 border-b last:border-0 transition-colors flex items-center justify-between gap-3"
              style={{
                backgroundColor: i === activo ? "color-mix(in oklch, var(--accent) 15%, var(--card))" : undefined,
              }}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium font-mono truncate" style={{ color: "var(--accent-hex)" }}>
                  {s.label}
                </p>
                {s.sublabel && (
                  <p className="text-xs text-muted-foreground truncate">{s.sublabel}</p>
                )}
              </div>
              <Search size={11} className="text-muted-foreground/40 shrink-0" />
            </button>
          ))}
          {/* Opción de búsqueda libre */}
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); navegar(query); }}
            className="w-full text-left px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground hover:bg-muted/40 transition-colors border-t"
          >
            <Search size={11} />
            Buscar &ldquo;{query}&rdquo; en todos los campos
          </button>
        </div>
      )}
    </div>
  );
}
