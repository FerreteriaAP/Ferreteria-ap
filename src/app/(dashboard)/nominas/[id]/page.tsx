import Link from "next/link";
import { notFound } from "next/navigation";
import { getNomina } from "@/actions/nominas";
import { NominaAcciones } from "@/components/nominas/nomina-acciones";
import { NominaTabla } from "@/components/nominas/nomina-tabla";

interface PageProps {
  params: Promise<{ id: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) =>
  `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const CARD_BG   = "color-mix(in srgb, var(--card) 55%, transparent)";
const HEADER_BG = "color-mix(in oklch, var(--foreground) 4%, var(--card))";

const PERIODO_LABEL: Record<string, string> = {
  PRIMERA_QUINCENA: "1ra Quincena (días 1–15)",
  SEGUNDA_QUINCENA: "2da Quincena (días 16–fin)",
};

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const ESTADO_STYLE: Record<string, { bg: string; text: string }> = {
  BORRADOR:  { bg: "color-mix(in oklch, var(--foreground) 6%, var(--card))",  text: "var(--muted-foreground)" },
  PROCESADA: { bg: "color-mix(in oklch, #3b82f6 10%, var(--card))",           text: "#3b82f6"                 },
  PAGADA:    { bg: "color-mix(in oklch, #16a34a 10%, var(--card))",           text: "#16a34a"                 },
};

export default async function NominaPage({ params }: PageProps) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nomina = (await getNomina(id)) as any;
  if (!nomina) notFound();

  const est = ESTADO_STYLE[nomina.estado] ?? ESTADO_STYLE.BORRADOR;

  // Totales de aportes empleador (TSS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afpEr  = nomina.empleados.reduce((s: number, l: any) => s + Number(l.afpEmpleador), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sfsEr  = nomina.empleados.reduce((s: number, l: any) => s + Number(l.sfsEmpleador), 0);

  // Desglose de descuentos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalAfp  = nomina.empleados.reduce((s: number, l: any) => s + Number(l.afpEmpleado), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalSfs  = nomina.empleados.reduce((s: number, l: any) => s + Number(l.sfsEmpleado), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPres = nomina.empleados.reduce((s: number, l: any) => s + Number(l.prestamos), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalSan  = nomina.empleados.reduce((s: number, l: any) => s + Number(l.san), 0);

  return (
    <div className="space-y-5 max-w-full">

      {/* Botón volver */}
      <div>
        <Link
          href="/nominas"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
          style={{
            backgroundColor: "color-mix(in oklch, var(--accent-hex) 14%, transparent)",
            color: "var(--accent-hex)",
          }}
        >
          ← Nóminas
        </Link>
      </div>

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold" style={{ color: "var(--accent-hex)" }}>
              {nomina.numero}
            </h1>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: est.bg, color: est.text }}
            >
              {nomina.estado}
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {PERIODO_LABEL[nomina.periodo]} — {MESES[nomina.mes]} {nomina.anio}
            {nomina.fechaPago && (
              <span className="ml-3 opacity-70">
                · Pago:{" "}
                {new Date(nomina.fechaPago).toLocaleDateString("es-DO", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </span>
            )}
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {nomina.empleados.length} empleado{nomina.empleados.length !== 1 ? "s" : ""} incluido{nomina.empleados.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Acciones */}
        <NominaAcciones nominaId={id} numero={nomina.numero} estado={nomina.estado} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total bruto */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: CARD_BG }}
        >
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Total bruto
          </p>
          <p className="text-xl font-bold mt-1.5 tabular-nums">{fmt(nomina.totalBruto)}</p>
          <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
            Salario + devengados de todos los empleados
          </p>
        </div>

        {/* Total descuentos */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: CARD_BG }}
        >
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Total descuentos
          </p>
          <p className="text-xl font-bold mt-1.5 tabular-nums">{fmt(nomina.totalDescuentos)}</p>
          <div className="mt-2 space-y-0.5">
            {[
              { label: "AFP emp.", val: totalAfp },
              { label: "SFS emp.", val: totalSfs },
              ...(totalPres > 0 ? [{ label: "Préstamos", val: totalPres }] : []),
              ...(totalSan  > 0 ? [{ label: "SAN",       val: totalSan  }] : []),
            ].map((d) => (
              <div key={d.label} className="flex justify-between text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                <span>{d.label}</span>
                <span className="tabular-nums">{fmt(d.val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total neto — destacado */}
        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: "color-mix(in oklch, var(--accent-hex) 2%, var(--card))",
            borderColor: "color-mix(in oklch, var(--accent-hex) 12%, var(--border))",
          }}
        >
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Total neto a pagar
          </p>
          <p className="text-xl font-bold mt-1.5 tabular-nums" style={{ color: "var(--accent-hex)" }}>
            {fmt(nomina.totalNeto)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
            Lo que recibe cada empleado en mano
          </p>
        </div>
      </div>

      {/* Sin empleados */}
      {nomina.empleados.length === 0 && (
        <div
          className="rounded-xl border p-5 text-sm"
          style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 4%, var(--card))", borderColor: "color-mix(in oklch, var(--accent-hex) 20%, var(--border))" }}
        >
          <p className="font-semibold" style={{ color: "var(--accent-hex)" }}>
            Esta nómina no tiene empleados
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            Fue generada antes de registrar empleados. Crea una nueva nómina desde la lista.
          </p>
        </div>
      )}

      {/* Planilla */}
      {nomina.empleados.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "var(--accent-hex)" }} />
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Planilla — {nomina.empleados.length} empleado{nomina.empleados.length !== 1 ? "s" : ""}
              </h2>
            </div>
            {nomina.estado === "BORRADOR" && (
              <span className="text-xs font-medium" style={{ color: "#3b82f6" }}>
                Edición habilitada · modifica directamente en la tabla
              </span>
            )}
          </div>

          <NominaTabla
            nominaId={id}
            estado={nomina.estado}
            numero={nomina.numero}
            periodo={nomina.periodo}
            mes={nomina.mes}
            anio={nomina.anio}
            lineas={nomina.empleados}
          />
        </div>
      )}

      {/* Aportes empleador TSS */}
      {nomina.empleados.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: CARD_BG }}
        >
          <button
            // This is a native <details> wrapper — kept as div for styling
            className="w-full text-left"
          >
            <details className="group">
              <summary
                className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none list-none hover:brightness-105 transition-all"
                style={{ backgroundColor: HEADER_BG }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "var(--muted-foreground)", opacity: 0.4 }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                    Aportes empleador (TSS — declaración DGSS)
                  </span>
                </div>
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Ver ▾</span>
              </summary>
              <div className="px-5 py-4 space-y-2 text-sm">
                {[
                  { label: "AFP empleador (7.10%)", val: afpEr  },
                  { label: "SFS empleador (7.09%)", val: sfsEr  },
                  { label: "Total aportes empleador", val: afpEr + sfsEr, bold: true },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex justify-between py-2"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <span style={{ color: "var(--muted-foreground)", fontWeight: r.bold ? 600 : 400 }}>
                      {r.label}
                    </span>
                    <span
                      className="tabular-nums font-mono text-xs"
                      style={{ fontWeight: r.bold ? 700 : 400 }}
                    >
                      {fmt(r.val)}
                    </span>
                  </div>
                ))}
                <p className="text-[10px] pt-1" style={{ color: "var(--muted-foreground)" }}>
                  Estos valores son los aportes que la empresa paga a la DGSS — no se descuentan del empleado.
                </p>
              </div>
            </details>
          </button>
        </div>
      )}
    </div>
  );
}
