"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Claves que maneja este módulo
const CLAVES_EMPRESA = [
 "EMPRESA_NOMBRE",
 "EMPRESA_NOMBRE_LEGAL",
 "EMPRESA_RNC",
 "EMPRESA_TELEFONO",
 "EMPRESA_TELEFONO_ALT",
 "EMPRESA_EMAIL",
 "EMPRESA_DIRECCION",
 "EMPRESA_CIUDAD",
 "EMPRESA_PAIS",
 "EMPRESA_WEB",
 "EMPRESA_LEMA",
] as const;

export type ClavesEmpresa = typeof CLAVES_EMPRESA[number];

export type DatosEmpresa = Partial<Record<ClavesEmpresa, string>>;

export async function getEmpresaConfig(): Promise<DatosEmpresa> {
 const rows = await prisma.configuracion.findMany({
 where: { clave: { in: [...CLAVES_EMPRESA] } },
 });
 return Object.fromEntries(rows.map(r => [r.clave, r.valor])) as DatosEmpresa;
}

export async function saveEmpresaConfig(data: DatosEmpresa): Promise<{ ok: boolean; error?: string }> {
 const session = await auth();
 const rol = (session?.user as { rol?: string })?.rol;
 if (rol !== "ADMINISTRADOR") return { ok: false, error: "Solo el administrador puede editar los datos de empresa" };

 await prisma.$transaction(
 Object.entries(data)
 .filter(([k]) => CLAVES_EMPRESA.includes(k as ClavesEmpresa))
 .map(([clave, valor]) => prisma.configuracion.upsert({
 where: { clave },
 update: { valor: valor ?? "" },
 create: { clave, valor: valor ?? "", descripcion: `Dato de empresa: ${clave}` },
 })
 )
 );

 revalidatePath("/configuracion");
 return { ok: true };
}

// Cuentas bancarias 

export async function getCuentasBancarias() {
 return prisma.cuentaBancaria.findMany({
 orderBy: [{ activa: "desc" }, { banco: "asc" }],
 });
}

export async function saveCuentaBancaria(data: {
 id?: string;
 banco: string;
 nombre: string;
 numero: string;
 tipo: "CORRIENTE" | "AHORROS";
 activa?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
 const session = await auth();
 const rol = (session?.user as { rol?: string })?.rol;
 if (rol !== "ADMINISTRADOR") return { ok: false, error: "Solo el administrador puede editar cuentas bancarias" };

 if (data.id) {
 await prisma.cuentaBancaria.update({
 where: { id: data.id },
 data: { banco: data.banco, nombre: data.nombre, numero: data.numero, tipo: data.tipo, activa: data.activa ?? true },
 });
 } else {
 await prisma.cuentaBancaria.create({
 data: { banco: data.banco, nombre: data.nombre, numero: data.numero, tipo: data.tipo, saldo: 0 },
 });
 }
 revalidatePath("/configuracion");
 return { ok: true };
}

export async function toggleCuentaBancaria(id: string, activa: boolean) {
 const session = await auth();
 const rol = (session?.user as { rol?: string })?.rol;
 if (rol !== "ADMINISTRADOR") return { ok: false, error: "Sin permisos" };
 await prisma.cuentaBancaria.update({ where: { id }, data: { activa } });
 revalidatePath("/configuracion");
 return { ok: true };
}
