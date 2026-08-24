"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generarNumero } from "@/lib/numeracion";
import { type Prisma } from "@/generated/prisma";
import { clearVendedorActivo } from "@/actions/vendedor-activo";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// Schemas 

const DetalleSchema = z.object({
 productoId: z.string().min(1, "Producto requerido"),
 cantidad: z.coerce.number().positive("Cantidad debe ser mayor a 0"),
 costo: z.coerce.number().min(0, "Costo inválido"),
 itbis: z.coerce.number().min(0).default(0),
});

const AjustePrecioSchema = z.object({
 productoId: z.string(),
 nuevoPrecioVenta: z.coerce.number().positive(),
});

const CompraSchema = z.object({
 suplidorId: z.string().min(1, "Suplidor requerido"),
 noFacturaSuplidor: z.string().optional(),
 ncf: z.string().optional(),
 tipoNcfCompra: z.string().optional(),
 ncfCodigoSeguridad: z.string().optional(), // solo E31 electrónico
 fechaFactura: z.string().min(1, "Fecha requerida"),
 fechaVencimiento: z.string().optional(),
 notas: z.string().optional(),
 detalles: z.array(DetalleSchema).min(1, "Agrega al menos un producto"),
 ajustesPrecio: z.array(AjustePrecioSchema).optional(), // ajustes de precioVenta al guardar
});

export type CompraInput = z.infer<typeof CompraSchema>;

// Helpers 

async function siguienteNumero(tipo: string): Promise<string> {
  return generarNumero(tipo, "CMP");
}

// Listar 

export async function getCompras(params?: {
 suplidorId?: string;
 estadoPago?: string;
 busqueda?: string;
 page?: number;
 pageSize?: number;
}) {
 const { suplidorId, estadoPago, busqueda = "", page = 1, pageSize = 30 } = params ?? {};

 const where: Prisma.CompraWhereInput = {};
 if (suplidorId) where.suplidorId = suplidorId;
 if (estadoPago) where.estadoPago = estadoPago as Prisma.EnumEstadoPagoFilter["equals"];
 if (busqueda) {
 where.OR = [
 { numero: { contains: busqueda, mode: "insensitive" } },
 { noFacturaSuplidor: { contains: busqueda, mode: "insensitive" } },
 { suplidor: { nombre: { contains: busqueda, mode: "insensitive" } } },
 ];
 }

 const [total, compras] = await Promise.all([
 prisma.compra.count({ where }),
 prisma.compra.findMany({
 where,
 include: {
 suplidor: { select: { id: true, nombre: true } },
 detalles: { include: { producto: { select: { nombre: true, codigo: true } } } },
 _count: { select: { pagos: true } },
 },
 orderBy: { createdAt: "desc" },
 skip: (page - 1) * pageSize,
 take: pageSize,
 }),
 ]);

 return { compras, total, pages: Math.ceil(total / pageSize) };
}

export async function getCompra(id: string) {
 return prisma.compra.findUnique({
 where: { id },
 include: {
 suplidor: true,
 detalles: {
 include: { producto: { select: { id: true, nombre: true, codigo: true, unidadMedida: true } } },
 },
 pagos: { include: { cuenta: { select: { banco: true, nombre: true } } }, orderBy: { fecha: "desc" } },
 cuentasPorPagar: true,
 },
 });
}

// Crear compra 

export async function crearCompra(data: CompraInput) {
 const session = await auth();
 const usuarioId = session?.user?.id;
 if (!usuarioId) return { error: { _: ["No autenticado. Inicia sesión e intenta de nuevo."] } };

 const parsed = CompraSchema.safeParse(data);
 if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

 const { suplidorId, noFacturaSuplidor, ncf, tipoNcfCompra, ncfCodigoSeguridad, fechaFactura, fechaVencimiento, notas, detalles, ajustesPrecio } = parsed.data;

 // Validar unicidad del NCF (comprobante fiscal único por compra)
 if (ncf) {
 const existente = await prisma.compra.findFirst({
 where: { ncf },
 select: { numero: true, fechaFactura: true, suplidor: { select: { nombre: true } } },
 });
 if (existente) {
 const fecha = new Date(existente.fechaFactura).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
 return { error: { ncf: [`El NCF "${ncf}" ya está registrado en ${existente.numero} (${existente.suplidor.nombre} — ${fecha}). Los comprobantes fiscales son únicos.`] } };
 }
 }

 // Calcular totales
 const subtotal = detalles.reduce((s, d) => s + d.cantidad * d.costo, 0);
 const totalItbis = detalles.reduce((s, d) => s + d.itbis, 0);
 const total = subtotal + totalItbis;

 try {
 const compra = await prisma.$transaction(async (tx) => {
 const numero = await siguienteNumero("COMPRA");

 const compra = await tx.compra.create({
 data: {
 numero,
 suplidorId,
 noFacturaSuplidor: noFacturaSuplidor || null,
 ncf: ncf || null,
 tipoNcfCompra: tipoNcfCompra || null,
 ncfCodigoSeguridad: ncfCodigoSeguridad || null,
 fechaFactura: new Date(fechaFactura),
 fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
 subtotal,
 itbis: totalItbis,
 total,
 notas: notas || null,
 usuarioId,
 estadoPago: "PENDIENTE",
 detalles: {
 create: detalles.map((d) => ({
 productoId: d.productoId,
 cantidad: d.cantidad,
 costo: d.costo,
 itbis: d.itbis,
 subtotal: d.cantidad * d.costo,
 })),
 },
 },
 });

 // Actualizar stock e inventario por cada producto
 for (const d of detalles) {
 const prod = await tx.producto.findUnique({ where: { id: d.productoId } });
 if (!prod) continue;

 const stockAntes = Number(prod.stockActual);
 const stockDespues = stockAntes + d.cantidad;
 const costoAnterior = Number(prod.costoUltimo);

 // Actualizar costo promedio (promedio ponderado)
 const costoPromedio =
 stockAntes > 0
 ? (stockAntes * costoAnterior + d.cantidad * d.costo) / stockDespues
 : d.costo;

 await tx.producto.update({
 where: { id: d.productoId },
 data: {
 stockActual: stockDespues,
 costoUltimo: d.costo,
 costoPromedio,
 },
 });

 await tx.movimientoInventario.create({
 data: {
 productoId: d.productoId,
 tipo: "ENTRADA_COMPRA",
 cantidad: d.cantidad,
 stockAntes,
 stockDespues,
 costo: d.costo,
 referencia: compra.id,
 tipoRef: "COMPRA",
 },
 });

 // Alerta si el precio cambió más de 5%
 if (costoAnterior > 0 && Math.abs((d.costo - costoAnterior) / costoAnterior) > 0.05) {
 const pct = ((d.costo - costoAnterior) / costoAnterior * 100).toFixed(1);
 await tx.alertaInventario.create({
 data: {
 productoId: d.productoId,
 tipo: "PRECIO_CAMBIO",
 mensaje: `Costo cambia de RD$${costoAnterior.toFixed(2)}  RD$${d.costo.toFixed(2)} (${pct}%) en compra ${numero}`,
 },
 });

 // Actualizar el detalle con el costo anterior
 await tx.detalleCompra.updateMany({
 where: { compraId: compra.id, productoId: d.productoId },
 data: { costoAnterior },
 });
 }
 }

 // Aplicar ajustes de precio de venta solicitados por el usuario
 if (ajustesPrecio?.length) {
 for (const aj of ajustesPrecio) {
 await tx.producto.update({
 where: { id: aj.productoId },
 data: { precioVenta: aj.nuevoPrecioVenta },
 });
 }
 }

 // Crear CxP si hay fecha de vencimiento
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

 return compra;
 });

 revalidatePath("/compras");
 revalidatePath("/productos");
 if (ajustesPrecio?.length) revalidatePath("/alertas");
 await clearVendedorActivo();
 return { success: true, id: compra.id };
 } catch (e) {
 console.error(e);
 return { error: { _: ["Error al registrar la compra"] } };
 }
}

