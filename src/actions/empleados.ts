"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

import { cap, formatCedula } from "@/lib/format";

// Queries 

export async function getEmpleados(opts: {
 busqueda?: string;
 estado?: string;
 page?: number;
 pageSize?: number;
}) {
 const { busqueda = "", estado, page = 1, pageSize = 25 } = opts;
 const skip = (page - 1) * pageSize;

 const where: Prisma.EmpleadoWhereInput = {
 ...(estado ? { estado: estado as "ACTIVO" | "INACTIVO" | "SUSPENDIDO" } : {}),
 ...(busqueda ? {
 OR: [
 { nombre: { contains: busqueda, mode: "insensitive" } },
 { apellido: { contains: busqueda, mode: "insensitive" } },
 { cedula: { contains: busqueda, mode: "insensitive" } },
 { cargo: { contains: busqueda, mode: "insensitive" } },
 ],
 } : {}),
 };

 const [rows, total] = await Promise.all([
 prisma.empleado.findMany({ where, skip, take: pageSize, orderBy: { nombre: "asc" } }),
 prisma.empleado.count({ where }),
 ]);

 const empleados = rows.map((e) => ({
 ...e,
 salarioBase: Number(e.salarioBase),
 fechaNacimiento: e.fechaNacimiento?.toISOString() ?? null,
 fechaIngreso: e.fechaIngreso?.toISOString() ?? null,
 createdAt: e.createdAt.toISOString(),
 updatedAt: e.updatedAt.toISOString(),
 }));

 return { empleados, total, pages: Math.ceil(total / pageSize) };
}

export async function getEmpleado(id: string) {
 const e = await prisma.empleado.findUnique({
 where: { id },
 include: { usuario: { select: { email: true, rol: true, activo: true } } },
 });
 if (!e) return null;
 return {
 ...e,
 salarioBase: Number(e.salarioBase),
 fechaNacimiento: e.fechaNacimiento?.toISOString() ?? null,
 fechaIngreso: e.fechaIngreso?.toISOString() ?? null,
 createdAt: e.createdAt.toISOString(),
 updatedAt: e.updatedAt.toISOString(),
 };
}

// Mutations 

export async function crearEmpleado(data: {
 cedula: string;
 nombre: string;
 apellido: string;
 telefono?: string;
 email?: string;
 fechaNacimiento?: string;
 fechaIngreso: string;
 cargo: string;
 departamento?: string;
 salarioBase: number;
 valorHoraExtra?: number;
 descuentoSan?: number;
 nss?: string;
 afp?: string;
 sfs?: string;
 cuentaBancaria?: string;
 bancoCuenta?: string;
 tipoCuenta?: string;
}) {
 const empleado = await prisma.empleado.create({
 data: {
 cedula: formatCedula(data.cedula),
 nombre: cap(data.nombre),
 apellido: cap(data.apellido),
 telefono: data.telefono || null,
 email: data.email || null,
 fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : null,
 fechaIngreso: new Date(data.fechaIngreso),
 cargo: data.cargo,
 departamento: data.departamento || null,
 salarioBase: data.salarioBase,
 valorHoraExtra: data.valorHoraExtra ?? 0,
 descuentoSan: data.descuentoSan ?? 0,
 nss: data.nss || null,
 afp: data.afp || null,
 sfs: data.sfs || null,
 cuentaBancaria: data.cuentaBancaria || null,
 bancoCuenta: data.bancoCuenta || null,
 tipoCuenta: data.tipoCuenta || null,
 },
 });

 revalidatePath("/empleados");
 return { id: empleado.id };
}

export async function actualizarEmpleado(id: string, data: Partial<{
 cedula: string;
 nombre: string;
 apellido: string;
 telefono: string;
 email: string;
 fechaNacimiento: string;
 fechaIngreso: string;
 cargo: string;
 departamento: string;
 salarioBase: number;
 valorHoraExtra: number;
 descuentoSan: number;
 estado: "ACTIVO" | "INACTIVO" | "SUSPENDIDO";
 nss: string;
 afp: string;
 sfs: string;
 cuentaBancaria: string;
 bancoCuenta: string;
 tipoCuenta: string;
}>) {
 const { fechaNacimiento, fechaIngreso, nombre, apellido, cedula, ...rest } = data;
 await prisma.empleado.update({
 where: { id },
 data: {
 ...rest,
 ...(nombre   ? { nombre: cap(nombre) } : {}),
 ...(apellido ? { apellido: cap(apellido) } : {}),
 ...(cedula   ? { cedula: formatCedula(cedula) } : {}),
 ...(fechaNacimiento ? { fechaNacimiento: new Date(fechaNacimiento) } : {}),
 ...(fechaIngreso ? { fechaIngreso: new Date(fechaIngreso) } : {}),
 },
 });

 revalidatePath(`/empleados/${id}`);
 revalidatePath("/empleados");
 return { ok: true };
}

// Estadísticas de actividad — para comisiones por desempeño

export async function getEstadisticasEmpleado(empleadoId: string, mes?: string) {
 // Resolver el usuarioId a partir del empleadoId
 const usuario = await prisma.usuario.findFirst({ where: { empleadoId }, select: { id: true } });
 if (!usuario) return { pdvTotal: 0, cotizaciones: 0, ordenes: 0, conduces: 0, facturas: 0, ordenesCompra: 0 };
 const usuarioId = usuario.id;

 // Rango de fechas si se filtra por mes (YYYY-MM)
 let desde: Date | undefined;
 let hasta: Date | undefined;
 if (mes) {
  const [y, m] = mes.split("-").map(Number);
  desde = new Date(y, m - 1, 1, 0, 0, 0, 0);
  hasta = new Date(y, m, 0, 23, 59, 59, 999);
 }

 const fechaWhere = desde && hasta
  ? { createdAt: { gte: desde, lte: hasta } }
  : {};

 const [
  pdvTotal,
  cotizaciones,
  ordenes,
  conduces,
  facturas,
  ordenesCompra,
 ] = await Promise.all([
  // Ventas PDV: turnoId != null, creador = este usuario
  prisma.venta.count({ where: { creadorId: usuarioId, turnoId: { not: null }, ...fechaWhere } }),
  // Módulo ventas por tipo, vendedor = este usuario
  prisma.venta.count({ where: { vendedorId: usuarioId, turnoId: null, tipo: "COTIZACION", ...fechaWhere } }),
  prisma.venta.count({ where: { vendedorId: usuarioId, turnoId: null, tipo: "ORDEN_VENTA", ...fechaWhere } }),
  prisma.venta.count({ where: { vendedorId: usuarioId, turnoId: null, tipo: "CONDUCE", ...fechaWhere } }),
  prisma.venta.count({ where: { vendedorId: usuarioId, turnoId: null, tipo: "FACTURADA", ...fechaWhere } }),
  // Órdenes de compra
  prisma.ordenCompra.count({ where: { usuarioId, ...fechaWhere } }),
 ]);

 return { pdvTotal, cotizaciones, ordenes, conduces, facturas, ordenesCompra };
}
