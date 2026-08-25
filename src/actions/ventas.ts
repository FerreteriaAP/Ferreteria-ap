"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, EstadoVenta, TipoCredito, TipoComprobante, EstadoPago } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { getVendedorActivoId } from "@/actions/vendedor-activo";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generarNumero } from "@/lib/numeracion";

// Types 

export interface DetalleVentaInput {
 productoId: string;
 descripcion?: string;
 unidad?: string; // unidad de venta efectiva (PIE, LB, UND…)
 cantidad: number;
 precio: number; // precio base SIN ITBIS
 precioFinal: number; // precio ingresado (ITBIS incluido, o igual a precio si exento)
 exentoItbis: boolean;
 descuento: number; // porcentaje 0-100
 itbis: number; // monto total RD$ de ITBIS para la línea
}

export interface VentaInput {
 clienteId: string;
 direccionId?: string;
 credito: "CONTADO" | "DIAS_10" | "DIAS_15" | "DIAS_30" | "DIAS_45" | "DIAS_60" | "DIAS_90";
 tipoNcf?: "B01" | "B02" | "B14" | "B15";
 fechaEntrega?: string;
 notas?: string;
 detalles: DetalleVentaInput[];
}

// Helpers 

// tipo values must match secuencias_documento.tipo in the seed:
// "COTIZACION", "ORDEN_VENTA", "CONDUCE_OUT", "FACTURA"
// Números con formato PREFIJO/AÑO/NNNN — ver src/lib/numeracion.ts
const PREFIJOS: Record<string, string> = {
  FACTURA:      "FAC",
  CONDUCE_OUT:  "CDC",
  COTIZACION:   "COT",
  ORDEN_VENTA:  "OVN",
};
async function siguienteNumero(tipo: string): Promise<string> {
  return generarNumero(tipo, PREFIJOS[tipo] ?? tipo);
}

function calcularDiasCredito(credito: string): number | null {
 if (credito === "DIAS_10") return 10;
 if (credito === "DIAS_15") return 15;
 if (credito === "DIAS_30") return 30;
 if (credito === "DIAS_45") return 45;
 if (credito === "DIAS_60") return 60;
 if (credito === "DIAS_90") return 90;
 return null;
}

// Queries 

/** Sugerencias para el buscador de ventas — devuelve números de factura + nombres de cliente */
export async function getVentasSugerencias(q: string): Promise<{ label: string; sublabel?: string; value: string }[]> {
 if (!q || q.trim().length < 1) return [];
 const term = q.trim();

 const [facturas, clientes] = await Promise.all([
  // Números de factura/documento que empiecen o contengan el término
  prisma.venta.findMany({
   where: { numero: { contains: term, mode: "insensitive" } },
   select: { numero: true, tipo: true, cliente: { select: { nombre: true } } },
   orderBy: { numero: "desc" },
   take: 5,
  }),
  // Clientes distintos cuyo nombre coincida
  prisma.venta.findMany({
   where: { cliente: { nombre: { contains: term, mode: "insensitive" } } },
   select: { cliente: { select: { nombre: true } } },
   distinct: ["clienteId"],
   take: 5,
  }),
 ]);

 const sugs: { label: string; sublabel?: string; value: string }[] = [];

 for (const f of facturas) {
  sugs.push({ label: f.numero, sublabel: f.cliente.nombre, value: f.numero });
 }
 for (const c of clientes) {
  const nombre = c.cliente.nombre;
  if (!sugs.some(s => s.value === nombre)) {
   sugs.push({ label: nombre, value: nombre });
  }
 }

 return sugs;
}

export async function getVentas(opts: {
 tipo?: string;
 busqueda?: string;
 page?: number;
 pageSize?: number;
 sortBy?: string;
 sortDir?: "asc" | "desc";
}) {
 const { tipo, busqueda = "", page = 1, pageSize = 25, sortBy, sortDir = "desc" } = opts;
 const skip = (page - 1) * pageSize;

 const where: Prisma.VentaWhereInput = {
 ...(tipo && tipo !== "" ? { tipo: tipo as EstadoVenta } : {}),
 ...(busqueda ? {
 OR: [
 { numero: { contains: busqueda, mode: "insensitive" } },
 { cliente: { nombre: { contains: busqueda, mode: "insensitive" } } },
 { ncf: { contains: busqueda, mode: "insensitive" } },
 ],
 } : {}),
 };

 const orderBy: Prisma.VentaOrderByWithRelationInput =
  sortBy === "numero"   ? { numero:      sortDir } :
  sortBy === "tipo"     ? { tipo:        sortDir } :
  sortBy === "cliente"  ? { cliente: { nombre: sortDir } } :
  sortBy === "credito"  ? { credito:     sortDir } :
  sortBy === "fecha"    ? { fechaEmision: sortDir } :
  sortBy === "total"    ? { total:       sortDir } :
  { createdAt: "desc" };

 const [ventas, total] = await Promise.all([
 prisma.venta.findMany({
 where,
 skip,
 take: pageSize,
 orderBy,
 include: {
 cliente: { select: { nombre: true } },
 _count: { select: { detalles: true } },
 },
 }),
 prisma.venta.count({ where }),
 ]);

 return { ventas, total, pages: Math.ceil(total / pageSize) };
}

