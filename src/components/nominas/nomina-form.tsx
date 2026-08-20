"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { crearNomina } from "@/actions/nominas";
import { cn } from "@/lib/utils";

const hoy = new Date();
const mesAct  = hoy.getMonth() + 1;
const anioAct = hoy.getFullYear();

const MESES = [
  { v: "1",  l: "Enero"      }, { v: "2",  l: "Febrero"   },
  { v: "3",  l: "Marzo"      }, { v: "4",  l: "Abril"     },
  { v: "5",  l: "Mayo"       }, { v: "6",  l: "Junio"     },
  { v: "7",  l: "Julio"      }, { v: "8",  l: "Agosto"    },
  { v: "9",  l: "Septiembre" }, { v: "10", l: "Octubre"   },
  { v: "11", l: "Noviembre"  }, { v: "12", l: "Diciembre" },
];

export function NominaForm() {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<"PRIMERA_QUINCENA" | "SEGUNDA_QUINCENA">("PRIMERA_QUINCENA");
  const [mes,     setMes]     = useState(String(mesAct));
  const [anio,    setAnio]    = useState(String(anioAct));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const result = await crearNomina({
      periodo,
      mes:      Number(mes),
      anio:     Number(anio),
      fechaPago: fd.get("fechaPago") as string || undefined,
    });

    setLoading(false);
    if ("error" in result) { setError(result.error as string); return; }
    router.push(`/nominas/${result.id}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>}

      {/* Período */}
      <div className="space-y-1.5">
        <Label>Período</Label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: "PRIMERA_QUINCENA", label: "1ra Quincena", sub: "días 1–15" },
            { value: "SEGUNDA_QUINCENA", label: "2da Quincena", sub: "días 16–fin" },
          ] as const).map((op) => {
            const activo = periodo === op.value;
            return (
              <button
                key={op.value}
                type="button"
                onClick={() => setPeriodo(op.value)}
                className="rounded-lg border px-3 py-2.5 text-left transition-all"
                style={{
                  backgroundColor: activo
                    ? "color-mix(in oklch, var(--accent-hex) 12%, var(--card))"
                    : "color-mix(in srgb, var(--card) 55%, transparent)",
                  borderColor: activo
                    ? "var(--accent-hex)"
                    : "var(--border)",
                }}
              >
                <p className="text-xs font-semibold" style={{ color: activo ? "var(--accent-hex)" : "var(--foreground)" }}>
                  {op.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{op.sub}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mes y Año */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Mes</Label>
          <Select value={mes} onValueChange={(v) => v && setMes(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((m) => (
                <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Año</Label>
          <Input
            type="number"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            min="2020"
            max="2035"
          />
        </div>
      </div>

      {/* Fecha de pago */}
      <div className="space-y-1.5">
        <Label>Fecha de pago</Label>
        <Input name="fechaPago" type="date" />
        <p className="text-xs text-muted-foreground">Opcional — se puede actualizar después</p>
      </div>

      <Separator />

      {/* Info cálculos */}
      <div className="rounded-lg border p-3 text-xs text-muted-foreground space-y-1"
        style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}>
        <p className="font-semibold text-foreground">Cálculos automáticos:</p>
        <p>• AFP empleado: 2.87% del salario</p>
        <p>• SFS empleado: 3.04% del salario</p>
        <p>• SAM (subsidio alimentación): RD$ 1,000 por quincena</p>
        <p>• Se incluyen todos los empleados activos</p>
      </div>

      {/* Delimitador ancho completo */}
      <div className="-mx-5 border-t" style={{ borderColor: "var(--border)" }} />

      <button
        type="submit"
        disabled={loading}
        className={cn(buttonVariants({ variant: "outline" }), "w-full font-semibold", loading && "opacity-50 pointer-events-none")}
        style={{ color: "var(--accent-hex)", borderColor: "var(--accent-hex)" }}
      >
        {loading ? "Creando..." : "Crear nómina"}
      </button>
    </form>
  );
}
