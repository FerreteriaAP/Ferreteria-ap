"use server";

import { prisma } from "@/lib/prisma";
import { type Prisma } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cap } from "@/lib/format";

// Schemas 

const ProductoSchema = z.object({
 codigo: z.string().min(1, "Código requerido"),
 codigoBarras: z.string().optional(),
 nombre: z.string().min(1, "Nombre requerido"),
 descripcion: z.string().optional(),
 categoriaId: z.string().min(1, "Categoría requerida"),
 unidadMedida: z.string().min(1, "Unidad requerida"),
 // Fraccionamiento
 esFraccionable: z.boolean().default(false),
 unidadFraccion: z.string().optional(),
 factorFraccion: z.coerce.number().positive().optional(),
 precioFraccion: z.coerce.number().min(0).optional(),
 // Precios
 costoUltimo: z.coerce.number().min(0).default(0),
 porcentajeGanancia: z.coerce.number().min(0).default(30),
 precioVenta: z.coerce.number().min(0),
 precioMayoreo: z.coerce.number().min(0).optional(),
 // Stock
 stockActual: z.coerce.number().default(0),
 stockMinimo: z.coerce.number().min(0).default(0),
 stockMaximo: z.coerce.number().min(0).optional(),
 // Impuestos
 exentoItbis: z.boolean().default(false),
 // Servicio (precio variable por venta)
 esServicio: z.boolean().default(false),
 // Meta
 activo: z.boolean().default(true),
});

export type ProductoInput = z.infer<typeof ProductoSchema>;

// Helpers 

/** Genera el siguiente número de secuencia con padding (global) */
export async function siguienteCodigoProducto(): Promise<string> {
 const productos = await prisma.producto.findMany({
  where: { codigo: { startsWith: "PROD-" } },
  select: { codigo: true },
 });
 let maxNum = 0;
 for (const p of productos) {
  const num = parseInt(p.codigo.replace("PROD-", ""), 10);
  if (!isNaN(num) && num > maxNum) maxNum = num;
 }
 return `PROD-${String(maxNum + 1).padStart(5, "0")}`;
}

/** Genera el siguiente código por categoría: <CODIGO_CAT>-00001 */
export async function siguienteCodigoPorCategoria(categoriaId: string): Promise<string> {
 const cat = await prisma.categoria.findUnique({ where: { id: categoriaId }, select: { codigo: true } });
 const prefix = cat?.codigo ?? "PROD";
 const productos = await prisma.producto.findMany({
  where: { codigo: { startsWith: `${prefix}-` } },
  select: { codigo: true },
 });
 let maxNum = 0;
 for (const p of productos) {
  const num = parseInt(p.codigo.replace(`${prefix}-`, ""), 10);
  if (!isNaN(num) && num > maxNum) maxNum = num;
 }
 return `${prefix}-${String(maxNum + 1).padStart(5, "0")}`;
}

/** Busca productos por keyword (nombre, código o código de barras) */
export async function buscarProductosPorKeyword(q: string) {
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
 id: true, nombre: true, codigo: true,
 unidadMedida: true, costoUltimo: true, stockActual: true,
 precioVenta: true, porcentajeGanancia: true, exentoItbis: true,
 },
 orderBy: { nombre: "asc" },
 take: 10,
 });
 return rows.map((r) => ({
 id: r.id,
 nombre: r.nombre,
 codigo: r.codigo,
 unidadMedida: r.unidadMedida,
 costoUltimo: Number(r.costoUltimo),
 stockActual: Number(r.stockActual),
 precioVenta: Number(r.precioVenta),
 porcentajeGanancia: Number(r.porcentajeGanancia),
 exentoItbis: r.exentoItbis,
 }));
}

// Listar 

