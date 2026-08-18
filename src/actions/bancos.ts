"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

// Queries 

export async function getCuentas() {
 const rows = await prisma.cuentaBancaria.findMany({
 where: { activa: true },
 orderBy: { banco: "asc" },
 select: { id: true, banco: true, nombre: true, numero: true, tipo: true, saldo: true },
 });
 // Convertir Decimal  number para que sea serializable como Server Action
 return rows.map((c) => ({
 id: c.id,
 banco: c.banco,
 nombre: c.nombre,
 numero: c.numero,
 tipo: c.tipo as string,
 saldo: Number(c.saldo),
 }));
}

export async function getTransacciones(opts: {
 cuentaId?: string;
 mes?: string;
 busqueda?: string;
 page?: number;
 pageSize?: number;
}) {
 const { cuentaId, mes, busqueda = "", page = 1, pageSize = 30 } = opts;
 const skip = (page - 1) * pageSize;

 const where: Prisma.TransaccionBancariaWhereInput = {
 ...(cuentaId ? { cuentaId } : {}),
 ...(busqueda ? {
 OR: [
 { descripcion: { contains: busqueda, mode: "insensitive" } },
 { referencia: { contains: busqueda, mode: "insensitive" } },
 ],
 } : {}),
 ...(mes ? (() => {
 const [anio, m] = mes.split("-").map(Number);
 return { fecha: { gte: new Date(anio, m - 1, 1), lt: new Date(anio, m, 1) } };
 })() : {}),
 };

 const [transacciones, total] = await Promise.all([
 prisma.transaccionBancaria.findMany({
 where,
 skip,
 take: pageSize,
 orderBy: { fecha: "desc" },
 include: { cuenta: { select: { banco: true, nombre: true } } },
 }),
 prisma.transaccionBancaria.count({ where }),
 ]);

 return { transacciones, total, pages: Math.ceil(total / pageSize) };
}

// Mutations 

export async function registrarTransaccion(data: {
 cuentaId: string;
 tipo: "DEPOSITO" | "RETIRO" | "TRANSFERENCIA" | "CHEQUE" | "CHEQUE_RECIBIDO" | "DEBITO_AUTOMATICO";
 monto: number;
 descripcion: string;
 referencia?: string;
 fecha: string;
 notas?: string;
}) {
 const cuenta = await prisma.cuentaBancaria.findUnique({ where: { id: data.cuentaId } });
 if (!cuenta) return { error: "Cuenta no encontrada" };

 const saldoAntes = Number(cuenta.saldo);
 const esDebito = ["RETIRO", "CHEQUE", "DEBITO_AUTOMATICO"].includes(data.tipo);
 // CHEQUE_RECIBIDO y DEPOSITO y TRANSFERENCIA son crédito (suman al saldo)
 const saldoDespues = esDebito ? saldoAntes - data.monto : saldoAntes + data.monto;

 await prisma.$transaction(async (tx) => {
 await tx.transaccionBancaria.create({
 data: {
 cuentaId: data.cuentaId,
 tipo: data.tipo,
 monto: data.monto,
 saldoAntes,
 saldoDespues,
 descripcion: data.descripcion,
 referencia: data.referencia || null,
 fecha: new Date(data.fecha),
 notas: data.notas || null,
 },
 });

 await tx.cuentaBancaria.update({
 where: { id: data.cuentaId },
 data: { saldo: saldoDespues },
 });
 });

 revalidatePath("/bancos");
 return { ok: true };
}
