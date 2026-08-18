import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Empleado = {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  cargo: string;
  departamento: string | null;
  salarioBase: unknown;
  estado: string;
  fechaIngreso: Date | string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) =>
  `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVO: "default",
  INACTIVO: "secondary",
  SUSPENDIDO: "destructive",
};

const iniciales = (nombre: string, apellido: string) => {
  const n = nombre.trim()[0] ?? "";
  const a = apellido.trim()[0] ?? "";
  return (n + a).toUpperCase();
};

export function EmpleadosGrid({ empleados }: { empleados: Empleado[] }) {
  if (empleados.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="font-medium">Sin empleados</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 px-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
      {empleados.map((e) => (
        <div
          key={e.id}
          className="rounded-xl p-4 flex flex-col gap-3 transition-shadow hover:shadow-md"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          {/* Header con avatar */}
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, var(--accent-hex), color-mix(in oklch, var(--primary) 70%, black))",
                color: "#fff",
              }}
            >
              {iniciales(e.nombre, e.apellido)}
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/empleados/${e.id}`}
                className="font-semibold text-sm leading-tight hover:underline block truncate"
                style={{ color: "var(--foreground)" }}
              >
                {e.nombre} {e.apellido}
              </Link>
              <span className="text-[11px] font-mono mt-0.5 block" style={{ color: "var(--muted-foreground)" }}>
                {e.cedula}
              </span>
            </div>
            <Badge variant={estadoVariant[e.estado] ?? "outline"} className="text-[10px] shrink-0">
              {e.estado}
            </Badge>
          </div>

          {/* Info */}
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-20 shrink-0">Cargo</span>
              <span className="text-xs font-medium truncate">{e.cargo}</span>
            </div>
            {e.departamento && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-20 shrink-0">Depto.</span>
                <span className="text-xs truncate">{e.departamento}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-20 shrink-0">Salario</span>
              <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--accent-hex)" }}>
                {fmt(e.salarioBase)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-20 shrink-0">Ingreso</span>
              <span className="text-xs text-muted-foreground">
                {new Date(e.fechaIngreso).toLocaleDateString("es-DO")}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-1" style={{ borderTop: "1px solid var(--border)" }}>
            <Link
              href={`/empleados/${e.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full text-xs h-7")}
            >
              Ver perfil
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
