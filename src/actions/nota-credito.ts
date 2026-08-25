"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { generarNumero } from "@/lib/numeracion";
import { revalidatePath } from "next/cache";

async function getUserId() {
 const s = await auth();
 return s?.user?.id ?? null;
}

async function siguienteNumeroNC(): Promise<string> {
  return generarNumero("NOTA_CREDITO", "NCR");
}

export interface NotaCreditoDetalleItem {
 productoId: string;
 nombre: string;
 unidad: string;
 cantidad: number;
 precioUnitario: number; // precio final (con ITBIS)
 subtotal: number;
}

export interface CrearNotaCreditoInput {
 ventaId: string;
 turnoId: string;
 motivo: string;
 detalles: NotaCreditoDetalleItem[];
 notas?: string;
}

export async function crearNotaCredito(input: CrearNotaCreditoInput) {
 const userId = await getUserId();
 if (!userId) return { error: "No autenticado" };

 if (!input.detalles.length) return { error: "Agrega al menos un artículo a devolver" };
 if (!input.motivo.trim()) return { error: "Indica el motivo de la nota de crédito" };

 const venta = await prisma.venta.findUnique({
 where: { id: input.ventaId },
 include: { cliente: { select: { id: true, nombre: true, saldoFavor: true } } },
 });
 if (!venta) return { error: "Factura no encontrada" };
 if (venta.tipo !== "FACTURADA") return { error: "Solo se puede generar nota de crédito sobre facturas" };

 const monto = input.detalles.reduce((s, d) => s + d.subtotal, 0);
 if (monto <= 0) return { error: "El monto total de la nota de crédito debe ser mayor a cero" };

 const numero = await siguienteNumeroNC();

 await prisma.$transaction(async (tx) => {
 // 1. Crear la nota de crédito
 await tx.notaCredito.create({
 data: {
 numero,
 ventaId: input.ventaId,
 clienteId: venta.clienteId,
 turnoId: input.turnoId,
 usuarioId: userId,
 motivo: input.motivo,
 detalles: input.detalles as unknown as Prisma.InputJsonValue,
 monto,
 montoRestante: monto,
 notas: input.notas ?? null,
 estado: "PENDIENTE",
 },
 });

 // 2. Acreditar el saldo a favor del cliente
 await tx.contacto.update({
 where: { id: venta.clienteId },
 data: { saldoFavor: { increment: monto } },
 });
 });

 // Obtener el id de la NC recién creada para enlace al imprimible
 const ncCreada = await prisma.notaCredito.findFirst({
  where: { numero },
  select: { id: true },
  orderBy: { createdAt: "desc" },
 });

 revalidatePath("/caja");
 revalidatePath(`/ventas/${input.ventaId}`);
 return { ok: true, numero, id: ncCreada?.id ?? null };
}

// Obtener facturas para nota de crédito (facturadas del turno actual o búsqueda) 

/** @deprecated — solo conservada para retrocompatibilidad, usar buscarFacturaPorNumeroExacto */
export async function buscarFacturasParaNC(q: string) {
 if (!q || q.trim().length < 2) return [];
 const term = q.trim();
 return prisma.venta.findMany({
 where: {
 tipo: "FACTURADA",
 OR: [
 { numero: { contains: term, mode: "insensitive" } },
 { cliente: { nombre: { contains: term, mode: "insensitive" } } },
 ],
 },
 include: {
 cliente: { select: { nombre: true, rnc: true, saldoFavor: true } },
 detalles: {
 select: {
 id: true, productoId: true, descripcion: true, unidad: true,
 cantidad: true, precioFinal: true, subtotal: true, itbis: true,
 producto: { select: { nombre: true, unidadMedida: true } },
 },
 orderBy: { orden: "asc" },
 },
 },
 orderBy: { createdAt: "desc" },
 take: 10,
 });
}

/** Busca una factura por número EXACTO para nota de crédito.
 *  La cajera debe ingresar el serial completo (ej. FAC/2026/0071).
 *  No permite búsqueda por nombre ni keywords — requiere el documento físico.
 */
export async function buscarFacturaPorNumeroExacto(numero: string) {
 if (!numero?.trim()) return null;
 return prisma.venta.findFirst({
 where: { tipo: "FACTURADA", numero: numero.trim() },
 include: {
 cliente: { select: { nombre: true, rnc: true, saldoFavor: true } },
 detalles: {
 select: {
 id: true, productoId: true, descripcion: true, unidad: true,
 cantidad: true, precioFinal: true, subtotal: true, itbis: true,
 producto: { select: { nombre: true, unidadMedida: true } },
 },
 orderBy: { orden: "asc" },
 },
 },
 });
}