export async function getVenta(id: string) {
 return prisma.venta.findUnique({
 where: { id },
 include: {
 cliente: { select: { id: true, nombre: true, rnc: true, telefono: true, email: true, limiteCredito: true, reglaPrecio: true, margenPrecio: true } },
 direccion: { select: { etiqueta: true, direccion: true, sector: true, ciudad: true, referencia: true } },
 vendedor: { select: { nombre: true, apellido: true } },
 creador: { select: { nombre: true, apellido: true } },
 detalles: {
 include: { producto: { select: { codigo: true, nombre: true, unidadMedida: true } } },
 orderBy: { orden: "asc" },
 },
 conduces: { orderBy: { createdAt: "asc" } },
 pagosRecibidos: { orderBy: { fecha: "desc" } },
 cuentasPorCobrar: { orderBy: { fechaVencimiento: "asc" } },
 },
 });
}

/** Cotización con datos de producto completos — para el formulario de edición */
export async function getCotizacionParaEditar(id: string) {
 const venta = await prisma.venta.findUnique({
 where: { id },
 include: {
 cliente: {
 select: {
 id: true, nombre: true, rnc: true, telefono: true, email: true,
 credito: true, limiteCredito: true, reglaPrecio: true, margenPrecio: true,
 direcciones: { select: { id: true, etiqueta: true, direccion: true }, orderBy: { esPrincipal: "desc" } },
 },
 },
 detalles: {
 include: {
 producto: {
 select: {
 id: true, codigo: true, nombre: true, unidadMedida: true,
 precioVenta: true, costoUltimo: true, stockActual: true,
 esFraccionable: true, unidadFraccion: true, factorFraccion: true,
 precioFraccion: true, exentoItbis: true,
 categoria: { select: { codigo: true } },
 },
 },
 },
 orderBy: { orden: "asc" },
 },
 },
 });
 if (!venta) return null;
 // Serializar Decimal → number y aplanar relaciones
 const cliente = venta.cliente;
 const detalles = venta.detalles.map(d => ({
 id: d.id,
 productoId: d.productoId,
 descripcion: d.descripcion,
 unidad: d.unidad,
 exentoItbis: d.exentoItbis,
 cantidad: Number(d.cantidad),
 precio: Number(d.precio),
 precioFinal: Number(d.precioFinal),
 descuento: Number(d.descuento),
 itbis: Number(d.itbis),
 subtotal: Number(d.subtotal),
 producto: {
 id: d.producto.id,
 codigo: d.producto.codigo,
 nombre: d.producto.nombre,
 unidadMedida: d.producto.unidadMedida,
 precioVenta: Number(d.producto.precioVenta),
 costoUltimo: d.producto.costoUltimo ? Number(d.producto.costoUltimo) : null,
 stockActual: Number(d.producto.stockActual),
 esFraccionable: d.producto.esFraccionable,
 unidadFraccion: d.producto.unidadFraccion,
 factorFraccion: d.producto.factorFraccion ? Number(d.producto.factorFraccion) : null,
 precioFraccion: d.producto.precioFraccion ? Number(d.producto.precioFraccion) : null,
 exentoItbis: d.producto.exentoItbis,
 categoriaCode: d.producto.categoria?.codigo ?? "",
 },
 }));
 return {
 id: venta.id,
 numero: venta.numero,
 tipo: venta.tipo,
 clienteId: venta.clienteId,
 direccionId: venta.direccionId,
 credito: venta.credito,
 fechaEntrega: venta.fechaEntrega,
 notas: venta.notas,
 subtotal: Number(venta.subtotal),
 itbis: Number(venta.itbis),
 total: Number(venta.total),
 cliente: cliente ? {
 ...cliente,
 limiteCredito: cliente.limiteCredito ? Number(cliente.limiteCredito) : null,
 margenPrecio: cliente.margenPrecio ? Number(cliente.margenPrecio) : null,
 } : null,
 detalles,
 };
}

export async function getClientes() {
 return prisma.contacto.findMany({
 where: { tipo: { in: ["CLIENTE", "AMBOS"] }, activo: true },
 select: {
 id: true,
 nombre: true,
 rnc: true,
 telefono: true,
 email: true,
 credito: true,
 limiteCredito: true,
 reglaPrecio: true,
 margenPrecio: true,
 direcciones: {
 select: { id: true, etiqueta: true, direccion: true },
 orderBy: { esPrincipal: "desc" },
 },
 },
 orderBy: { nombre: "asc" },
 });
}

export async function getProductoPorCodigo(codigo: string) {
 const p = await prisma.producto.findFirst({
 where: {
 OR: [
 { codigo: { equals: codigo, mode: "insensitive" } },
 { codigoBarras: { equals: codigo } },
 ],
 activo: true,
 },
 select: {
 id: true,
 codigo: true,
 nombre: true,
 unidadMedida: true,
 precioVenta: true,
 costoUltimo: true,
 stockActual: true,
 esFraccionable: true,
 unidadFraccion: true,
 factorFraccion: true,
 exentoItbis: true,
 },
 });
 if (!p) return null;
 return {
 ...p,
 precioVenta: Number(p.precioVenta),
 costoUltimo: p.costoUltimo != null ? Number(p.costoUltimo) : null,
 stockActual: Number(p.stockActual),
 factorFraccion: p.factorFraccion != null ? Number(p.factorFraccion) : null,
 };
}

