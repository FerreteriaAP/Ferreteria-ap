import { notFound } from "next/navigation";
import Link from "next/link";
import { getEmpleado, getEstadisticasEmpleado } from "@/actions/empleados";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MesFiltroEmpleado } from "@/components/empleados/mes-filtro-empleado";
import { User, Banknote, CreditCard, BarChart2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filtro?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVO: "default",
  INACTIVO: "secondary",
  SUSPENDIDO: "destructive",
};

const CARD_BG = "color-mix(in srgb, var(--card) 55%, transparent)";
const ACCENT  = "var(--accent-hex)";

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border" style={{ backgroundColor: CARD_BG }}>
      <div
        className="px-5 py-3 border-b rounded-t-xl flex items-center gap-2"
        style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}
      >
        {icon && <span style={{ color: ACCENT }}>{icon}</span>}
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div
      className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0"
      style={{ borderColor: "color-mix(in oklch, var(--border) 50%, transparent)" }}
    >
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">{label}</span>
      <span className={mono ? "font-mono text-sm text-right" : "text-sm font-medium text-right"}>{value}</span>
    </div>
  );
}

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-1"
      style={{
        backgroundColor: `color-mix(in oklch, ${color} 8%, var(--card))`,
        borderColor: `color-mix(in oklch, ${color} 25%, var(--border))`,
      }}
    >
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function EmpleadoPage({ params, searchParams }: PageProps) {
  const [{ id }, sp, session] = await Promise.all([params, searchParams, auth()]);

  const empleado = await getEmpleado(id);
  if (!empleado) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rolAdmin = ((session?.user) as any)?.rol ?? "";
  const esAdmin = rolAdmin === "ADMINISTRADOR";

  const esVendedor = empleado.usuario?.rol === "VENDEDOR";
  const mostrarActividad = esAdmin && esVendedor;

  const mesDefault = new Date().toISOString().slice(0, 7);
  const filtro = sp.filtro ?? mesDefault;

  const stats = mostrarActividad
    ? await getEstadisticasEmpleado(empleado.id, filtro)
    : null;

  const salarioQuincenal = Number(empleado.salarioBase) / 2;

  const filtroLabel = (() => {
    if (!sp.filtro) return new Date(`${mesDefault}-15`).toLocaleDateString("es-DO", { month: "long", year: "numeric" });
    if (/^\d{4}-\d{2}$/.test(filtro)) return new Date(`${filtro}-15`).toLocaleDateString("es-DO", { month: "long", year: "numeric" });
    if (/^\d{4}$/.test(filtro)) return `Año ${filtro}`;
    return "Todo el tiempo";
  })();

  return (
    <div className="space-y-5 max-w-4xl">

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/empleados">Empleados</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{empleado.nombre} {empleado.apellido}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{empleado.nombre} {empleado.apellido}</h1>
            <Badge variant={estadoVariant[empleado.estado]}>{empleado.estado}</Badge>
          </div>
          {(empleado.cargo || empleado.departamento) && (
            <p className="text-sm text-muted-foreground">
              {empleado.cargo}{empleado.departamento ? ` — ${empleado.departamento}` : ""}
            </p>
          )}
        </div>
        <Link
          href={`/empleados/${id}/editar`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
        >
          Editar
        </Link>
      </div>

      {/* Tarjetas de datos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <Section title="Datos personales" icon={<User size={13} />}>
          <div className="space-y-0">
            <Row label="Cédula"        value={empleado.cedula} mono />
            <Row label="Teléfono"      value={empleado.telefono} mono />
            <Row label="Email"         value={empleado.email} />
            <Row label="Fecha ingreso" value={new Date(empleado.fechaIngreso).toLocaleDateString("es-DO")} />
            <Row
              label="Nacimiento"
              value={empleado.fechaNacimiento
                ? new Date(empleado.fechaNacimiento).toLocaleDateString("es-DO")
                : null}
            />
          </div>
        </Section>

        <Section title="Salario" icon={<Banknote size={13} />}>
          <div className="space-y-0">
            <Row label="Salario mensual"   value={fmt(empleado.salarioBase)} mono />
            <Row label="Salario quincenal" value={fmt(salarioQuincenal)} mono />
            <Row label="AFP"               value={empleado.afp} />
            <Row label="SFS"               value={empleado.sfs} />
            <Row label="NSS"               value={empleado.nss} mono />
          </div>
        </Section>

        {empleado.bancoCuenta && (
          <Section title="Datos bancarios" icon={<CreditCard size={13} />}>
            <div className="space-y-0">
              <Row label="Banco"  value={empleado.bancoCuenta} />
              <Row label="Cuenta" value={empleado.cuentaBancaria} mono />
              <Row label="Tipo"   value={empleado.tipoCuenta} />
            </div>
          </Section>
        )}

      </div>

      {/* Cuadro de actividad — solo admin + VENDEDOR */}
      {mostrarActividad && stats && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD_BG }}>
          {/* Header */}
          <div
            className="px-5 py-3 border-b flex items-center justify-between gap-3 flex-wrap"
            style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}
          >
            <div className="flex items-center gap-2">
              <span style={{ color: ACCENT }}><BarChart2 size={13} /></span>
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
                Actividad · {filtroLabel}
              </h2>
            </div>
            <MesFiltroEmpleado empleadoId={id} filtroActual={sp.filtro} mesDefault={mesDefault} />
          </div>

          <div className="p-5 space-y-5">

            {/* PDV */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Punto de Venta (PDV)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatTile label="Ventas PDV" value={stats.pdvTotal} color="#22c55e" />
              </div>
            </div>

            {/* Módulo de Ventas */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Módulo de Ventas
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile label="Cotizaciones"      value={stats.cotizaciones} color="#94a3b8" />
                <StatTile label="Órdenes de Venta"  value={stats.ordenes}      color="#3b82f6" />
                <StatTile label="Conduces"           value={stats.conduces}     color="#a855f7" />
                <StatTile label="Facturas"           value={stats.facturas}     color="#16a34a" />
              </div>
            </div>

            {/* Compras */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Compras
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatTile label="Órdenes de Compra" value={stats.ordenesCompra} color="#f59e0b" />
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
