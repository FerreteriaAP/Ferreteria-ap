"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// TSS rates RD (2024)
const AFP_EMP = 0.0287; // Empleado AFP
const SFS_EMP = 0.0304; // Empleado SFS
const AFP_ER = 0.0710; // Empleador AFP
const SFS_ER = 0.0709; // Empleador SFS

// Queries 

export async function getNominas(page = 1, pageSize = 20) {
 const skip = (page - 1) * pageSize;
 const [rows, total] = await Promise.all([
 prisma.nomina.findMany({
 skip,
 take: pageSize,
 orderBy: { createdAt: "desc" },
 select: {
 id: true,
 numero: true,
 periodo: true,
 mes: true,
 anio: true,
 estado: true,
 totalBruto: true,
 totalDescuentos:true,
 totalNeto: true,
 fechaPago: true,
 createdAt: true,
 _count: { select: { empleados: true } },
 },
 }),
 prisma.nomina.count(),
 ]);
 const nominas = rows.map((n) => ({
 ...n,
 totalBruto: Number(n.totalBruto),
 totalDescuentos: Number(n.totalDescuentos),
 totalNeto: Number(n.totalNeto),
 fechaPago: n.fechaPago?.toISOString() ?? null,
 createdAt: n.createdAt.toISOString(),
 }));
 return { nominas, total, pages: Math.ceil(total / pageSize) };
}

export async function getNomina(id: string) {
 const nomina = await prisma.nomina.findUnique({
 where: { id },
 include: {
 empleados: {
 include: {
 empleado: {
 select: {
 nombre: true, apellido: true, cargo: true, cedula: true,
 valorHoraExtra: true, descuentoSan: true,
 },
 },
 },
 orderBy: { empleado: { nombre: "asc" } },
 },
 },
 });
 if (!nomina) return null;
 return {
 ...nomina,
 totalBruto: Number(nomina.totalBruto),
 totalDescuentos: Number(nomina.totalDescuentos),
 totalNeto: Number(nomina.totalNeto),
 fechaPago: nomina.fechaPago?.toISOString() ?? null,
 createdAt: nomina.createdAt.toISOString(),
 updatedAt: nomina.updatedAt.toISOString(),
 empleados: nomina.empleados.map((l) => ({
 ...l,
 salarioBase: Number(l.salarioBase),
 horasExtra: Number(l.horasExtra),
 montoHorasExtra: Number(l.montoHorasExtra),
 bono: Number(l.bono),
 sam: Number(l.sam),
 otrosIngresos: Number(l.otrosIngresos),
 totalBruto: Number(l.totalBruto),
 afpEmpleado: Number(l.afpEmpleado),
 sfsEmpleado: Number(l.sfsEmpleado),
 afpEmpleador: Number(l.afpEmpleador),
 sfsEmpleador: Number(l.sfsEmpleador),
 prestamos: Number(l.prestamos),
 san: Number(l.san),
 isr: Number(l.isr),
 otrosDescuentos: Number(l.otrosDescuentos),
 totalDescuentos: Number(l.totalDescuentos),
 totalNeto: Number(l.totalNeto),
 empleado: {
 ...l.empleado,
 valorHoraExtra: Number(l.empleado.valorHoraExtra),
 descuentoSan: Number(l.empleado.descuentoSan),
 },
 })),
 };
}

// Crear nómina 