export async function buscarProductosVenta(q: string) {
 if (!q || q.trim().length < 2) return [];
 const keyword = q.trim();
 const rows = await prisma.producto.findMany({
 where: {
 activo: true,
 OR: [
 { nombre: { contains: keyword, mode: "insensitive" } },
 { codigo: { contains: keyword, mode: "insensitive" } },
 { codigoBarras: { contains: keyword, mode: "insensitive" } },
 ],
 },
 select: {
 id: true,
 codigo: true,
 nombre: true,
 unidadMedida: true,
 precioVenta: true,
 costoUltimo: true, // necesario para calcular precio Kolmen y alertas de margen
 stockActual: true,
 esFraccionable: true,
 unidadFraccion: true,
 factorFraccion: true,
 precioFraccion: true,
 exentoItbis: true,
 categoria: { select: { codigo: true } }, // necesario para alertas de margen
 },
 orderBy: { nombre: "asc" },
 take: 12,
 });
 // Serialize Prisma Decimal  plain number so Client Components receive plain objects
 return rows.map((p) => ({
 ...p,
 precioVenta: Number(p.precioVenta),
 costoUltimo: p.costoUltimo != null ? Number(p.costoUltimo) : null,
 stockActual: Number(p.stockActual),
 factorFraccion: p.factorFraccion != null ? Number(p.factorFraccion) : null,
 precioFraccion: p.precioFraccion != null ? Number(p.precioFraccion) : null,
 categoriaCode: p.categoria?.codigo ?? "",
 }));
}

export interface ItemRecepcion {
 productoId: string;
 nombre: string;
 unidad: string;
 cantEnviada: number;
 cantRecibida: number; // puede ser menor a cantEnviada (recepción parcial)
 devuelto: boolean; // cliente devolvió el ítem completo
 nota?: string;
}

export async function confirmarRecepcionConduce(
 conduceId: string,
 detalles: ItemRecepcion[],
) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autorizado" };

 const conduce = await prisma.conduce.findUnique({ where: { id: conduceId } });
 if (!conduce) return { error: "Conduce no encontrado" };
 if (conduce.clienteRecibio) return { error: "Ya fue confirmada la recepción" };

 // Identificar ítems con recepción parcial o devuelta
 const ajustes = detalles.filter(
 (d) => d.devuelto || d.cantRecibida < d.cantEnviada
 );

 await prisma.$transaction(async (tx) => {
 // 1. Marcar conduce como recibido con el detalle JSON
 await tx.conduce.update({
 where: { id: conduceId },
 data: {
 clienteRecibio: true,
 fechaRecepcion: new Date(),
 detallesRecepcion: detalles as unknown as Prisma.InputJsonValue,
 },
 });

 if (ajustes.length === 0) return; // todo recibido completo, sin ajustes

 // 2. Para cada ítem con diferencia: ajustar DetalleVenta y devolver stock
 for (const item of ajustes) {
 const cantFinal = item.devuelto ? 0 : item.cantRecibida;
 const diferencia = item.cantEnviada - cantFinal; // unidades a devolver al stock

 // Obtener el detalle de venta para recalcular precios
 const detalle = await tx.detalleVenta.findFirst({
 where: { ventaId: conduce.ventaId, productoId: item.productoId },
 include: { producto: { select: { esFraccionable: true, factorFraccion: true, stockActual: true } } },
 });
 if (!detalle) continue;

 const precio = Number(detalle.precio); // base sin ITBIS por unidad
 const descuento = Number(detalle.descuento);
 const exento = detalle.exentoItbis;

 // CORRECCIÓN conduces fraccionados:
 // No usar cantFinal (= cantRecibida de ESTE conduce) sino descontar solo la diferencia
 // de ESTE conduce de la cantidad total acumulada en la venta.
 // Ej: 100 unidades originales, conduces 1+2 entregaron 75 ya, conduce 3 envía 25 y el
 // cliente no recibe nada → diferencia=25 → nuevaCantidad = 100 - 25 = 75 (no 0).
 const nuevaCantidad = Number(detalle.cantidad) - diferencia;
 const nuevoSubtotal = precio * nuevaCantidad * (1 - descuento / 100);
 const nuevoItbis = exento ? 0 : +(nuevoSubtotal * 0.18).toFixed(4);

 // Eliminar el detalle solo si la cantidad resultante es 0 o negativa
 if (nuevaCantidad <= 0) {
 await tx.detalleVenta.delete({ where: { id: detalle.id } });
 } else {
 await tx.detalleVenta.update({
 where: { id: detalle.id },
 data: {
 cantidad: nuevaCantidad,
 subtotal: nuevoSubtotal,
 itbis: nuevoItbis,
 },
 });
 }

 // Devolver stock (diferencia en unidades de fracción si aplica)
 const prod = detalle.producto;
 const difReal = prod.esFraccionable && prod.factorFraccion
 ? diferencia / Number(prod.factorFraccion)
 : diferencia;

 if (difReal > 0) {
 const stockAntes = Number(prod.stockActual);
 const stockDespues = stockAntes + difReal;
 await tx.producto.update({
 where: { id: item.productoId },
 data: { stockActual: { increment: difReal } },
 });
 await tx.movimientoInventario.create({
 data: {
 productoId: item.productoId,
 tipo: "ENTRADA_DEVOLUCION",
 cantidad: difReal,
 stockAntes,
 stockDespues,
 costo: 0,
 referencia: conduce.numero,
 notas: `Devolución parcial — conduce ${conduce.numero}`,
 },
 });
 }
 }

 // 3. Recalcular totales de la Venta
 const todosDetalles = await tx.detalleVenta.findMany({
 where: { ventaId: conduce.ventaId },
 });
 const nuevoSubtotalVenta = todosDetalles.reduce((s, d) => s + Number(d.subtotal), 0);
 const nuevoItbisVenta = todosDetalles.reduce((s, d) => s + Number(d.itbis), 0);
 const nuevoTotal = nuevoSubtotalVenta + nuevoItbisVenta;

 await tx.venta.update({
 where: { id: conduce.ventaId },
 data: { subtotal: nuevoSubtotalVenta, itbis: nuevoItbisVenta, total: nuevoTotal },
 });
 });

 revalidatePath(`/ventas/${conduce.ventaId}`);
 return { ok: true };
}

