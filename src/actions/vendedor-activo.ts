"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "vid";
const MAX_AGE = 8 * 60 * 60; // 8 horas (un turno de trabajo)

// Leer / escribir cookie 

export async function getVendedorActivoId(): Promise<string | null> {
 const jar = await cookies();
 return jar.get(COOKIE)?.value ?? null;
}

export async function setVendedorActivo(id: string) {
 const jar = await cookies();
 jar.set(COOKIE, id, {
 maxAge: MAX_AGE,
 httpOnly: true,
 sameSite: "lax",
 path: "/",
 });
}

export async function clearVendedorActivo() {
 const jar = await cookies();
 jar.delete(COOKIE);
}

// Query vendedores + stats 

export async function getVendedoresConStats() {
 const hoy = new Date();
 const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0);
 const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0, 0);

 // Solo vendedores con apellido definido — excluye usuarios genéricos de login
 const vendedores = await prisma.usuario.findMany({
 where: { activo: true, rol: "VENDEDOR", apellido: { not: "" } },
 select: { id: true, nombre: true, apellido: true, rol: true },
 orderBy: { nombre: "asc" },
 });

 // Stats por cada vendedor
 const stats = await Promise.all(
 vendedores.map(async (v) => {
 const [ventasHoy, ventasMes, ordenesHoy, ordenesMes, comprasHoy, comprasMes] = await Promise.all([
 // Ventas de hoy (como vendedor o creador)
 prisma.venta.count({
 where: {
 fechaEmision: { gte: inicioDia },
 tipo: { in: ["COTIZACION", "ORDEN_VENTA", "CONDUCE", "FACTURADA"] },
 OR: [{ vendedorId: v.id }, { creadorId: v.id }],
 },
 }),
 // Ventas del mes
 prisma.venta.count({
 where: {
 fechaEmision: { gte: inicioMes },
 tipo: { in: ["COTIZACION", "ORDEN_VENTA", "CONDUCE", "FACTURADA"] },
 OR: [{ vendedorId: v.id }, { creadorId: v.id }],
 },
 }),
 // Órdenes de compra de hoy
 prisma.ordenCompra.count({
 where: { usuarioId: v.id, fechaEmision: { gte: inicioDia } },
 }).catch(() => 0),
 // Órdenes del mes
 prisma.ordenCompra.count({
 where: { usuarioId: v.id, fechaEmision: { gte: inicioMes } },
 }).catch(() => 0),
 // Compras de hoy
 prisma.compra.count({
 where: { usuarioId: v.id, fechaFactura: { gte: inicioDia } },
 }),
 // Compras del mes
 prisma.compra.count({
 where: { usuarioId: v.id, fechaFactura: { gte: inicioMes } },
 }),
 ]);

 return {
 ...v,
 stats: {
 ventasHoy, ventasMes,
 ordenesHoy, ordenesMes: Number(ordenesMes),
 comprasHoy, comprasMes,
 },
 };
 })
 );

 return stats;
}

export async function getVendedorActivo() {
 const id = await getVendedorActivoId();
 if (!id) return null;
 return prisma.usuario.findUnique({
 where: { id },
 select: { id: true, nombre: true, apellido: true, rol: true },
 });
}