export async function crearNomina(data: {
 periodo: "PRIMERA_QUINCENA" | "SEGUNDA_QUINCENA";
 mes: number;
 anio: number;
 fechaPago?: string;
}) {
 const numeroMes = String(data.mes).padStart(2, "0");
 const quincena = data.periodo === "PRIMERA_QUINCENA" ? "1Q" : "2Q";
 const numero = `NOM-${data.anio}-${numeroMes}-${quincena}`;

 // Rango de fechas de la quincena para buscar préstamos en caja
 const fechaDesde = data.periodo === "PRIMERA_QUINCENA" ? new Date(data.anio, data.mes - 1, 1, 0, 0, 0, 0)
 : new Date(data.anio, data.mes - 1, 16, 0, 0, 0, 0);
 const fechaHasta = data.periodo === "PRIMERA_QUINCENA" ? new Date(data.anio, data.mes - 1, 15, 23, 59, 59, 999)
 : new Date(data.anio, data.mes, 0, 23, 59, 59, 999); // último día del mes

 const empleados = await prisma.empleado.findMany({
 where: { estado: "ACTIVO" },
 orderBy: { nombre: "asc" },
 });

 // Obtener préstamos de caja de todos los empleados en el período de una sola vez
 const movimientosPrestamos = await prisma.movimientoCaja.findMany({
 where: {
 subTipo: "PRESTAMO",
 empleadoId: { not: null },
 fecha: { gte: fechaDesde, lte: fechaHasta },
 },
 select: { empleadoId: true, monto: true },
 });

 // Agrupar por empleado
 const prestamosPorEmpleado = new Map<string, number>();
 for (const m of movimientosPrestamos) {
 if (!m.empleadoId) continue;
 prestamosPorEmpleado.set(
 m.empleadoId,
 (prestamosPorEmpleado.get(m.empleadoId) ?? 0) + Number(m.monto)
 );
 }

 const lineas = empleados.map((e) => {
 const salarioQuincenal = Number(e.salarioBase) / 2;
 const san = Number(e.descuentoSan); // SAN fijo del empleado

 // Ingresos: salario + horas extra (0 por defecto al crear, se edita después) + bono
 const montoHorasExtra = 0;
 const bono = 0;
 const totalBruto = salarioQuincenal + montoHorasExtra + bono;

 // Descuentos TSS sobre salario quincenal
 const afpEmp = +(salarioQuincenal * AFP_EMP).toFixed(2);
 const sfsEmp = +(salarioQuincenal * SFS_EMP).toFixed(2);
 const afpEr = +(salarioQuincenal * AFP_ER).toFixed(2);
 const sfsEr = +(salarioQuincenal * SFS_ER).toFixed(2);

 // Préstamos tomados en caja durante esta quincena
 const prestamos = prestamosPorEmpleado.get(e.id) ?? 0;

 const totalDesc = afpEmp + sfsEmp + prestamos + san;
 const totalNeto = totalBruto - totalDesc;

 return {
 empleadoId: e.id,
 salarioBase: salarioQuincenal,
 horasExtra: 0,
 montoHorasExtra: 0,
 bono: 0,
 sam: 0, // SAM no se usa
 totalBruto,
 afpEmpleado: afpEmp,
 sfsEmpleado: sfsEmp,
 afpEmpleador: afpEr,
 sfsEmpleador: sfsEr,
 prestamos,
 san,
 otrosDescuentos: 0,
 totalDescuentos: totalDesc,
 totalNeto,
 };
 });

 const totalBruto = lineas.reduce((s, l) => s + l.totalBruto, 0);
 const totalDescuentos = lineas.reduce((s, l) => s + l.totalDescuentos, 0);
 const totalNeto = lineas.reduce((s, l) => s + l.totalNeto, 0);

 const nomina = await prisma.nomina.create({
 data: {
 numero,
 periodo: data.periodo,
 mes: data.mes,
 anio: data.anio,
 fechaPago: data.fechaPago ? new Date(data.fechaPago) : null,
 totalBruto,
 totalDescuentos,
 totalNeto,
 estado: "BORRADOR",
 empleados: { create: lineas },
 },
 });

 revalidatePath("/nominas");
 return { id: nomina.id };
}

// Actualizar línea de nómina (desde planilla inline) 

export async function actualizarLineaNomina(id: string, data: {
 horasExtra?: number;
 montoHorasExtra?: number;
 bono?: number;
 afpEmpleado?: number; // permite poner en 0
 sfsEmpleado?: number; // permite poner en 0
 prestamos?: number;
 san?: number;
 otrosDescuentos?: number;
 notas?: string;
}) {
 const linea = await prisma.nominaEmpleado.findUnique({ where: { id } });
 if (!linea) return { error: "Línea no encontrada" };

 const salarioBase = Number(linea.salarioBase);
 const horasExtra = data.horasExtra ?? Number(linea.horasExtra);
 const montoHorasExtra = data.montoHorasExtra ?? Number(linea.montoHorasExtra);
 const bono = data.bono ?? Number(linea.bono);
 const afpEmp = data.afpEmpleado ?? Number(linea.afpEmpleado);
 const sfsEmp = data.sfsEmpleado ?? Number(linea.sfsEmpleado);
 const afpEr = +(salarioBase * AFP_ER).toFixed(2);
 const sfsEr = +(salarioBase * SFS_ER).toFixed(2);
 const prestamos = data.prestamos ?? Number(linea.prestamos);
 const san = data.san ?? Number(linea.san);
 const otrosDescuentos = data.otrosDescuentos ?? Number(linea.otrosDescuentos);

 const totalBruto = salarioBase + montoHorasExtra + bono;
 const totalDescuentos = afpEmp + sfsEmp + prestamos + san + otrosDescuentos;
 const totalNeto = totalBruto - totalDescuentos;

 await prisma.nominaEmpleado.update({
 where: { id },
 data: {
 horasExtra,
 montoHorasExtra,
 bono,
 afpEmpleado: afpEmp,
 sfsEmpleado: sfsEmp,
 afpEmpleador: afpEr,
 sfsEmpleador: sfsEr,
 prestamos,
 san,
 otrosDescuentos,
 totalBruto,
 totalDescuentos,
 totalNeto,
 notas: data.notas ?? linea.notas,
 },
 });

 // Recalcular totales de la nómina
 const lineas = await prisma.nominaEmpleado.findMany({
 where: { nominaId: linea.nominaId },
 });
 await prisma.nomina.update({
 where: { id: linea.nominaId },
 data: {
 totalBruto: lineas.reduce((s, l) => s + Number(l.totalBruto), 0),
 totalDescuentos: lineas.reduce((s, l) => s + Number(l.totalDescuentos), 0),
 totalNeto: lineas.reduce((s, l) => s + Number(l.totalNeto), 0),
 },
 });

 revalidatePath(`/nominas/${linea.nominaId}`);
 return { ok: true };
}

