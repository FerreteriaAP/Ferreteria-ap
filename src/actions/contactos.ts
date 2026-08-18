"use server";

import { prisma } from "@/lib/prisma";
import { type Prisma } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Schemas de validación 

const DireccionSchema = z.object({
 id: z.string().optional(),
 etiqueta: z.string().min(1, "Etiqueta requerida"),
 direccion: z.string().min(1, "Dirección requerida"),
 sector: z.string().optional(),
 ciudad: z.string().default("Santo Domingo"),
 provincia: z.string().optional(),
 referencia: z.string().optional(),
 esPrincipal: z.boolean().default(false),
});

const ContactoSchema = z.object({
 tipo: z.enum(["CLIENTE", "SUPLIDOR", "AMBOS"]),
 nombre: z.string().min(1, "Nombre requerido"),
 nombreLegal: z.string().optional(),
 rnc: z.string().optional(),
 tipoComprobante: z.enum(["B01", "B02", "B14", "B15"]).default("B02"),
 email: z.string().email("Email inválido").optional().or(z.literal("")),
 telefono: z.string().optional(),
 telefonoAlt: z.string().optional(),
 credito: z.enum(["CONTADO", "DIAS_30", "DIAS_45", "DIAS_60"]).default("CONTADO"),
 limiteCredito: z.coerce.number().optional(),
 descuentoFijo: z.coerce.number().min(0).max(100).optional(),
 esEmisorElectronico: z.boolean().default(false),
 notas: z.string().optional(),
 activo: z.boolean().default(true),
 direcciones: z.array(DireccionSchema).default([]),
});

export type ContactoInput = z.infer<typeof ContactoSchema>;

// Helper: primera letra de cada palabra en mayúscula 

function cap(s?: string | null): string {
 if (!s) return "";
 return s.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// Listar 

export async function getContactos(params?: {
 tipo?: "CLIENTE" | "SUPLIDOR" | "AMBOS" | "todos";
 busqueda?: string;
 soloActivos?: boolean;
 page?: number;
 pageSize?: number;
}) {
 const { tipo = "todos", busqueda = "", soloActivos = true, page = 1, pageSize = 50 } = params ?? {};

 const where: Prisma.ContactoWhereInput = {};

 if (tipo !== "todos") {
 where.tipo = tipo === "AMBOS" ? { in: ["CLIENTE", "SUPLIDOR", "AMBOS"] } : { in: [tipo, "AMBOS"] };
 }

 if (soloActivos) where.activo = true;

 if (busqueda) {
 where.OR = [
 { nombre: { contains: busqueda, mode: "insensitive" } },
 { nombreLegal:{ contains: busqueda, mode: "insensitive" } },
 { rnc: { contains: busqueda, mode: "insensitive" } },
 { telefono: { contains: busqueda, mode: "insensitive" } },
 ];
 }

 const [total, contactos] = await Promise.all([
 prisma.contacto.count({ where }),
 prisma.contacto.findMany({
 where,
 include: { direcciones: { orderBy: { esPrincipal: "desc" } } },
 orderBy: { nombre: "asc" },
 skip: (page - 1) * pageSize,
 take: pageSize,
 }),
 ]);

 return { contactos, total, pages: Math.ceil(total / pageSize) };
}

export async function getContacto(id: string) {
 return prisma.contacto.findUnique({
 where: { id },
 include: {
 direcciones: { orderBy: { esPrincipal: "desc" } },
 _count: { select: { ventas: true, compras: true } },
 },
 });
}

// Crear 

export async function crearContacto(data: ContactoInput) {
 const parsed = ContactoSchema.safeParse(data);
 if (!parsed.success) {
 return { error: parsed.error.flatten().fieldErrors };
 }

 const { direcciones, email, rnc, limiteCredito, descuentoFijo, ...rest } = parsed.data;

 try {
 const contacto = await prisma.contacto.create({
 data: {
 ...rest,
 nombre: cap(rest.nombre),
 nombreLegal: rest.nombreLegal ? cap(rest.nombreLegal) : null,
 email: email || null,
 rnc: rnc || null,
 limiteCredito: limiteCredito ? limiteCredito : null,
 descuentoFijo: descuentoFijo ? descuentoFijo : null,
 direcciones: {
 create: direcciones.map((d, i) => ({
 ...d,
 esPrincipal: i === 0 ? true : d.esPrincipal,
 })),
 },
 },
 });

 revalidatePath("/contactos");
 return { success: true, id: contacto.id };
 } catch (e: unknown) {
 const error = e as { code?: string };
 if (error.code === "P2002") {
 return { error: { rnc: ["Este RNC/Cédula ya está registrado"] } };
 }
 return { error: { _: ["Error al guardar el contacto"] } };
 }
}

// Actualizar 

export async function actualizarContacto(id: string, data: ContactoInput) {
 const parsed = ContactoSchema.safeParse(data);
 if (!parsed.success) {
 return { error: parsed.error.flatten().fieldErrors };
 }

 const { direcciones, email, rnc, limiteCredito, descuentoFijo, ...rest } = parsed.data;

 try {
 // Actualizar contacto y sincronizar direcciones
 await prisma.$transaction(async (tx) => {
 await tx.contacto.update({
 where: { id },
 data: {
 ...rest,
 nombre: cap(rest.nombre),
 nombreLegal: rest.nombreLegal ? cap(rest.nombreLegal) : null,
 email: email || null,
 rnc: rnc || null,
 limiteCredito: limiteCredito ? limiteCredito : null,
 descuentoFijo: descuentoFijo ? descuentoFijo : null,
 },
 });

 // Direcciones nuevas y existentes
 const nuevas = direcciones.filter((d) => !d.id);
 const existentes = direcciones.filter((d) => !!d.id);
 const idsActuales = existentes.map((d) => d.id as string);

 // Eliminar direcciones que ya no están
 await tx.direccionEntrega.deleteMany({
 where: { contactoId: id, id: { notIn: idsActuales } },
 });

 // Actualizar existentes
 for (const dir of existentes) {
 const { id: dirId, ...dirData } = dir;
 await tx.direccionEntrega.update({ where: { id: dirId }, data: dirData });
 }

 // Crear nuevas
 if (nuevas.length > 0) {
 await tx.direccionEntrega.createMany({
 data: nuevas.map((d) => ({ ...d, contactoId: id })),
 });
 }
 });

 revalidatePath("/contactos");
 revalidatePath(`/contactos/${id}`);
 return { success: true };
 } catch (e: unknown) {
 const error = e as { code?: string };
 if (error.code === "P2002") {
 return { error: { rnc: ["Este RNC/Cédula ya está registrado"] } };
 }
 return { error: { _: ["Error al actualizar el contacto"] } };
 }
}

// Archivar (soft delete) 

export async function archivarContacto(id: string) {
 await prisma.contacto.update({
 where: { id },
 data: { activo: false },
 });
 revalidatePath("/contactos");
 return { success: true };
}

export async function restaurarContacto(id: string) {
 await prisma.contacto.update({
 where: { id },
 data: { activo: true },
 });
 revalidatePath("/contactos");
 return { success: true };
}