// Crear Cotización 

export async function crearCotizacion(input: VentaInput) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autorizado" };

 const numero = await siguienteNumero("COTIZACION");
 const dias = calcularDiasCredito(input.credito);
 const vence = dias ? new Date(Date.now() + dias * 86400000) : undefined;

 // subtotal = suma de precios base (sin ITBIS) por línea
 const subtotal = input.detalles.reduce((s, d) => {
 const base = d.cantidad * d.precio * (1 - d.descuento / 100);
 return s + base;
 }, 0);
 const totalItbis = input.detalles.reduce((s, d) => s + d.itbis, 0);
 const total = subtotal + totalItbis;

 try {
 const venta = await prisma.venta.create({
 data: {
 numero,
 numeroCotizacion: numero, // se preserva aunque el doc avance a OV/CDC/FAC
 tipo: "COTIZACION",
 clienteId: input.clienteId,
 direccionId: input.direccionId || null,
 creadorId: session.user.id,
 vendedorId: (await getVendedorActivoId()) ?? session.user.id,
 credito: input.credito as TipoCredito,
 diasCredito: dias,
 fechaVencimiento: vence,
 fechaEntrega: input.fechaEntrega ? new Date(input.fechaEntrega) : null,
 notas: input.notas || null,
 subtotal,
 itbis: totalItbis,
 total,
 estadoPago: "PENDIENTE",
 detalles: {
 create: input.detalles.map((d, i) => {
 const base = d.cantidad * d.precio * (1 - d.descuento / 100);
 return {
 productoId: d.productoId,
 descripcion: d.descripcion || null,
 unidad: d.unidad || null,
 cantidad: d.cantidad,
 precio: d.precio,
 precioFinal: d.precioFinal,
 exentoItbis: d.exentoItbis,
 descuento: d.descuento,
 itbis: d.itbis,
 subtotal: base,
 orden: i,
 };
 }),
 },
 },
 });

 revalidatePath("/ventas");
 // No limpiamos la sesión del vendedor aquí — el workflow ventas es multi-paso
 // (cotización  OV  conduce  factura). La sesión persiste toda la jornada.
 return { id: venta.id, numero: venta.numero };
 } catch (err) {
 console.error("[crearCotizacion]", err);
 const msg = err instanceof Error ? err.message : String(err);
 return { error: msg };
 }
}

// Editar cotización (solo mientras tipo === "COTIZACION")

export async function actualizarCotizacion(id: string, input: VentaInput) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autorizado" };

 const existente = await prisma.venta.findUnique({ where: { id } });
 if (!existente) return { error: "Cotización no encontrada" };
 if (existente.tipo !== "COTIZACION") return { error: "Solo se pueden editar cotizaciones" };

 const dias = calcularDiasCredito(input.credito);
 const vence = dias ? new Date(Date.now() + dias * 86400000) : null;

 const subtotal = input.detalles.reduce((s, d) => {
 const base = d.cantidad * d.precio * (1 - d.descuento / 100);
 return s + base;
 }, 0);
 const totalItbis = input.detalles.reduce((s, d) => s + d.itbis, 0);
 const total = subtotal + totalItbis;

 try {
 await prisma.$transaction(async (tx) => {
 // Eliminar detalles anteriores
 await tx.detalleVenta.deleteMany({ where: { ventaId: id } });
 // Actualizar encabezado y crear nuevos detalles
 await tx.venta.update({
 where: { id },
 data: {
 clienteId: input.clienteId,
 direccionId: input.direccionId || null,
 credito: input.credito as TipoCredito,
 diasCredito: dias,
 fechaVencimiento: vence,
 fechaEntrega: input.fechaEntrega ? new Date(input.fechaEntrega) : null,
 notas: input.notas || null,
 subtotal,
 itbis: totalItbis,
 total,
 detalles: {
 create: input.detalles.map((d, i) => {
 const base = d.cantidad * d.precio * (1 - d.descuento / 100);
 return {
 productoId: d.productoId,
 descripcion: d.descripcion || null,
 unidad: d.unidad || null,
 cantidad: d.cantidad,
 precio: d.precio,
 precioFinal: d.precioFinal,
 exentoItbis: d.exentoItbis,
 descuento: d.descuento,
 itbis: d.itbis,
 subtotal: base,
 orden: i,
 };
 }),
 },
 },
 });
 });

 revalidatePath(`/ventas/${id}`);
 revalidatePath("/ventas");
 return { ok: true };
 } catch (err) {
 console.error("[actualizarCotizacion]", err);
 const msg = err instanceof Error ? err.message : String(err);
 return { error: msg };
 }
}

// Flujo: COT  OV

export async function avanzarCotizacion(id: string) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autorizado" };

 const venta = await prisma.venta.findUnique({ where: { id } });
 if (!venta || venta.tipo !== "COTIZACION") return { error: "No es cotización" };

 const numero = await siguienteNumero("ORDEN_VENTA");
 await prisma.venta.update({
 where: { id },
 data: { tipo: "ORDEN_VENTA", cotizacionId: id, numero },
 });

 revalidatePath(`/ventas/${id}`);
 revalidatePath("/ventas");
 return { ok: true };
}

