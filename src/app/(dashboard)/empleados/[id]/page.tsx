import { notFound } from "next/navigation";
import Link from "next/link";
import { getEmpleado, getEstadisticasEmpleado } from "@/actions/empleados";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MesFiltroEmpleado } from "@/components/empleados/mes-filtro-empleado";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVO: "default",
  INACTIVO: "secondary",
  SUSPENDIDO: "destructive",
};

function Row({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-1"
      style={{ backgroundColor: `color-mix(in oklch, ${color} 8%, var(--card))`, borderColor: `color-mix(in oklch, ${color} 25%, var(--border))` }}
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
  const rol = ((session?.user) as any)?.rol ?? "";
  const esAdmin = rol === "ADMINISTRADOR";
  const mostrarActividad = esAdmin && !!empleado.usuario;

  const mes = sp.mes;

  const stats = mostrarActividad
    ? await getEstadisticasEmpleado(
        // usuario id — necesitamos buscarlo por empleadoId
        empleado.id,
        mes,
      )
    : null;

  const salarioQuincenal = Number(empleado.salarioBase) / 2;

  const mesLabel = mes
    ? new Date(`${mes}-15`).toLocaleDateString("es-DO", { month: "long", year: "numeric" })
    : "Todo el tiempo";

  return (
    <div className="space-y-5 max-w-4xl">

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/empleados">Empleados</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{empleado.nombre} {empleado.apellido}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{empleado.nombre} {empleado.apellido}</h1>
            <Badge variant={estadoVariant[empleado.estado]}>{empleado.estado}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {empleado.cargo}{empleado.departamento ? ` — ${empleado.departamento}` : ""}
          </p>
        </div>
        <Link href={`/empleados/${id}/editar`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Editar
        </Link>
      </div>

      {/* Cuadro de actividad — solo admin + empleados de comisión */}
      {mostrarActividad && stats && (
        <div className="rounded-xl border overflow-hidden">
          {/* Header */}
          <div
            className="px-5 py-3 border-b flex items-center justify-between gap-3 flex-wrap"
            style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "var(--accent-hex)" }} />
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Actividad · {mesLabel}
              </h2>
            </div>
            <MesFiltroEmpleado empleadoId={id} mesActual={mes} />
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
                <StatTile label="Cotizaciones" value={stats.cotizaciones} color="#94a3b8" />
                <StatTile label="Órdenes de Venta" value={stats.ordenes} color="#3b82f6" />
                <StatTile label="Conduces" value={stats.conduces} color="#a855f7" />
                <StatTile label="Facturas" value={stats.facturas} color="#16a34a" />
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Datos personales</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Row label="Cédula" value={empleado.cedula} />
            <Row label="Teléfono" value={empleado.telefono} />
            <Row label="Email" value={empleado.email} />
            <Row label="Fecha ingreso" value={new Date(empleado.fechaIngreso).toLocaleDateString("es-DO")} />
            <Row label="Nacimiento" value={empleado.fechaNacimiento ? new Date(empleado.fechaNacimiento).toLocaleDateString("es-DO") : null} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Salario</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Row label="Salario mensual" value={fmt(empleado.salarioBase)} />
            <Row label="Salario quincenal" value={fmt(salarioQuincenal)} />
            <Row label="AFP" value={empleado.afp} />
            <Row label="SFS" value={empleado.sfs} />
            <Row label="NSS" value={empleado.nss} />
          </CardContent>
        </Card>

        {empleado.bancoCuenta && (
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Datos bancarios</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Row label="Banco" value={empleado.bancoCuenta} />
              <Row label="Cuenta" value={empleado.cuentaBancaria} />
              <Row label="Tipo" value={empleado.tipoCuenta} />
            </CardContent>
          </Card>
        )}

        {empleado.usuario && (
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Acceso al sistema</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{empleado.usuario.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rol</span>
                <Badge variant="outline">{empleado.usuario.rol}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activo</span>
                <span>{empleado.usuario.activo ? "Sí" : "No"}</span>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
