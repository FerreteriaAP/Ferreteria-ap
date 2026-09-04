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

export async function getEstadisticasEmpleado(empleadoId: string, filtro?: string) {
  // Resolver el usuarioId a partir del empleadoId
  const usuario = await prisma.usuario.findFirst({ where: { empleadoId }, select: { id: true } });
  if (!usuario) return { pdvTotal: 0, cotizaciones: 0, ordenes: 0, conduces: 0, facturas: 0, ordenesCompra: 0 };
  const uid = usuario.id;

  // filtro puede ser "YYYY-MM" (mes) o "YYYY" (año completo)
  let desde: Date | undefined;
  let hasta: Date | undefined;

  if (filtro) {
    if (/^\d{4}-\d{2}$/.test(filtro)) {
      // mes
      const [y, m] = filtro.split("-").map(Number);
      desde = new Date(y, m - 1, 1, 0, 0, 0, 0);
      hasta = new Date(y, m, 0, 23, 59, 59, 999);
    } else if (/^\d{4}$/.test(filtro)) {
      // año completo
      const y = Number(filtro);
      desde = new Date(y, 0, 1, 0, 0, 0, 0);
      hasta = new Date(y, 11, 31, 23, 59, 59, 999);
    }
  }

  // Usamos fechaEmision para ventas (igual que el selector de vendedores)
  const ventaFecha = desde && hasta ? { fechaEmision: { gte: desde, lte: hasta } } : {};
  const ocFecha   = desde && hasta ? { fechaEmision: { gte: desde, lte: hasta } } : {};

  // Para cada tipo de venta: el usuario puede ser vendedorId O creadorId
  // (ventas@ es el login compartido, pero vendedorId guarda quién realmente la hizo)
  const ventaBase = (extra: object) => ({
    OR: [{ vendedorId: uid }, { creadorId: uid }] as object[],
    ...ventaFecha,
    ...extra,
  });

  const [pdvTotal, cotizaciones, ordenes, conduces, facturas, ordenesCompra] = await Promise.all([
    // PDV: ventas ligadas a un turno de caja
    prisma.venta.count({ where: ventaBase({ turnoId: { not: null } }) }),
    // Módulo ventas por tipo (sin turno de caja)
    prisma.venta.count({ where: ventaBase({ turnoId: null, tipo: "COTIZACION" }) }),
    prisma.venta.count({ where: ventaBase({ turnoId: null, tipo: "ORDEN_VENTA" }) }),
    prisma.venta.count({ where: ventaBase({ turnoId: null, tipo: "CONDUCE" }) }),
    prisma.venta.count({ where: ventaBase({ turnoId: null, tipo: "FACTURADA" }) }),
    // Órdenes de compra
    prisma.ordenCompra.count({ where: { usuarioId: uid, ...ocFecha } }),
  ]);

  return { pdvTotal, cotizaciones, ordenes, conduces, facturas, ordenesCompra };
}