export async function getProductos(params?: {
 categoriaId?: string;
 busqueda?: string;
 soloActivos?: boolean;
 soloArchivados?: boolean;
 stockBajo?: boolean;
 page?: number;
 pageSize?: number;
}) {
 const {
 categoriaId,
 busqueda = "",
 soloActivos = true,
 soloArchivados = false,
 stockBajo = false,
 page = 1,
 pageSize = 50,
 } = params ?? {};

 const where: Prisma.ProductoWhereInput = {};

 if (soloArchivados) where.activo = false;
 else if (soloActivos) where.activo = true;
 if (categoriaId) where.categoriaId = categoriaId;

 if (busqueda) {
 where.OR = [
 { nombre: { contains: busqueda, mode: "insensitive" } },
 { codigo: { contains: busqueda, mode: "insensitive" } },
 { codigoBarras: { contains: busqueda, mode: "insensitive" } },
 ];
 }

 // Los productos con stock bajo los filtramos en JS porque Prisma no compara
 // campos entre sí directamente sin raw query
 const [total, productos] = await Promise.all([
 prisma.producto.count({ where }),
 prisma.producto.findMany({
 where,
 include: { categoria: true },
 orderBy: { nombre: "asc" },
 skip: stockBajo ? 0 : (page - 1) * pageSize,
 take: stockBajo ? 9999 : pageSize,
 }),
 ]);

 // Convertir Decimal  number en todos los productos
 const serializados = productos.map((p) => ({
 ...p,
 costoPromedio: Number(p.costoPromedio),
 costoUltimo: Number(p.costoUltimo),
 porcentajeGanancia: Number(p.porcentajeGanancia),
 precioVenta: Number(p.precioVenta),
 precioMayoreo: p.precioMayoreo != null ? Number(p.precioMayoreo) : null,
 stockActual: Number(p.stockActual),
 stockMinimo: Number(p.stockMinimo),
 stockMaximo: p.stockMaximo != null ? Number(p.stockMaximo) : null,
 factorFraccion: p.factorFraccion != null ? Number(p.factorFraccion) : null,
 precioFraccion: p.precioFraccion != null ? Number(p.precioFraccion) : null,
 createdAt: p.createdAt.toISOString(),
 updatedAt: p.updatedAt.toISOString(),
 }));

 if (stockBajo) {
 const filtrados = serializados.filter(
 (p) => p.stockActual <= p.stockMinimo && p.stockMinimo > 0
 );
 const start = (page - 1) * pageSize;
 return {
 productos: filtrados.slice(start, start + pageSize),
 total: filtrados.length,
 pages: Math.ceil(filtrados.length / pageSize),
 };
 }

 return { productos: serializados, total, pages: Math.ceil(total / pageSize) };
}

export async function getProducto(id: string) {
 const p = await prisma.producto.findUnique({
 where: { id },
 include: {
 categoria: true,
 movimientos: {
 orderBy: { createdAt: "desc" },
 take: 20,
 },
 },
 });
 if (!p) return null;
 return {
 ...p,
 costoPromedio: Number(p.costoPromedio),
 costoUltimo: Number(p.costoUltimo),
 porcentajeGanancia: Number(p.porcentajeGanancia),
 precioVenta: Number(p.precioVenta),
 precioMayoreo: p.precioMayoreo != null ? Number(p.precioMayoreo) : null,
 stockActual: Number(p.stockActual),
 stockMinimo: Number(p.stockMinimo),
 stockMaximo: p.stockMaximo != null ? Number(p.stockMaximo) : null,
 factorFraccion: p.factorFraccion != null ? Number(p.factorFraccion) : null,
 precioFraccion: p.precioFraccion != null ? Number(p.precioFraccion) : null,
 createdAt: p.createdAt.toISOString(),
 updatedAt: p.updatedAt.toISOString(),
 movimientos: p.movimientos.map((m) => ({
 ...m,
 cantidad: Number(m.cantidad),
 stockAntes: Number(m.stockAntes),
 stockDespues:Number(m.stockDespues),
 costo: m.costo != null ? Number(m.costo) : null,
 createdAt: m.createdAt.toISOString(),
 })),
 };
}

export async function getProductoPorCodigo(codigo: string) {
 const p = await prisma.producto.findFirst({
 where: {
 OR: [{ codigo }, { codigoBarras: codigo }],
 activo: true,
 },
 });
 if (!p) return null;
 // Convertir todos los Decimal a number para que sean serializables
 return {
 ...p,
 costoPromedio: Number(p.costoPromedio),
 costoUltimo: Number(p.costoUltimo),
 porcentajeGanancia: Number(p.porcentajeGanancia),
 precioVenta: Number(p.precioVenta),
 precioMayoreo: p.precioMayoreo != null ? Number(p.precioMayoreo) : null,
 stockActual: Number(p.stockActual),
 stockMinimo: Number(p.stockMinimo),
 stockMaximo: p.stockMaximo != null ? Number(p.stockMaximo) : null,
 factorFraccion: p.factorFraccion != null ? Number(p.factorFraccion) : null,
 precioFraccion: p.precioFraccion != null ? Number(p.precioFraccion) : null,
 createdAt: p.createdAt.toISOString(),
 updatedAt: p.updatedAt.toISOString(),
 };
}

// Movimientos de inventario (paginado, para página dedicada) 

