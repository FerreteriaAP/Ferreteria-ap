import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCotizacionParaEditar, getClientes } from "@/actions/ventas";
import { VentaForm, type DetalleRowInit } from "@/components/ventas/venta-form";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarCotizacionPage({ params }: Props) {
  const { id } = await params;
  const [venta, rawClientes] = await Promise.all([
    getCotizacionParaEditar(id),
    getClientes(),
  ]);

  if (!venta) notFound();
  // Solo se pueden editar cotizaciones
  if (venta.tipo !== "COTIZACION") redirect(`/ventas/${id}`);

  const clientes = rawClientes.map(c => ({
    ...c,
    limiteCredito: c.limiteCredito ? Number(c.limiteCredito) : null,
  }));

  // Mapear detalles de la BD → DetalleRowInit para VentaForm
  const initialDetalles: DetalleRowInit[] = venta.detalles.map(d => {
    const p = d.producto;
    // d.precio en BD = precio BASE sin ITBIS
    // VentaForm usa d.precio = precio con ITBIS (precioFinal en BD)
    const precioUI = Number(d.precioFinal); // precio que ve el usuario
    return {
      productoId: d.productoId,
      nombre: d.descripcion ?? p.nombre,
      codigo: p.codigo,
      unidad: d.unidad ?? p.unidadMedida,
      unidadOriginal: p.unidadMedida,
      unidadFraccion: p.unidadFraccion,
      cantidad: Number(d.cantidad),
      precio: precioUI,
      precioCompleto: Number(p.precioVenta), // precio de lista actual
      descuento: Number(d.descuento),
      itbis: Number(d.itbis),
      exentoItbis: d.exentoItbis,
      stockActual: Number(p.stockActual),
      esFraccionable: p.esFraccionable,
      factorFraccion: p.factorFraccion,
      precioFraccion: p.precioFraccion,
      modoFraccionar: false, // no sabemos si estaba en modo fracción; conservar unidad guardada
      costoUltimo: p.costoUltimo,
      categoriaCode: p.categoriaCode ?? "",
    };
  });

  const credito = (venta.credito ?? "CONTADO") as
    "CONTADO" | "DIAS_10" | "DIAS_15" | "DIAS_30" | "DIAS_45" | "DIAS_60" | "DIAS_90";

  return (
    <div className="space-y-5">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/ventas">Ventas</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/ventas/${id}`}>{venta.numero}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Editar cotización</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <Link
          href={`/ventas/${id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} /> Volver
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar cotización</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">{venta.numero}</p>
        </div>
      </div>

      <VentaForm
        clientes={clientes}
        ventaId={id}
        initialClienteId={venta.clienteId}
        initialDireccionId={venta.direccionId ?? ""}
        initialCredito={credito}
        initialFechaEntrega={venta.fechaEntrega
          ? new Date(venta.fechaEntrega).toISOString().slice(0, 10)
          : undefined}
        initialNotas={venta.notas ?? ""}
        initialDetalles={initialDetalles}
      />
    </div>
  );
}