// Flujo: OV  CDC (reduce stock) 

export async function crearConduce(ventaId: string, data: {
 firmaEntregado?: string;
 firmaRecibido?: string;
 telefonoRecibido?: string;
 firmaChofer?: string;
 observaciones?: string;
}) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autorizado" };

 const venta = await prisma.venta.findUnique({
 where: { id: ventaId },
 include: {
 detalles: {
 include: {
 producto: {
 select: {
 stockActual: true,
 costoUltimo: true,
 esFraccionable: true,
 factorFraccion: true,
 },
 },
 },
 },
 },
 });
 if (!venta) return { error: "Venta no encontrada" };
 if (venta.tipo !== "ORDEN_VENTA") return { error: "Solo se puede crear conduce desde una Orden de Venta" };

 const numeroConduce = await siguienteNumero("CONDUCE_OUT");

 const conduce = await prisma.$transaction(async (tx) => {
 const c = await tx.conduce.create({
 data: {
 numero: numeroConduce,
 ventaId,
 tipo: "OUT",
 firmaEntregado: data.firmaEntregado || null,
 firmaRecibido: data.firmaRecibido || null,
 telefonoRecibido: data.telefonoRecibido || null,
 firmaChofer: data.firmaChofer || null,
 observaciones: data.observaciones || null,
 },
 });

 for (const d of venta.detalles) {
 const prod = d.producto;
 // Para productos fraccionables la cantidad almacenada está en unidades fracción (ej. pies)
 // Debemos convertir a unidades reales (ej. tubos) para descontar el stock
 const cantidadReal = prod.esFraccionable && prod.factorFraccion
 ? Number(d.cantidad) / Number(prod.factorFraccion)
 : Number(d.cantidad);

 const stockAntes = Number(prod.stockActual);
 const stockDespues = stockAntes - cantidadReal;

 await tx.producto.update({
 where: { id: d.productoId },
 data: { stockActual: { decrement: cantidadReal } },
 });

 await tx.movimientoInventario.create({
 data: {
 productoId: d.productoId,
 tipo: "SALIDA_VENTA",
 cantidad: cantidadReal,
 stockAntes,
 stockDespues,
 costo: Number(prod.costoUltimo),
 referencia: c.numero,
 notas: `Conduce ${c.numero}`,
 },
 });
 }

 await tx.venta.update({
 where: { id: ventaId },
 data: { tipo: "CONDUCE", conduceId: c.id },
 });

 return c;
 });

 revalidatePath(`/ventas/${ventaId}`);
 revalidatePath("/ventas");
 return { id: conduce.id, numero: conduce.numero };
}

// Flujo: CDC  FAC 

export async function facturarVenta(ventaId: string, data: {
 ncf: string;
 tipoNcf: string;
}) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autorizado" };

 const venta = await prisma.venta.findUnique({
 where: { id: ventaId },
 include: { conduces: { where: { tipo: "OUT" }, orderBy: { createdAt: "asc" } } },
 });
 if (!venta) return { error: "Venta no encontrada" };
 if (venta.tipo !== "CONDUCE" && venta.tipo !== "ORDEN_VENTA") {
 return { error: "Solo se puede facturar desde Conduce u Orden de Venta" };
 }

 // Validar unicidad del NCF (comprobante fiscal único por factura)
 if (data.ncf) {
 const existente = await prisma.venta.findFirst({
 where: { ncf: data.ncf },
 select: { numero: true, createdAt: true, cliente: { select: { nombre: true } } },
 });
 if (existente) {
 const fecha = new Date(existente.createdAt).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
 return { error: `El NCF "${data.ncf}" ya está registrado en ${existente.numero} (${existente.cliente?.nombre ?? "sin cliente"} — ${fecha}). Los comprobantes fiscales son únicos.` };
 }
 }
 // Bloquear facturación hasta que TODOS los conduces estén confirmados por el cliente
 if (venta.tipo === "CONDUCE") {
 const totalConduces = venta.conduces.length;
 const conducesSinConfirmar = venta.conduces.filter(c => !c.clienteRecibio);
 if (conducesSinConfirmar.length > 0) {
 return {
 error: totalConduces === 1
 ? "Debe confirmar que el cliente recibió la mercancía antes de facturar" : `Faltan ${conducesSinConfirmar.length} de ${totalConduces} conduces por confirmar (${conducesSinConfirmar.map(c => c.numero).join(", ")})`,
 };
 }
 }

 const numero = await siguienteNumero("FACTURA");

 await prisma.$transaction(async (tx) => {
 await tx.venta.update({
 where: { id: ventaId },
 data: {
 tipo: "FACTURADA",
 numero,
 ncf: data.ncf || null,
 tipoNcf: data.tipoNcf as TipoComprobante || null,
 },
 });

 // TODO: activar tras migrar servidor (pnpm prisma db push)
 // Snapshot costoAlVender para COGS histórico exacto — pendiente de columna en servidor

 // Crear CxC para TODAS las ventas del módulo (contado = vence hoy, crédito = N días).
 // PDV/caja gestiona su propia CxC; este bloque es solo para el flujo cotización→factura.
 {
 const dias = venta.credito !== "CONTADO" ? (calcularDiasCredito(venta.credito) ?? 30) : 0;
 await tx.cuentaPorCobrar.create({
 data: {
 ventaId: ventaId,
 clienteId: venta.clienteId,
 monto: venta.total,
 montoPagado: 0,
 saldo: venta.total,
 fechaEmision: new Date(),
 fechaVencimiento: new Date(Date.now() + dias * 86400000),
 estado: "PENDIENTE",
 },
 });
 }
 });

 revalidatePath(`/ventas/${ventaId}`);
 revalidatePath("/ventas");
 revalidatePath("/cxc");
 return { ok: true };
}