export async function getMovimientosProducto(id: string, page = 1, pageSize = 50) {
 const skip = (page - 1) * pageSize;
 const [items, total] = await Promise.all([
 prisma.movimientoInventario.findMany({
 where: { productoId: id },
 orderBy: { createdAt: "desc" },
 skip,
 take: pageSize,
 }),
 prisma.movimientoInventario.count({ where: { productoId: id } }),
 ]);
 return {
 items: items.map(m => ({
 ...m,
 cantidad: Number(m.cantidad),
 stockAntes: Number(m.stockAntes),
 stockDespues:Number(m.stockDespues),
 costo: m.costo != null ? Number(m.costo) : null,
 createdAt: m.createdAt.toISOString(),
 })),
 total,
 pages: Math.ceil(total / pageSize),
 };
}

// Historial de compras del producto 

export async function getHistorialComprasProducto(id: string) {
 const rows = await prisma.detalleCompra.findMany({
 where: { productoId: id },
 include: {
 compra: {
 select: {
 id: true,
 numero: true,
 fechaFactura: true,
 suplidor: {
 select: { nombre: true },
 },
 },
 },
 },
 orderBy: { compra: { fechaFactura: "desc" } },
 });

 return rows.map(d => ({
 id: d.id,
 compraId: d.compraId,
 compraNumero: d.compra.numero,
 compraUrl: `/compras/${d.compraId}`,
 fecha: d.compra.fechaFactura.toISOString(),
 suplidor: d.compra.suplidor.nombre,
 cantidad: Number(d.cantidad),
 costoUnitario:Number(d.costo),
 total: Number(d.subtotal) + Number(d.itbis),
 subtotal: Number(d.subtotal),
 itbis: Number(d.itbis),
 }));
}

export async function getCategorias() {
 return prisma.categoria.findMany({ orderBy: { nombre: "asc" } });
}

// Crear 

export async function crearProducto(data: ProductoInput) {
 const parsed = ProductoSchema.safeParse(data);
 if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

 const {
 codigoBarras, unidadFraccion, factorFraccion, precioFraccion,
 precioMayoreo, stockMaximo, costoUltimo, ...rest
 } = parsed.data;

 try {
 const producto = await prisma.producto.create({
 data: {
 ...rest,
 nombre: cap(rest.nombre),
 costoUltimo,
 costoPromedio: costoUltimo,
 codigoBarras: codigoBarras || null,
 unidadFraccion: unidadFraccion || null,
 factorFraccion: factorFraccion ?? null,
 precioFraccion: precioFraccion ?? null,
 precioMayoreo: precioMayoreo ?? null,
 stockMaximo: stockMaximo ?? null,
 },
 });

 // Registrar movimiento inicial si hay stock
 if (parsed.data.stockActual > 0) {
 await prisma.movimientoInventario.create({
 data: {
 productoId: producto.id,
 tipo: "ENTRADA_AJUSTE",
 cantidad: parsed.data.stockActual,
 stockAntes: 0,
 stockDespues: parsed.data.stockActual,
 costo: costoUltimo,
 notas: "Stock inicial al crear producto",
 },
 });
 }

 revalidatePath("/productos");
 return { success: true, id: producto.id };
 } catch (e: unknown) {
 console.error("[crearProducto] Error al guardar:", e);
 const error = e as { code?: string; meta?: { target?: string[] } };
 const msg = e instanceof Error ? e.message : String(e);
 const isUnique = error.code === "P2002" || msg.includes("Unique constraint") || msg.includes("unique constraint");
 if (isUnique) {
  const field = error.meta?.target?.[0];
  if (field === "codigo") return { error: { codigo: ["Este código ya existe"] } };
  if (field === "codigoBarras") return { error: { codigoBarras: ["Este código de barras ya existe"] } };
  return { error: { codigo: ["El código interno o código de barras ya existe en otro producto"] } };
 }
 return { error: { _: [`Error: ${msg.slice(0, 300)}`] } };
 }
}

// Actualizar 

