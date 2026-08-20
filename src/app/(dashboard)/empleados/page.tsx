import Link from "next/link";
import { cookies } from "next/headers";
import { getEmpleados } from "@/actions/empleados";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmpleadosGrid } from "@/components/empleados/empleados-grid";
import { ViewToggle } from "@/components/ui/view-toggle";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string; estado?: string; page?: string; vista?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVO: "default",
  INACTIVO: "secondary",
  SUSPENDIDO: "destructive",
};

export default async function EmpleadosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const busqueda = params.q ?? "";
  const estado = params.estado ?? "";
  const page = Number(params.page ?? 1);
  const jar = await cookies();
  const cookieVista = jar.get("vista-preferida")?.value;
  const vista = (params.vista ?? cookieVista) === "grid" ? "grid" : "lista";

  const { empleados, total, pages } = await getEmpleados({
    busqueda,
    estado: estado || undefined,
    page,
  });

  const vistaQS = vista === "grid" ? "&vista=grid" : "";

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empleados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} registros</p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle
            vista={vista}
            listaHref={`/empleados?q=${busqueda}${estado ? `&estado=${estado}` : ""}`}
            gridHref={`/empleados?q=${busqueda}${estado ? `&estado=${estado}` : ""}&vista=grid`}
          />
          <Link href="/empleados/nuevo" className={buttonVariants()}>
            + Nuevo empleado
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <form method="GET" className="flex-1">
          <Input
            name="q"
            defaultValue={busqueda}
            placeholder="Buscar por nombre, cédula, cargo..."
            className="max-w-sm"
          />
          {vista === "grid" && <input type="hidden" name="vista" value="grid" />}
        </form>
        <div className="flex gap-2">
          {["", "ACTIVO", "INACTIVO", "SUSPENDIDO"].map((e) => (
            <Link
              key={e}
              href={`/empleados?estado=${e}&q=${busqueda}${vistaQS}`}
              className={cn(buttonVariants({ variant: estado === e ? "default" : "outline", size: "sm" }))}
            >
              {e === "" ? "Todos" : e === "ACTIVO" ? "Activos" : e === "INACTIVO" ? "Inactivos" : "Suspendidos"}
            </Link>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {vista === "grid" ? (
        <EmpleadosGrid empleados={empleados} />
      ) : empleados.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">Sin empleados</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead className="text-right">Salario base</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Ingreso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empleados.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">
                  <Link href={`/empleados/${e.id}`} className="hover:underline">
                    {e.nombre} {e.apellido}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">{e.cedula}</TableCell>
                <TableCell className="text-sm">{e.cargo}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.departamento ?? "—"}</TableCell>
                <TableCell className="text-right">{fmt(e.salarioBase)}</TableCell>
                <TableCell>
                  <Badge variant={estadoVariant[e.estado]} className="text-xs">
                    {e.estado}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(e.fechaIngreso).toLocaleDateString("es-DO")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/empleados?q=${busqueda}&estado=${estado}&page=${p}${vistaQS}`}
              className={cn(buttonVariants({ variant: p === page ? "default" : "outline", size: "sm" }))}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
