"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { DateWidget } from "./date-widget";
import { TemaQuickBtn } from "./tema-quick-btn";
import { clearVendedorActivo } from "@/actions/vendedor-activo";

interface AppHeaderProps {
  name:         string;
  email:        string;
  rol:          string;
  initials:     string;
  alertas?:     number;
  cajaAbierta?: boolean;
  temaActual?:  string;
  mostrarTema?: boolean;
}

export function AppHeader({ name, email, rol, initials, alertas = 0, cajaAbierta = false, temaActual = "dark-ops", mostrarTema = false }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [, startLogo] = useTransition();

  function irAlDashboard() {
    startLogo(async () => {
      await clearVendedorActivo();
      router.push("/dashboard");
    });
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header
      className="h-[72px] shrink-0 w-full flex items-center justify-between px-6 z-50"
      style={{
        backgroundColor: "var(--header-bg-hex)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.20)",
      }}
    >
      {/* Left: Logo + divider + caja status */}
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={irAlDashboard}
          className="flex items-center hover:opacity-85 transition-opacity shrink-0 bg-transparent border-none p-0 cursor-pointer"
        >
          <svg width="42" height="42" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon
              points="133.7,10 181.3,57.6 181.3,142.4 133.7,190 66.3,190 18.7,142.4 18.7,57.6 66.3,10"
              style={{ fill: "var(--header-bg-hex)", stroke: "var(--foreground)", strokeWidth: 7, strokeLinejoin: "round" }}
            />
            <polygon
              points="127,23 170,66 170,134 127,177 73,177 30,134 30,66 73,23"
              style={{ fill: "none", stroke: "var(--foreground)", strokeWidth: 3, strokeLinejoin: "round" }}
            />
            <text x="100" y="100" textAnchor="middle" dominantBaseline="central"
              fontFamily="Arial Black, Impact, sans-serif"
              fontWeight="900" fontSize="84" letterSpacing="-3"
              style={{ fill: "var(--accent-hex)" }}>AP</text>
          </svg>
          <span className="ml-2.5 flex items-baseline gap-0.5 leading-none select-none">
            <span style={{ color: "var(--accent-hex)", fontWeight: 900, fontSize: 17, fontFamily: "'Arial Black', sans-serif", letterSpacing: "-0.02em" }}>F</span>
            <span style={{ color: "var(--foreground)", fontWeight: 900, fontSize: 17, fontFamily: "'Arial Black', sans-serif", letterSpacing: "-0.02em" }}>ERRETERÍA</span>
          </span>
        </button>

        <div className="mx-5 h-7 w-px" style={{ backgroundColor: "var(--border)" }} />

        {/* Caja status indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ backgroundColor: cajaAbierta ? "#22c55e" : "#ef4444" }}
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ backgroundColor: cajaAbierta ? "#22c55e" : "#ef4444" }}
            />
          </span>
          <span style={{ color: "var(--muted-foreground)", fontSize: 12, fontWeight: 500, letterSpacing: "0.04em" }}>
            {cajaAbierta ? "Caja abierta" : "Caja cerrada"}
          </span>
        </div>
      </div>

      {/* Right: Date + Bell + User */}
      <div className="flex items-center gap-3">

        <DateWidget />

        <div className="h-6 w-px" style={{ backgroundColor: "var(--border)" }} />

        <Link
          href="/alertas"
          className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--panel)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          title="Alertas"
        >
          <Bell size={18} />
          {alertas > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1
                rounded-full flex items-center justify-center text-[10px] font-bold leading-none"
              style={{ backgroundColor: "var(--warning)", color: "var(--warning-foreground)" }}
            >
              {alertas > 99 ? "99+" : alertas}
            </span>
          )}
        </Link>

        {mostrarTema && <TemaQuickBtn temaActual={temaActual} />}

        <div className="h-6 w-px" style={{ backgroundColor: "var(--border)" }} />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors select-none"
            style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--panel)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
              style={{ background: `linear-gradient(135deg, var(--accent-hex), color-mix(in oklch, var(--primary) 70%, black))`, color: "#fff" }}
            >
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold leading-none" style={{ color: "var(--foreground)" }}>{name}</p>
              <p className="text-[10px] mt-0.5 leading-none" style={{ color: "var(--muted-foreground)" }}>{rol}</p>
            </div>
            <ChevronDown
              size={14}
              className="transition-transform duration-150"
              style={{ transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50"
              style={{
                backgroundColor: "var(--panel)",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.50)",
              }}
            >
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>{name}</p>
                <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--muted-foreground)" }}>{email}</p>
                <span
                  className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "color-mix(in oklch, var(--primary) 15%, transparent)", color: "var(--accent-hex)" }}
                >
                  {rol}
                </span>
              </div>
              <div className="p-1.5">
                <Link
                  href="/configuracion"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ color: "var(--muted-foreground)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--card)"; (e.currentTarget as HTMLElement).style.color = "var(--foreground)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
                >
                  <User size={14} />
                  Perfil y configuración
                </Link>
                <button
                  onClick={async () => { await signOut({ redirect: false }); window.location.href = "/login"; }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ color: "var(--destructive)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "color-mix(in oklch, var(--destructive) 10%, transparent)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  <LogOut size={14} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
