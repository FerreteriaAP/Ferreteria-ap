"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generarNumero } from "@/lib/numeracion";
import { revalidatePath } from "next/cache";
import { clearVendedorActivo } from "@/actions/vendedor-activo";
import { redirect } from "next/navigation";
import { z } from "zod";

// Schemas 

const DetalleOcSchema = z.object({
 productoId: z.string().min(1, "Producto requerido"),
 nombre: z.string(),
 codigo: z.string(),
 unidad: z.string(),
 cantidad: z.coerce.number().positive("Cantidad > 0"),
 costo: z.coerce.number().min(0, "Costo estimado"),
 exentoItbis: z.boolean().default(false),
});

const OcSchema = z.object({
 suplidorId: z.string().min(1, "Suplidor requerido"),
 fechaEntrega: z.string().optional(),
 notas: z.string().optional(),
 detalles: z.array(DetalleOcSchema).min(1, "Agrega al menos un producto"),
});

export type OcInput = z.infer<typeof OcSchema>;

const RecepcionItemSchema = z.object({
 productoId: z.string(),
 nombre: z.string(),
 ordenDetalleId: z.string(),
 cantPedida: z.coerce.number(),
 cantRecibida: z.coerce.number().min(0),
 costo: z.coerce.number().min(0),
 itbisPct: z.coerce.number().min(0).default(0),
 descuento: z.coerce.number().min(0).max(100).default(0),
});

const RecepcionSchema = z.object({
 suplidorId: z.string(),
 noFacturaSuplidor: z.string().optional(),
 ncf: z.string().optional(),
 tipoNcfCompra: z.string().optional(),
 fechaFactura: z.string().min(1, "Fecha de factura requerida"),
 fechaVencimiento: z.string().optional(),
 notas: z.string().optional(),
 items: z.array(RecepcionItemSchema).min(1),
 ajustesPrecio: z.array(z.object({ productoId: z.string(), nuevoPrecioVenta: z.number() })).optional(),
});

export type RecepcionInput = z.infer<typeof RecepcionSchema>;

// Helpers 

const PREFIJOS_OC: Record<string, string> = {
  ORDEN_COMPRA: "ODC",
  COMPRA:       "CMP",
};
async function siguienteNumero(tipo: string): Promise<string> {
  return generarNumero(tipo, PREFIJOS_OC[tipo] ?? tipo);
}

// Listar 

export async function getOrdenesCompra(params?: {
 estado?: string;
 busqueda?: string;
 page?: number;
}) {
 const { estado, busqueda = "", page = 1 } = params ?? {};
 const pageSize = 30;

 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const where: any = {
 ...(estado ? { estado } : {}),
 ...(busqueda
 ? {
 OR: [
 { numero: { contains: busqueda, mode: "insensitive" } },
 { suplidor: { nombre: { contains: busqueda, mode: "insensitive" } } },
 ],
 }
 : {}),
 };

 const [total, ordenes] = await Promise.all([
 prisma.ordenCompra.count({ where }),
 prisma.ordenCompra.findMany({
 where,
 include: {
 suplidor: { select: { nombre: true } },
 _count: { select: { detalles: true, compras: true } },
 },
 orderBy: { createdAt: "desc" },
 skip: (page - 1) * pageSize,
 take: pageSize,
 }),
 ]);

 return { ordenes, total, pages: Math.ceil(total / pageSize) };
}

// Detalle 

export async function getOrdenCompra(id: string) {
 return prisma.ordenCompra.findUnique({
 where: { id },
 include: {
 suplidor: true,
 usuario: { select: { nombre: true } },
 detalles: {
 include: {
 producto: {
 select: { id: true, nombre: true, codigo: true, unidadMedida: true, costoUltimo: true, stockActual: true, precioVenta: true, porcentajeGanancia: true },
 },
 },
 },
 compras: {
 select: { id: true, numero: true, total: true, fechaFactura: true, estadoPago: true },
 orderBy: { createdAt: "asc" },
 },
 },
 });
}

// Crear OC 

