"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { cap } from "@/lib/format";

// Queries 

export async function getUsuarios() {
 return prisma.usuario.findMany({
 orderBy: { createdAt: "desc" },
 select: {
 id: true,
 email: true,
 nombre: true,
 apellido: true,
 rol: true,
 activo: true,
 createdAt: true,
 empleado: { select: { nombre: true, apellido: true } },
 },
 });
}

export async function getUsuario(id: string) {
 return prisma.usuario.findUnique({
 where: { id },
 select: {
 id: true,
 email: true,
 nombre: true,
 apellido: true,
 rol: true,
 activo: true,
 empleadoId: true,
 },
 });
}

// Mutations 

export async function crearUsuario(data: {
 email: string;
 password: string;
 nombre: string;
 apellido?: string;
 rol: string;
}) {
 const session = await auth();
 if (session?.user?.rol !== "ADMINISTRADOR") return { error: "Sin permiso" };

 const existe = await prisma.usuario.findUnique({ where: { email: data.email } });
 if (existe) return { error: "Ya existe un usuario con ese correo" };

 if (data.password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" };

 const hash = await bcrypt.hash(data.password, 10);

 const user = await prisma.usuario.create({
 data: {
 email: data.email.toLowerCase().trim(),
 password: hash,
 nombre: cap(data.nombre),
 apellido: cap(data.apellido) ?? "",
 rol: data.rol as "ADMINISTRADOR" | "ASISTENTE_ADMINISTRATIVO" | "VENDEDOR" | "CAJA",
 },
 });

 revalidatePath("/usuarios");
 return { id: user.id };
}

export async function editarUsuario(id: string, data: {
 nombre: string;
 apellido?: string;
 rol: string;
 activo: boolean;
}) {
 const session = await auth();
 if (session?.user?.rol !== "ADMINISTRADOR") return { error: "Sin permiso" };

 await prisma.usuario.update({
 where: { id },
 data: {
 nombre: cap(data.nombre),
 apellido: cap(data.apellido) ?? "",
 rol: data.rol as "ADMINISTRADOR" | "ASISTENTE_ADMINISTRATIVO" | "VENDEDOR" | "CAJA",
 activo: data.activo,
 },
 });

 revalidatePath("/usuarios");
 return { ok: true };
}

export async function cambiarPassword(id: string, nuevaPassword: string) {
 const session = await auth();
 if (session?.user?.rol !== "ADMINISTRADOR") return { error: "Sin permiso" };

 if (nuevaPassword.length < 6) return { error: "Mínimo 6 caracteres" };

 const hash = await bcrypt.hash(nuevaPassword, 10);
 await prisma.usuario.update({ where: { id }, data: { password: hash } });

 revalidatePath("/usuarios");
 return { ok: true };
}

export async function toggleUsuario(id: string) {
 const session = await auth();
 if (session?.user?.rol !== "ADMINISTRADOR") return { error: "Sin permiso" };

 const user = await prisma.usuario.findUnique({ where: { id }, select: { activo: true } });
 if (!user) return { error: "Usuario no encontrado" };

 await prisma.usuario.update({ where: { id }, data: { activo: !user.activo } });
 revalidatePath("/usuarios");
 return { ok: true };
}

export async function eliminarUsuario(id: string) {
 const session = await auth();
 if (session?.user?.rol !== "ADMINISTRADOR") return { error: "Sin permiso" };

 // No puede eliminarse a sí mismo
 const selfId = (session.user as { id?: string }).id;
 if (selfId === id) return { error: "No puedes eliminar tu propio usuario" };

 // Verificar registros relacionados que impiden la eliminación
 const [ventas, compras, ordenes, gastos, turnos] = await Promise.all([
 prisma.venta.count({ where: { OR: [{ creadorId: id }, { vendedorId: id }] } }),
 prisma.compra.count({ where: { usuarioId: id } }),
 prisma.ordenCompra.count({ where: { usuarioId: id } }),
 prisma.gasto.count({ where: { usuarioId: id } }),
 prisma.turnoCaja.count({ where: { usuarioId: id } }),
 ]);

 const total = ventas + compras + ordenes + gastos + turnos;
 if (total > 0) {
 return {
 error: `No se puede eliminar: el usuario tiene ${total} registro${total !== 1 ? "s" : ""} asociado${total !== 1 ? "s" : ""} (ventas, compras, turnos, etc.). Desactívalo en su lugar.`,
 };
 }

 // Eliminar sesiones y cuentas OAuth primero (FK)
 await prisma.session.deleteMany({ where: { userId: id } });
 await prisma.account.deleteMany({ where: { userId: id } });
 await prisma.usuario.delete({ where: { id } });

 revalidatePath("/usuarios");
 redirect("/usuarios");
}