export async function actualizarProducto(id: string, data: ProductoInput) {
 const parsed = ProductoSchema.safeParse(data);
 if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

 const productoActual = await prisma.producto.findUnique({ where: { id } });
 if (!productoActual) return { error: { _: ["Producto no encontrado"] } };

 const {
 codigoBarras, unidadFraccion, factorFraccion, precioFraccion,
 precioMayoreo, stockMaximo, costoUltimo, stockActual, ...rest
 } = parsed.data;

 try {
 await prisma.$transaction(async (tx) => {
 await tx.producto.update({
 where: { id },
 data: {
 ...rest,
 nombre: cap(rest.nombre),
 costoUltimo,
 codigoBarras: codigoBarras || null,
 unidadFraccion: unidadFraccion || null,
 factorFraccion: factorFraccion ?? null,
 precioFraccion: precioFraccion ?? null,
 precioMayoreo: precioMayoreo ?? null,
 stockMaximo: stockMaximo ?? null,
 },
 });

 // Ajuste de stock si cambió
 const stockAnterior = Number(productoActual.stockActual);
 if (stockActual !== stockAnterior) {
 const diff = stockActual - stockAnterior;
 await tx.producto.update({
 where: { id },
 data: { stockActual },
 });
 await tx.movimientoInventario.create({
 data: {
 productoId: id,
 tipo: diff > 0 ? "ENTRADA_AJUSTE" : "SALIDA_AJUSTE",
 cantidad: Math.abs(diff),
 stockAntes: stockAnterior,
 stockDespues: stockActual,
 notas: "Ajuste manual desde edición de producto",
 },
 });
 }

 // Alerta si el precio cambió
 const costoAnterior = Number(productoActual.costoUltimo);
 if (costoUltimo !== costoAnterior && costoAnterior > 0) {
 const diff = ((costoUltimo - costoAnterior) / costoAnterior) * 100;
 await tx.alertaInventario.create({
 data: {
 productoId: id,
 tipo: "PRECIO_CAMBIO",
 mensaje: `Costo cambió de RD$${costoAnterior.toFixed(2)} a RD$${costoUltimo.toFixed(2)} (${diff > 0 ? "+" : ""}${diff.toFixed(1)}%)`,
 },
 });
 }
 });

 revalidatePath("/productos");
 revalidatePath(`/productos/${id}`);
 return { success: true };
 } catch (e: unknown) {
 const error = e as { code?: string; meta?: { target?: string[] } };
 if (error.code === "P2002") {
 const field = error.meta?.target?.[0];
 if (field === "codigo") return { error: { codigo: ["Este código ya existe"] } };
 if (field === "codigoBarras") return { error: { codigoBarras: ["Este código de barras ya existe"] } };
 }
 return { error: { _: ["Error al actualizar"] } };
 }
}

// Ajuste de stock manual 

export async function ajustarStock(productoId: string, cantidad: number, notas?: string) {
 const producto = await prisma.producto.findUnique({ where: { id: productoId } });
 if (!producto) return { error: "Producto no encontrado" };

 const stockAntes = Number(producto.stockActual);
 const stockDespues = stockAntes + cantidad;

 if (stockDespues < 0) return { error: "Stock no puede quedar negativo" };

 await prisma.$transaction([
 prisma.producto.update({
 where: { id: productoId },
 data: { stockActual: stockDespues },
 }),
 prisma.movimientoInventario.create({
 data: {
 productoId,
 tipo: cantidad > 0 ? "ENTRADA_AJUSTE" : "SALIDA_AJUSTE",
 cantidad: Math.abs(cantidad),
 stockAntes,
 stockDespues,
 notas: notas ?? "Ajuste manual",
 },
 }),
 ]);

 // Verificar alerta de stock mínimo
 if (stockDespues <= Number(producto.stockMinimo) && Number(producto.stockMinimo) > 0) {
 await prisma.alertaInventario.create({
 data: {
 productoId,
 tipo: "STOCK_MINIMO",
 mensaje: `Stock bajo: ${stockDespues} unidades (mínimo: ${producto.stockMinimo})`,
 },
 });
 }

 revalidatePath(`/productos/${productoId}`);
 revalidatePath("/productos");
 return { success: true };
}

// ── Archivar / Reactivar producto (soft-delete) ──────────────────────────────

export async function archivarProducto(id: string) {
  await prisma.producto.update({
    where: { id },
    data: { activo: false },
  });
  revalidatePath("/productos");
  revalidatePath(`/productos/${id}`);
  return { success: true };
}

export async function reactivarProducto(id: string) {
  await prisma.producto.update({
    where: { id },
    data: { activo: true },
  });
  revalidatePath("/productos");
  revalidatePath(`/productos/${id}`);
  return { success: true };
}

// ── Eliminar producto (hard-delete) — solo si no tiene historial ─────────────

export async function eliminarProducto(id: string) {
  // Verificar si el producto tiene registros relacionados que impidan borrarlo
  const [ventas, compras, movimientos] = await Promise.all([
    prisma.detalleVenta.count({ where: { productoId: id } }),
    prisma.detalleOrdenCompra.count({ where: { productoId: id } }),
    prisma.movimientoInventario.count({ where: { productoId: id } }),
  ]);

  if (ventas > 0 || compras > 0 || movimientos > 0) {
    return {
      error: `No se puede eliminar: el producto tiene ${ventas} venta(s), ${compras} compra(s) y ${movimientos} movimiento(s) de inventario. Usa "Archivar" para ocultarlo del inventario.`,
    };
  }

  // Sin historial: eliminar alertas y luego el producto
  await prisma.$transaction([
    prisma.alertaInventario.deleteMany({ where: { productoId: id } }),
    prisma.producto.delete({ where: { id } }),
  ]);

  revalidatePath("/productos");
  return { success: true };
}
