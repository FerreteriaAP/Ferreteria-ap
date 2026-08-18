"use client";

import { useState, useRef, useEffect } from "react";

const DIAS   = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MESES_CORTO = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export function DateWidget() {
  const [open, setOpen]     = useState(false);
  const [today]             = useState(() => new Date());
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Construir celdas del mes
  const firstDay  = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Completar hasta múltiplo de 7
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const labelFecha = `${DIAS[today.getDay()]} ${today.getDate()} ${MESES_CORTO[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <div className="relative" ref={ref}>
      {/* Chip de fecha */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm select-none"
        style={{
          color: "var(--muted-foreground)",
          border: "1px solid var(--border)",
          backgroundColor: open ? "var(--panel)" : "transparent",
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--panel)")}
        onMouseLeave={e => !open && (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "var(--accent-hex)", flexShrink: 0 }}>
          <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{labelFecha}</span>
      </button>

      {/* Calendario desplegable */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--panel)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
            width: 264,
          }}
        >
          {/* Navegación mes/año */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <button
              onClick={prevMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--card)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              {MESES[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--card)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l4 5-4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 px-3 pt-2 pb-1">
            {DIAS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold py-1"
                style={{ color: "var(--muted-foreground)" }}>
                {d[0]}
              </div>
            ))}
          </div>

          {/* Celdas del mes */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day !== null ? (
                  <span
                    className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium"
                    style={
                      isToday(day)
                        ? {
                            backgroundColor: "var(--accent-hex)",
                            color: "#fff",
                            fontWeight: 700,
                          }
                        : { color: "var(--foreground)" }
                    }
                  >
                    {day}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