export async function crearOrdenCompra(data: OcInput) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autenticado" };

 const parsed = OcSchema.safeParse(data);
 if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

 const { suplidorId, fechaEntrega, notas, detalles } = parsed.data;

 const subtotal = detalles.reduce((s, d) => s + d.cantidad * d.costo, 0);
 const itbisTotal = detalles.reduce(
 (s, d) => s + (d.exentoItbis ? 0 : d.cantidad * d.costo * 0.18), 0
 );
 const total = subtotal + itbisTotal;

 try {
 const oc = await prisma.$transaction(async (tx) => {
 const numero = await siguienteNumero("ORDEN_COMPRA");
 return tx.ordenCompra.create({
 data: {
 numero,
 suplidorId,
 usuarioId: session.user!.id,
 estado: "BORRADOR",
 fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : null,
 notas: notas || null,
 subtotal,
 itbis: itbisTotal,
 total,
 detalles: {
 create: detalles.map((d) => ({
 productoId: d.productoId,
 cantidad: d.cantidad,
 costo: d.costo,
 subtotal: d.cantidad * d.costo,
 })),
 },
 },
 });
 });

 revalidatePath("/ordenes-compra");
 await clearVendedorActivo();
 return { id: oc.id, numero: oc.numero };
 } catch (err) {
 console.error("[crearOrdenCompra]", err);
 return { error: err instanceof Error ? err.message : "Error al crear la orden" };
 }
}

// Enviar OC 

export async function enviarOrdenCompra(id: string) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autenticado" };

 const oc = await prisma.ordenCompra.findUnique({ where: { id } });
 if (!oc) return { error: "Orden no encontrada" };
 if (oc.estado !== "BORRADOR") return { error: "Solo se puede enviar una orden en borrador" };

 await prisma.ordenCompra.update({ where: { id }, data: { estado: "ENVIADA" } });
 revalidatePath(`/ordenes-compra/${id}`);
 revalidatePath("/ordenes-compra");
 return { ok: true };
}

// Cancelar OC 

export async function cancelarOrdenCompra(id: string) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autenticado" };

 const oc = await prisma.ordenCompra.findUnique({ where: { id } });
 if (!oc) return { error: "Orden no encontrada" };
 if (oc.estado === "RECIBIDA" || oc.estado === "CANCELADA") {
 return { error: "No se puede cancelar una orden ya recibida o cancelada" };
 }

 await prisma.ordenCompra.update({ where: { id }, data: { estado: "CANCELADA" } });
 revalidatePath(`/ordenes-compra/${id}`);
 revalidatePath("/ordenes-compra");
 return { ok: true };
}

// Confirmar recepción  crea Compra 

