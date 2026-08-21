"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Contacto = {
  id: string;
  tipo: "CLIENTE" | "SUPLIDOR" | "AMBOS";
  nombre: string;
  rnc: string | null;
  telefono: string | null;
  credito: string;
  tipoComprobante: string;
  activo: boolean;
  direcciones: { etiqueta: string; ciudad: string; esPrincipal: boolean }[];
};

const tipoLabel: Record<string, string> = {
  CLIENTE: "Cliente",
  SUPLIDOR: "Suplidor",
  AMBOS: "Ambos",
};

// Colores inline para máxima consistencia con el tema
const tipoStyle: Record<string, React.CSSProperties> = {
  CLIENTE:  { backgroundColor: "#16a34a22", color: "#16a34a", border: "1px solid #16a34a55" },
  SUPLIDOR: { backgroundColor: "#dc262622", color: "#dc2626", border: "1px solid #dc262655" },
  AMBOS:    { backgroundColor: "var(--card)", color: "var(--muted-foreground)", border: "1px solid var(--border)" },
};

const creditoLabel: Record<string, string> = {
  CONTADO: "Contado", DIAS_10: "10 días", DIAS_15: "15 días",
  DIAS_30: "30 días", DIAS_45: "45 días", DIAS_60: "60 días", DIAS_90: "90 días",
};

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] shrink-0" style={{ color: "var(--muted-foreground)", width: 52 }}>
        {label}
      </span>
      <span className="text-xs truncate" style={{ color: "var(--foreground)" }}>
        {children}
      </span>
    </div>
  );
}

export function ContactosGrid({ contactos }: { contactos: Contacto[] }) {
  if (contactos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="font-medium">Sin contactos</p>
        <p className="text-sm">Crea el primer cliente o suplidor</p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-3 px-1"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
    >
      {contactos.map((c) => {
        const dirPrincipal = c.direcciones.find((d) => d.esPrincipal) ?? c.direcciones[0];
        return (
          <Link
            key={c.id}
            href={`/contactos/${c.id}`}
            className={cn(
              "group rounded-xl p-4 flex flex-col gap-3 transition-all duration-150 cursor-pointer h-full",
              "hover:shadow-md hover:-translate-y-px",
              !c.activo && "opacity-55"
            )}
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            {/* Nombre + badge tipo */}
            <div className="flex items-start gap-2">
              <span
                className="font-bold text-sm leading-snug line-clamp-2 flex-1"
                style={{ color: "var(--accent-hex)" }}
              >
                {c.nombre}
              </span>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={tipoStyle[c.tipo]}
                >
                  {tipoLabel[c.tipo]}
                </span>
                {!c.activo && (
                  <span className="text-[10px] text-muted-foreground">Inactivo</span>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="space-y-1.5">
              {c.rnc && <InfoRow label="RNC">{c.rnc}</InfoRow>}
              {c.telefono && <InfoRow label="Tel.">{c.telefono}</InfoRow>}
              {dirPrincipal?.ciudad && <InfoRow label="Ciudad">{dirPrincipal.ciudad}</InfoRow>}
              <InfoRow label="Crédito">{creditoLabel[c.credito] ?? c.credito}</InfoRow>
              <InfoRow label="NCF">
                <span className="font-mono text-[11px]">{c.tipoComprobante}</span>
              </InfoRow>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