// Estado de nómina 

export async function procesarNomina(id: string) {
 await prisma.nomina.update({ where: { id }, data: { estado: "PROCESADA" } });
 revalidatePath(`/nominas/${id}`);
 return { ok: true };
}

export async function marcarNominaPagada(id: string, fechaPago: string) {
 await prisma.nomina.update({
 where: { id },
 data: { estado: "PAGADA", fechaPago: new Date(fechaPago) },
 });
 revalidatePath(`/nominas/${id}`);
 return { ok: true };
}

// Recalcular préstamos de caja sobre una nómina existente 
// Útil cuando se creó la nómina antes de registrar los préstamos, o
// se quiere sincronizar con los datos más recientes de caja.

export async function recalcularPrestamosNomina(nominaId: string) {
 const nomina = await prisma.nomina.findUnique({
 where: { id: nominaId },
 include: { empleados: true },
 });
 if (!nomina) return { error: "Nómina no encontrada" };
 if (nomina.estado === "PAGADA") return { error: "No se puede modificar una nómina pagada" };

 // Rango de fechas de la quincena
 const fechaDesde = nomina.periodo === "PRIMERA_QUINCENA" ? new Date(nomina.anio, nomina.mes - 1, 1, 0, 0, 0, 0)
 : new Date(nomina.anio, nomina.mes - 1, 16, 0, 0, 0, 0);
 const fechaHasta = nomina.periodo === "PRIMERA_QUINCENA" ? new Date(nomina.anio, nomina.mes - 1, 15, 23, 59, 59, 999)
 : new Date(nomina.anio, nomina.mes, 0, 23, 59, 59, 999);

 // Obtener todos los préstamos del período
 const movimientos = await prisma.movimientoCaja.findMany({
 where: {
 subTipo: "PRESTAMO",
 empleadoId: { not: null },
 fecha: { gte: fechaDesde, lte: fechaHasta },
 },
 select: { empleadoId: true, monto: true },
 });

 const prestamosPorEmpleado = new Map<string, number>();
 for (const m of movimientos) {
 if (!m.empleadoId) continue;
 prestamosPorEmpleado.set(
 m.empleadoId,
 (prestamosPorEmpleado.get(m.empleadoId) ?? 0) + Number(m.monto)
 );
 }

 // Actualizar cada línea
 const updates = nomina.empleados.map(async (linea) => {
 const prestamos = prestamosPorEmpleado.get(linea.empleadoId) ?? 0;
 const afpEmp = Number(linea.afpEmpleado);
 const sfsEmp = Number(linea.sfsEmpleado);
 const san = Number(linea.san);
 const otrosDescuentos = Number(linea.otrosDescuentos);
 const totalBruto = Number(linea.totalBruto);
 const totalDescuentos = afpEmp + sfsEmp + prestamos + san + otrosDescuentos;
 const totalNeto = totalBruto - totalDescuentos;

 return prisma.nominaEmpleado.update({
 where: { id: linea.id },
 data: { prestamos, totalDescuentos, totalNeto },
 });
 });

 const lineasActualizadas = await Promise.all(updates);

 // Recalcular totales de la nómina
 await prisma.nomina.update({
 where: { id: nominaId },
 data: {
 totalDescuentos: lineasActualizadas.reduce((s, l) => s + Number(l.totalDescuentos), 0),
 totalNeto: lineasActualizadas.reduce((s, l) => s + Number(l.totalNeto), 0),
 },
 });

 revalidatePath(`/nominas/${nominaId}`);
 revalidatePath("/nominas");
 return { ok: true, empleadosActualizados: lineasActualizadas.length };
}

// Eliminar nómina (solo BORRADOR) 

export async function eliminarNomina(id: string) {
 const nomina = await prisma.nomina.findUnique({
 where: { id },
 select: { estado: true, numero: true },
 });
 if (!nomina) return { error: "Nómina no encontrada" };
 if (nomina.estado !== "BORRADOR") {
 return { error: `No se puede eliminar una nómina en estado ${nomina.estado}` };
 }
 // NominaEmpleado tiene onDelete: Cascade — se elimina solo
 await prisma.nomina.delete({ where: { id } });
 revalidatePath("/nominas");
 redirect("/nominas");
}