export async function confirmarRecepcionOC(ordenId: string, data: RecepcionInput) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autenticado" };

 const parsed = RecepcionSchema.safeParse(data);
 if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

 const oc = await prisma.ordenCompra.findUnique({
 where: { id: ordenId },
 include: { detalles: { include: { producto: true } } },
 });
 if (!oc) return { error: "Orden no encontrada" };
 if (oc.estado === "CANCELADA") return { error: "La orden está cancelada" };
 if (oc.estado === "RECIBIDA") return { error: "La orden ya fue totalmente recibida" };

 const { suplidorId, noFacturaSuplidor, ncf, tipoNcfCompra, fechaFactura, fechaVencimiento, notas, items, ajustesPrecio } = parsed.data;

 // Solo ítems con cantidad recibida > 0
 const itemsRecibidos = items.filter((i) => i.cantRecibida > 0);
 if (itemsRecibidos.length === 0) return { error: "Debe recibir al menos un ítem" };

 // Los costos llegan ya normalizados (sin ITBIS, con descuento aplicado) desde el form
 const subtotal   = itemsRecibidos.reduce((s, i) => s + i.cantRecibida * i.costo, 0);
 const totalItbis = itemsRecibidos.reduce((s, i) => s + i.cantRecibida * i.costo * 0.18, 0);
 const total = subtotal + totalItbis;

 try {
 const compra = await prisma.$transaction(async (tx) => {
 // 1. Crear la compra
 const numero = await siguienteNumero("COMPRA");
 const compraData = {
 numero,
 suplidorId,
 ordenCompraId: ordenId,
 noFacturaSuplidor: noFacturaSuplidor || null,
 ncf: ncf || null,
 tipoNcfCompra: tipoNcfCompra || null,
 fechaFactura: new Date(fechaFactura),
 fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
 subtotal,
 itbis: totalItbis,
 total,
 notas: notas || null,
 usuarioId: session.user!.id,
 estadoPago: "PENDIENTE" as const,
 detalles: {
 create: itemsRecibidos.map((i) => ({
 productoId: i.productoId,
 cantidad: i.cantRecibida,
 costo: i.costo,
 itbis: i.cantRecibida * i.costo * (i.itbisPct / 100),
 subtotal: i.cantRecibida * i.costo,
 })),
 },
 };
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const compra = await tx.compra.create({ data: compraData as any });

 // 2. Actualizar stock por cada producto recibido
 for (const item of itemsRecibidos) {
 const prod = await tx.producto.findUnique({ where: { id: item.productoId } });
 if (!prod) continue;

 const stockAntes = Number(prod.stockActual);
 const stockDespues = stockAntes + item.cantRecibida;
 const costoAnterior = Number(prod.costoUltimo);
 const costoPromedio = stockAntes > 0
 ? (stockAntes * costoAnterior + item.cantRecibida * item.costo) / stockDespues
 : item.costo;

 await tx.producto.update({
 where: { id: item.productoId },
 data: { stockActual: stockDespues, costoUltimo: item.costo, costoPromedio },
 });

 await tx.movimientoInventario.create({
 data: {
 productoId: item.productoId,
 tipo: "ENTRADA_COMPRA",
 cantidad: item.cantRecibida,
 stockAntes,
 stockDespues,
 costo: item.costo,
 referencia: compra.id,
 tipoRef: "COMPRA",
 },
 });
 }

 // 3. Crear CxP si hay fecha de vencimiento
 if (fechaVencimiento) {
 await tx.cuentaPorPagar.create({
 data: {
 compraId: compra.id,
 suplidorId,
 monto: total,
 montoPagado: 0,
 saldo: total,
 fechaEmision: new Date(fechaFactura),
 fechaVencimiento: new Date(fechaVencimiento),
 estado: "PENDIENTE",
 },
 });
 }

 // 4. Actualizar cantRecibida en los detalles de la OC
 for (const item of items) {
 const detId = item.ordenDetalleId;
 if (!detId) continue;
 const detActual = await tx.detalleOrdenCompra.findUnique({ where: { id: detId } });
 if (!detActual) continue;
 await tx.detalleOrdenCompra.update({
 where: { id: detId },
 data: { cantRecibida: { increment: item.cantRecibida } },
 });
 }

 // 5. Actualizar precios de venta si el usuario lo indicó
 if (ajustesPrecio && ajustesPrecio.length > 0) {
  for (const aj of ajustesPrecio) {
   if (aj.nuevoPrecioVenta > 0) {
    await tx.producto.update({
     where: { id: aj.productoId },
     data: { precioVenta: aj.nuevoPrecioVenta },
    });
   }
  }
 }

 // 6. Actualizar estado de la OC
 const detallesActualizados = await tx.detalleOrdenCompra.findMany({ where: { ordenId } });
 const todosRecibidos = detallesActualizados.every(
 (d) => Number(d.cantRecibida) >= Number(d.cantidad)
 );
 await tx.ordenCompra.update({
 where: { id: ordenId },
 data: { estado: todosRecibidos ? "RECIBIDA" : "RECIBIDA_PARCIAL" },
 });

 return compra;
 });

 revalidatePath("/ordenes-compra");
 revalidatePath(`/ordenes-compra/${ordenId}`);
 revalidatePath("/compras");
 revalidatePath("/productos");
 return { id: compra.id, numero: compra.numero };
 } catch (err) {
 console.error("[confirmarRecepcionOC]", err);
 return { error: err instanceof Error ? err.message : "Error al confirmar la recepción" };
 }
}

// Marcar OC como ENVIADA al imprimir 
// Idempotente: solo actúa si el estado es BORRADOR.
// Se llama desde la página de impresión para reflejar que la orden fue enviada al suplidor.

export async function marcarOrdenEnviadaAlImprimir(id: string) {
 const oc = await prisma.ordenCompra.findUnique({ where: { id }, select: { estado: true } });
 if (!oc || oc.estado !== "BORRADOR") return;
 await prisma.ordenCompra.update({ where: { id }, data: { estado: "ENVIADA" } });
 revalidatePath(`/ordenes-compra/${id}`);
 revalidatePath("/ordenes-compra");
}

// Eliminar orden de compra (admin) 
// Solo BORRADOR (antes de enviar al suplidor)

export async function eliminarOrdenCompra(id: string) {
 const orden = await prisma.ordenCompra.findUnique({
 where: { id },
 select: { estado: true, numero: true },
 });
 if (!orden) return { error: "Orden no encontrada" };
 if (orden.estado !== "BORRADOR") {
 return { error: `No se puede eliminar una orden en estado ${orden.estado}` };
 }
 // detalles tienen onDelete: Cascade
 await prisma.ordenCompra.delete({ where: { id } });
 revalidatePath("/ordenes-compra");
 redirect("/ordenes-compra");
}