// Registrar cobro 

export async function registrarPagoVenta(ventaId: string, data: {
 monto: number;
 fecha: string;
 metodo: string;
 referencia?: string;
}) {
 const venta = await prisma.venta.findUnique({
 where: { id: ventaId },
 include: { pagosRecibidos: true, cuentasPorCobrar: true },
 });
 if (!venta) return { error: "Venta no encontrada" };

 const totalPagado = venta.pagosRecibidos.reduce((s, p) => s + Number(p.monto), 0);
 const nuevoTotal = totalPagado + data.monto;
 const saldoFinal = Number(venta.total) - nuevoTotal;
 const nuevoEstado: EstadoPago =
 saldoFinal <= 0 ? "PAGADO" : nuevoTotal > 0 ? "PAGADO_PARCIAL" : "PENDIENTE";

 await prisma.$transaction(async (tx) => {
 await tx.pagoVenta.create({
 data: {
 ventaId,
 monto: data.monto,
 fecha: new Date(data.fecha),
 metodo: data.metodo,
 referencia: data.referencia || null,
 },
 });

 await tx.venta.update({
 where: { id: ventaId },
 data: { estadoPago: nuevoEstado },
 });

 const cxc = venta.cuentasPorCobrar[0];
 if (cxc) {
 const nuevoPagado = Number(cxc.montoPagado) + data.monto;
 const nuevoSaldo = Number(cxc.monto) - nuevoPagado;
 await tx.cuentaPorCobrar.update({
 where: { id: cxc.id },
 data: {
 montoPagado: nuevoPagado,
 saldo: Math.max(0, nuevoSaldo),
 estado: nuevoSaldo <= 0 ? "PAGADO" : nuevoPagado > 0 ? "PAGADO_PARCIAL" : "PENDIENTE",
 },
 });
 }
 });

 revalidatePath(`/ventas/${ventaId}`);
 revalidatePath("/cxc");
 return { ok: true };
}

// Cancelar 

export async function cancelarVenta(id: string) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autorizado" };

 const venta = await prisma.venta.findUnique({ where: { id } });
 if (!venta) return { error: "No encontrado" };
 if (venta.tipo === "FACTURADA") return { error: "No se puede cancelar una factura" };

 await prisma.venta.update({ where: { id }, data: { tipo: "CANCELADA" } });

 revalidatePath(`/ventas/${id}`);
 revalidatePath("/ventas");
 return { ok: true };
}

// CxC 

export async function getCxC(opts: {
 busqueda?: string;
 bucket?: string;
 page?: number;
 pageSize?: number;
}) {
 const { busqueda = "", bucket = "", page = 1, pageSize = 30 } = opts;
 const skip = (page - 1) * pageSize;
 const hoy = new Date();

 const base: Prisma.CuentaPorCobrarWhereInput = {
 estado: { not: "PAGADO" },
 ...(busqueda ? {
 OR: [
 { cliente: { nombre: { contains: busqueda, mode: "insensitive" } } },
 { venta: { numero: { contains: busqueda, mode: "insensitive" } } },
 ],
 } : {}),
 };

 const bucketFilter: Prisma.CuentaPorCobrarWhereInput =
 bucket === "0-30" ? {
 fechaVencimiento: { gte: new Date(hoy.getTime() - 30 * 86400000), lte: hoy },
 } : bucket === "31-60" ? {
 fechaVencimiento: {
 gte: new Date(hoy.getTime() - 60 * 86400000),
 lt: new Date(hoy.getTime() - 30 * 86400000),
 },
 } : bucket === "61-90" ? {
 fechaVencimiento: {
 gte: new Date(hoy.getTime() - 90 * 86400000),
 lt: new Date(hoy.getTime() - 60 * 86400000),
 },
 } : bucket === "90+" ? {
 fechaVencimiento: { lt: new Date(hoy.getTime() - 90 * 86400000) },
 } : {};

 const where: Prisma.CuentaPorCobrarWhereInput = { ...base, ...bucketFilter };

 const [cxcs, total] = await Promise.all([
 prisma.cuentaPorCobrar.findMany({
 where,
 skip,
 take: pageSize,
 orderBy: { fechaVencimiento: "asc" },
 include: {
 cliente: { select: { nombre: true } },
 venta: { select: { numero: true } },
 },
 }),
 prisma.cuentaPorCobrar.count({ where }),
 ]);

 const allPending = await prisma.cuentaPorCobrar.findMany({
 where: { estado: { not: "PAGADO" } },
 select: { saldo: true, fechaVencimiento: true },
 });

 const buckets = { b0: 0, b30: 0, b60: 0, b90: 0, b90p: 0 };
 for (const c of allPending) {
 const days = Math.floor((hoy.getTime() - c.fechaVencimiento.getTime()) / 86400000);
 const saldo = Number(c.saldo);
 if (days <= 0) buckets.b0 += saldo;
 else if (days <= 30) buckets.b30 += saldo;
 else if (days <= 60) buckets.b60 += saldo;
 else if (days <= 90) buckets.b90 += saldo;
 else buckets.b90p += saldo;
 }

 return { cxcs, total, pages: Math.ceil(total / pageSize), buckets };
}