// Registrar pago 

const PagoSchema = z.object({
 monto: z.coerce.number().positive("Monto inválido"),
 fecha: z.string().min(1),
 metodo: z.enum(["EFECTIVO", "CHEQUE", "TRANSFERENCIA"]),
 referencia: z.string().optional(),
 cuentaId: z.string().optional(),
 notas: z.string().optional(),
});

export type PagoInput = z.infer<typeof PagoSchema>;

export async function registrarPago(compraId: string, data: PagoInput) {
 const parsed = PagoSchema.safeParse(data);
 if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

 const compra = await prisma.compra.findUnique({
 where: { id: compraId },
 include: { cuentasPorPagar: true },
 });
 if (!compra) return { error: { _: ["Compra no encontrada"] } };

 const { monto, fecha, metodo, referencia, cuentaId, notas } = parsed.data;

 await prisma.$transaction(async (tx) => {
 // Crear pago
 await tx.pagoCompra.create({
 data: {
 compraId,
 monto,
 fecha: new Date(fecha),
 metodo,
 referencia: referencia || null,
 cuentaId: cuentaId || null,
 notas: notas || null,
 },
 });

 // Actualizar estado de la compra
 const pagosExistentes = await tx.pagoCompra.findMany({ where: { compraId } });
 const totalPagado = pagosExistentes.reduce((s, p) => s + Number(p.monto), 0) + monto;
 const totalCompra = Number(compra.total);
 const estadoPago = totalPagado >= totalCompra ? "PAGADO" : "PAGADO_PARCIAL";

 await tx.compra.update({
 where: { id: compraId },
 data: { estadoPago },
 });

 // Actualizar CxP
 for (const cxp of compra.cuentasPorPagar) {
 const nuevoSaldo = Math.max(0, Number(cxp.saldo) - monto);
 await tx.cuentaPorPagar.update({
 where: { id: cxp.id },
 data: {
 montoPagado: Number(cxp.montoPagado) + monto,
 saldo: nuevoSaldo,
 estado: nuevoSaldo === 0 ? "PAGADO" : "PAGADO_PARCIAL",
 },
 });
 }
 });

 revalidatePath(`/compras/${compraId}`);
 revalidatePath("/compras");
 return { success: true };
}

// Suplidores para select 

export async function getSuplidores() {
 return prisma.contacto.findMany({
 where: { tipo: { in: ["SUPLIDOR", "AMBOS"] }, activo: true },
 select: { id: true, nombre: true, rnc: true, credito: true },
 orderBy: { nombre: "asc" },
 });
}

export async function getCuentasBancarias() {
 return prisma.cuentaBancaria.findMany({
 where: { activa: true },
 select: { id: true, banco: true, nombre: true },
 orderBy: { banco: "asc" },
 });
}

// Eliminar compra (admin) 
// Solo si no tiene pagos registrados

export async function eliminarCompra(id: string) {
 const compra = await prisma.compra.findUnique({
 where: { id },
 include: { pagos: { select: { id: true } } },
 });
 if (!compra) return { error: "Compra no encontrada" };
 if (compra.pagos.length > 0) {
 return { error: "Esta compra tiene pagos registrados y no puede eliminarse" };
 }
 // detalles y pagos tienen onDelete: Cascade
 await prisma.compra.delete({ where: { id } });
 revalidatePath("/compras");
 redirect("/compras");
}
