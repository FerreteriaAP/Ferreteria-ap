"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getUserId() {
 const s = await auth();
 return s?.user?.id ?? null;
}

async function siguienteNumeroNC(): Promise<string> {
 const seq = await prisma.secuenciaDocumento.upsert({
 where: { tipo: "NOTA_CREDITO" },
 update: { siguiente: { increment: 1 } },
 create: { tipo: "NOTA_CREDITO", prefijo: "NC", siguiente: 2, digitos: 5 },
 });
 const num = String(seq.siguiente - 1).padStart(seq.digitos, "0");
 return `${seq.prefijo}-${num}`;
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

 revalidatePath("/caja");
 revalidatePath(`/ventas/${input.ventaId}`);
 return { ok: true, numero };
}

// Obtener facturas para nota de crédito (facturadas del turno actual o búsqueda) 

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

// Historial de notas de crédito de un cliente

export async function getNotasCreditoCliente(clienteId: string) {
 return prisma.notaCredito.findMany({
 where: { clienteId },
 orderBy: { createdAt: "desc" },
 include: { venta: { select: { numero: true } } },
 });
}

// Listado global de notas de crédito (para la página de caja)

export async function getNotasCredito(opts?: { q?: string; estado?: string; page?: number; pageSize?: number }) {
 const { q, estado, page = 1, pageSize = 50 } = opts ?? {};
 const skip = (page - 1) * pageSize;

 const where: Record<string, unknown> = {};
 if (estado && estado !== "TODOS") where.estado = estado;
 if (q?.trim()) {
  const term = q.trim();
  where.OR = [
   { numero: { contains: term, mode: "insensitive" } },
   { cliente: { nombre: { contains: term, mode: "insensitive" } } },
   { venta: { numero: { contains: term, mode: "insensitive" } } },
   { motivo: { contains: term, mode: "insensitive" } },
  ];
 }

 const [items, total] = await Promise.all([
  prisma.notaCredito.findMany({
   where,
   orderBy: { createdAt: "desc" },
   skip,
   take: pageSize,
   include: {
    cliente: { select: { id: true, nombre: true, rnc: true } },
    venta: { select: { id: true, numero: true } },
    usuario: { select: { nombre: true, apellido: true } },
   },
  }),
  prisma.notaCredito.count({ where }),
 ]);

 return { items, total, page, pageSize };
}