// Listado de conduces PDV para módulo de despachos 
// Agrupa por VENTA para que una venta con varios conduces parciales aparezca
// en una sola tarjeta y el usuario pueda seguir dividiendo desde allí.

export async function getConducesPDV(filtro?: "pendiente" | "entregado") {
 const ventas = await prisma.venta.findMany({
 where: {
 tipo: "FACTURADA",
 turnoId: { not: null }, // Solo ventas originadas en caja (PDV)
 conduces: { some: { tipo: "OUT" } },
 },
 include: {
 cliente: { select: { nombre: true, rnc: true } },
 detalles: {
 select: {
 productoId: true,
 descripcion: true,
 unidad: true,
 cantidad: true,
 producto: { select: { nombre: true, unidadMedida: true } },
 },
 orderBy: { orden: "asc" },
 },
 conduces: {
 where: { tipo: "OUT" },
 orderBy: { createdAt: "asc" },
 select: {
 id: true,
 numero: true,
 fechaEmision: true,
 clienteRecibio: true,
 fechaRecepcion: true,
 detallesRecepcion: true,
 },
 },
 },
 orderBy: { createdAt: "desc" },
 });

 // Filtrar ventas según el tab seleccionado
 const filtradas = ventas.filter(v => {
 if (!v.conduces.length) return false;
 if (filtro === "pendiente") return v.conduces.some(c => !c.clienteRecibio);
 if (filtro === "entregado") return v.conduces.every(c => c.clienteRecibio);
 return true;
 });

 return filtradas.map(v => ({
 ventaId: v.id,
 ventaNumero: v.numero,
 ventaTotal: Number(v.total),
 fechaEmision: v.fechaEmision,
 cliente: v.cliente,
 detalles: v.detalles.map(d => ({
 productoId: d.productoId,
 nombre: d.descripcion ?? d.producto.nombre,
 unidad: d.unidad ?? d.producto.unidadMedida,
 cantidad: Number(d.cantidad),
 })),
 conduces: v.conduces.map(c => ({
 id: c.id,
 numero: c.numero,
 fechaEmision: c.fechaEmision,
 clienteRecibio: c.clienteRecibio,
 fechaRecepcion: c.fechaRecepcion,
 detallesRecepcion: c.detallesRecepcion,
 })),
 }));
}

// Conduce de despacho (para ventas FACTURADAS del PDV) 
// A diferencia de crearConduce(), esta función NO deduce stock porque el stock
// ya fue descontado cuando la cajera procesó el pago (procesarPagoCaja).

export async function generarConduceDespacho(ventaId: string) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autorizado" };

 const venta = await prisma.venta.findUnique({ where: { id: ventaId } });
 if (!venta) return { error: "Venta no encontrada" };
 if (venta.tipo !== "FACTURADA" && venta.tipo !== "CONDUCE")
 return { error: "Solo para facturas o conduces" };

 const numero = await siguienteNumero("CONDUCE_OUT");
 const conduce = await prisma.conduce.create({
 data: { numero, ventaId, tipo: "OUT" },
 });

 revalidatePath(`/ventas/${ventaId}`);
 revalidatePath("/ventas");
 return { ok: true, conduceId: conduce.id, numero };
}

// Conduce parcial (selección de ítems específicos) 

export interface ItemConduceParcial {
 productoId: string;
 nombre: string;
 unidad: string;
 cantEnviada: number;
}

export async function crearConduceParcial(
 ventaId: string,
 items: ItemConduceParcial[],
 observaciones?: string,
) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autorizado" };
 if (!items.length) return { error: "Selecciona al menos un ítem" };

 const venta = await prisma.venta.findUnique({ where: { id: ventaId } });
 if (!venta) return { error: "Venta no encontrada" };
 if (venta.tipo !== "FACTURADA" && venta.tipo !== "CONDUCE")
 return { error: "Solo para facturas o conduces en tránsito" };

 // Guardar los ítems seleccionados como detallesRecepcion (cantRecibida = 0 inicialmente)
 const detallesRecepcion = items.map(i => ({
 productoId: i.productoId,
 nombre: i.nombre,
 unidad: i.unidad,
 cantEnviada: i.cantEnviada,
 cantRecibida: 0,
 devuelto: false,
 nota: "",
 }));

 // Identificar conduces sin tracking (sin detallesRecepcion) que aún no han sido entregados.
 // Son los conduces "completos" creados automáticamente (ej. al avanzar OV  CONDUCE).
 // Cuando el usuario crea un conduce parcial, esos se eliminan para evitar duplicados.
 const conducesSinTracking = await prisma.conduce.findMany({
 where: { ventaId, clienteRecibio: false },
 select: { id: true, detallesRecepcion: true },
 });
 const idsAEliminar = conducesSinTracking
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 .filter(c => c.detallesRecepcion === null || (Array.isArray(c.detallesRecepcion) && (c.detallesRecepcion as any[]).length === 0))
 .map(c => c.id);

 const numero = await siguienteNumero("CONDUCE_OUT");

 const conduce = await prisma.$transaction(async (tx) => {
 // 1. Eliminar conduces automáticos sin tracking
 if (idsAEliminar.length > 0) {
 await tx.conduce.deleteMany({ where: { id: { in: idsAEliminar } } });
 // Si la venta tenía conduceId apuntando a uno de los eliminados, limpiarlo
 if (venta.conduceId && idsAEliminar.includes(venta.conduceId)) {
 await tx.venta.update({
 where: { id: ventaId },
 data: { conduceId: null },
 });
 }
 }

 // 2. Crear el conduce parcial
 return tx.conduce.create({
 data: {
 numero,
 ventaId,
 tipo: "OUT",
 observaciones: observaciones ?? null,
 detallesRecepcion: detallesRecepcion as unknown as Prisma.InputJsonValue,
 },
 });
 });

 revalidatePath(`/ventas/${ventaId}`);
 revalidatePath("/ventas");
 return { ok: true, conduceId: conduce.id, numero };
}

