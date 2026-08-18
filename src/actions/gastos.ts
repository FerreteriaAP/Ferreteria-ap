"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Queries 

export async function getCategoriasGasto() {
 return prisma.categoriaGasto.findMany({
 where: { activa: true },
 orderBy: { nombre: "asc" },
 });
}

export async function getGastos(opts: {
 categoriaId?: string;
 busqueda?: string;
 mes?: string;
 page?: number;
 pageSize?: number;
}) {
 const { categoriaId, busqueda = "", mes, page = 1, pageSize = 25 } = opts;
 const skip = (page - 1) * pageSize;

 const where: Prisma.GastoWhereInput = {
 ...(categoriaId ? { categoriaId } : {}),
 ...(busqueda ? {
 OR: [
 { numero: { contains: busqueda, mode: "insensitive" } },
 { descripcion: { contains: busqueda, mode: "insensitive" } },
 ],
 } : {}),
 ...(mes ? (() => {
 const [anio, m] = mes.split("-").map(Number);
 const start = new Date(anio, m - 1, 1);
 const end = new Date(anio, m, 1);
 return { fecha: { gte: start, lt: end } };
 })() : {}),
 };

 const [gastos, total] = await Promise.all([
 prisma.gasto.findMany({
 where,
 skip,
 take: pageSize,
 orderBy: { fecha: "desc" },
 include: { categoria: { select: { nombre: true, tipo: true } } },
 }),
 prisma.gasto.count({ where }),
 ]);

 return { gastos, total, pages: Math.ceil(total / pageSize) };
}

// Mutations 

export async function crearGasto(data: {
 categoriaId: string;
 descripcion: string;
 monto: number;
 fecha: string;
 metodo?: string;
 cuentaId?: string;
 notas?: string;
}) {
 const session = await auth();
 if (!session?.user?.id) return { error: "No autorizado" };

 // Número usando secuencia
 const seq = await prisma.secuenciaDocumento.findUnique({ where: { tipo: "GASTO" } });
 const num = seq ? String(seq.siguiente).padStart(seq.digitos, "0") : "00001";
 const numero = seq ? `${seq.prefijo}${num}` : `GAS-${num}`;
 if (seq) {
 await prisma.secuenciaDocumento.update({
 where: { tipo: "GASTO" },
 data: { siguiente: seq.siguiente + 1 },
 });
 }

 const gasto = await prisma.gasto.create({
 data: {
 numero,
 categoriaId: data.categoriaId,
 descripcion: data.descripcion,
 monto: data.monto,
 fecha: new Date(data.fecha),
 metodo: data.metodo || null,
 cuentaId: data.cuentaId || null,
 notas: data.notas || null,
 usuarioId: session.user.id,
 },
 });

 revalidatePath("/gastos");
 return { id: gasto.id };
}

export async function crearCategoriaGasto(data: {
 nombre: string;
 tipo: "FIJO" | "VARIABLE";
 descripcion?: string;
}) {
 await prisma.categoriaGasto.create({ data });
 revalidatePath("/gastos");
 return { ok: true };
}

export async function getCuentasBancarias() {
 return prisma.cuentaBancaria.findMany({
 where: { activa: true },
 orderBy: { banco: "asc" },
 });
}