// ── Admin: todas las NCs ──────────────────────────────────────────────────────

export async function getNotasCreditoAdmin(params?: {
 estado?: "PENDIENTE" | "APLICADA" | "ANULADA" | "todas";
 busqueda?: string;
 page?: number;
 pageSize?: number;
}) {
 const { estado = "todas", busqueda = "", page = 1, pageSize = 50 } = params ?? {};
 const skip = (page - 1) * pageSize;

 const where: Prisma.NotaCreditoWhereInput = {
 ...(estado !== "todas" ? { estado } : {}),
 ...(busqueda ? {
 OR: [
 { numero: { contains: busqueda, mode: "insensitive" } },
 { cliente: { nombre: { contains: busqueda, mode: "insensitive" } } },
 { venta: { numero: { contains: busqueda, mode: "insensitive" } } },
 ],
 } : {}),
 };

 const [rows, total] = await Promise.all([
 prisma.notaCredito.findMany({
 where,
 skip,
 take: pageSize,
 orderBy: { createdAt: "desc" },
 include: {
 cliente: { select: { nombre: true, rnc: true } },
 venta: { select: { numero: true } },
 usuario: { select: { nombre: true } },
 },
 }),
 prisma.notaCredito.count({ where }),
 ]);

 return {
 rows: rows.map(r => ({
 ...r,
 monto: Number(r.monto),
 montoRestante: Number(r.montoRestante),
 })),
 total,
 pages: Math.ceil(total / pageSize),
 };
}

export async function editarNotaCredito(id: string, data: {
 motivo?: string;
 notas?: string;
 estado?: "PENDIENTE" | "APLICADA" | "ANULADA";
}) {
 const userId = await getUserId();
 if (!userId) return { error: "No autenticado" };

 const nc = await prisma.notaCredito.findUnique({ where: { id } });
 if (!nc) return { error: "Nota de crédito no encontrada" };

 // Si se anula una NC pendiente, devolver el saldoFavor al cliente (restar)
 const anulando = data.estado === "ANULADA" && nc.estado === "PENDIENTE";

 await prisma.$transaction(async (tx) => {
 await tx.notaCredito.update({
 where: { id },
 data: {
 ...(data.motivo !== undefined ? { motivo: data.motivo } : {}),
 ...(data.notas !== undefined ? { notas: data.notas } : {}),
 ...(data.estado !== undefined ? { estado: data.estado } : {}),
 },
 });
 if (anulando) {
 // Revertir saldo a favor acreditado originalmente
 await tx.contacto.update({
 where: { id: nc.clienteId },
 data: { saldoFavor: { decrement: Number(nc.montoRestante) } },
 });
 }
 });

 revalidatePath("/contabilidad/notas-credito");
 return { ok: true };
}

// Historial de notas de crédito de un cliente

export async function getNotasCreditoCliente(clienteId: string) {
 return prisma.notaCredito.findMany({
 where: { clienteId },
 orderBy: { createdAt: "desc" },
 include: { venta: { select: { numero: true } } },
 });
}

// NCs pendientes de un cliente (para mostrar en CobroCxC y estado de cuenta)

export async function buscarNCsDelCliente(clienteId: string) {
 const ncs = await prisma.notaCredito.findMany({
 where: { clienteId, estado: "PENDIENTE" },
 orderBy: { createdAt: "asc" },
 include: { venta: { select: { numero: true } } },
 });
 return ncs.map(nc => ({
 id: nc.id,
 numero: nc.numero,
 monto: Number(nc.monto),
 montoRestante: Number(nc.montoRestante),
 ventaNumero: nc.venta.numero,
 motivo: nc.motivo,
 createdAt: nc.createdAt,
 }));
}

// Buscar NC por número para aplicar en cobro (cajero ingresa el código)

export async function buscarNCPorNumero(ncNumero: string, clienteId: string) {
 if (!ncNumero.trim()) return null;
 const nc = await prisma.notaCredito.findFirst({
 where: {
 numero: { equals: ncNumero.trim(), mode: "insensitive" },
 clienteId,
 estado: "PENDIENTE",
 },
 include: { venta: { select: { numero: true } } },
 });
 if (!nc) return null;
 const montoRestante = Number(nc.montoRestante);
 if (montoRestante <= 0) return null;
 return {
 id: nc.id,
 numero: nc.numero,
 monto: Number(nc.monto),
 montoRestante,
 ventaNumero: nc.venta.numero,
 motivo: nc.motivo,
 };
}