// Marcar conduce como entregado 

export async function marcarConduceEntregado(conduceId: string) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autorizado" };

 const conduce = await prisma.conduce.findUnique({ where: { id: conduceId } });
 if (!conduce) return { error: "Conduce no encontrado" };
 if (conduce.clienteRecibio) return { error: "Ya fue marcado como entregado" };

 await prisma.conduce.update({
 where: { id: conduceId },
 data: { clienteRecibio: true, fechaRecepcion: new Date() },
 });

 revalidatePath(`/ventas/${conduce.ventaId}`);
 revalidatePath("/ventas");
 return { ok: true };
}

// Eliminar venta/cotización (admin) 
// Solo COTIZACION u ORDEN_VENTA sin pagos ni conduces recibidos

export async function eliminarVenta(id: string) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autorizado" };

 const venta = await prisma.venta.findUnique({
 where: { id },
 include: {
 pagosRecibidos: { select: { id: true } },
 conduces: { select: { id: true, clienteRecibio: true } },
 },
 });
 if (!venta) return { error: "Venta no encontrada" };

 const tiposPermitidos: EstadoVenta[] = ["COTIZACION", "ORDEN_VENTA"];
 if (!tiposPermitidos.includes(venta.tipo)) {
 return { error: `No se puede eliminar una ${venta.tipo}. Solo cotizaciones y órdenes de venta.` };
 }
 if (venta.pagosRecibidos.length > 0) {
 return { error: "Esta venta tiene pagos registrados y no puede eliminarse" };
 }
 if (venta.conduces.some((c) => c.clienteRecibio)) {
 return { error: "Un conduce ya fue recibido — no se puede eliminar la venta" };
 }

 // Eliminar conduces primero (no tienen cascade en venta)
 if (venta.conduces.length > 0) {
 await prisma.conduce.deleteMany({ where: { ventaId: id } });
 }

 // detalles y pagos tienen onDelete: Cascade
 await prisma.venta.delete({ where: { id } });
 revalidatePath("/ventas");
 redirect("/ventas");
}

// Kolmen: recalcular precios de una orden con costos actuales 
// Retorna los nuevos precios para cada producto de la orden usando la fórmula:
// precioFinal = costoUltimo × 1.18 × (1 + margen/100)

export async function recalcularPreciosKolmen(ventaId: string) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autorizado" };

 const venta = await prisma.venta.findUnique({
 where: { id: ventaId },
 include: {
 cliente: { select: { id: true, reglaPrecio: true, margenPrecio: true } },
 detalles: {
 include: { producto: { select: { id: true, costoUltimo: true, exentoItbis: true } } },
 },
 },
 });
 if (!venta) return { error: "Venta no encontrada" };
 if (venta.cliente.reglaPrecio !== "MARGEN_COSTO") return { error: "Este cliente no tiene regla de margen sobre costo" };
 if (!venta.cliente.margenPrecio) return { error: "El cliente no tiene un margen configurado" };

 const margen = Number(venta.cliente.margenPrecio) / 100; // ej. 0.15

 const nuevosPrecios = venta.detalles.map(d => {
 const costo = Number(d.producto.costoUltimo);
 const exento = d.producto.exentoItbis;
 // Si el producto es exento de ITBIS: precio = costo × (1 + margen)
 // Si no: precio = costo × 1.18 × (1 + margen) — ITBIS incluido en el precio final
 const precio = exento
 ? +(costo * (1 + margen)).toFixed(4)
 : +(costo * 1.18 * (1 + margen)).toFixed(4);
 return { detalleId: d.id, productoId: d.productoId, precio, costo, exento };
 });

 // Aplicar los nuevos precios y recalcular totales
 let subtotal = 0, itbisTotal = 0;

 await prisma.$transaction(async (tx) => {
 for (const np of nuevosPrecios) {
 const detalle = venta.detalles.find(d => d.id === np.detalleId)!;
 const cantidad = Number(detalle.cantidad);
 const desc = Number(detalle.descuento) / 100;
 const base = np.exento ? np.precio : np.precio / 1.18;
 const sub = +(base * cantidad * (1 - desc)).toFixed(2);
 const itbis = np.exento ? 0 : +(sub * 0.18).toFixed(2);

 await tx.detalleVenta.update({
 where: { id: np.detalleId },
 data: { precio: base, precioFinal: np.precio, itbis, subtotal: sub },
 });

 subtotal += sub;
 itbisTotal += itbis;
 }

 const total = +(subtotal + itbisTotal).toFixed(2);
 await tx.venta.update({
 where: { id: ventaId },
 data: { subtotal, itbis: itbisTotal, total },
 });
 });

 revalidatePath(`/ventas/${ventaId}`);
 return { ok: true, recalculados: nuevosPrecios.length };
}
