"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getUserId() {
  const session = await auth();
  return session?.user ? (session.user as { id: string }).id : null;
}

// ─── Colaborador: solicitar aprobación para vender sin stock ─────────────────

export async function crearSolicitudSinStock(productoId: string) {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado" };

  // Si ya hay una solicitud PENDIENTE del mismo usuario para el mismo producto, reutilizarla
  const existing = await prisma.solicitudSinStock.findFirst({
    where: { productoId, solicitadoPorId: userId, estado: "PENDIENTE" },
    select: { id: true },
  });
  if (existing) return { id: existing.id };

  const solicitud = await prisma.solicitudSinStock.create({
    data: { productoId, solicitadoPorId: userId },
    select: { id: true },
  });

  revalidatePath("/alertas");
  return { id: solicitud.id };
}

// ─── Colaborador: consultar estado de una solicitud (polling) ────────────────

export async function getEstadoSolicitud(solicitudId: string) {
  const row = await prisma.solicitudSinStock.findUnique({
    where: { id: solicitudId },
    select: { estado: true },
  });
  return { estado: row?.estado ?? "NO_ENCONTRADA" };
}

// ─── Admin: obtener solicitudes pendientes para la página de alertas ─────────

export async function getSolicitudesSinStockPendientes() {
  return prisma.solicitudSinStock.findMany({
    where: { estado: "PENDIENTE" },
    select: {
      id: true,
      createdAt: true,
      producto: { select: { id: true, codigo: true, nombre: true, stockActual: true } },
      solicitadoPor: { select: { nombre: true, apellido: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

// ─── Admin: aprobar ──────────────────────────────────────────────────────────

export async function aprobarSolicitudSinStock(solicitudId: string) {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado" };

  await prisma.solicitudSinStock.update({
    where: { id: solicitudId },
    data: { estado: "APROBADO", respondidoPorId: userId, respondidoAt: new Date() },
  });

  revalidatePath("/alertas");
}

// ─── Admin: rechazar ─────────────────────────────────────────────────────────

export async function rechazarSolicitudSinStock(solicitudId: string) {
  const userId = await getUserId();
  if (!userId) return { error: "No autenticado" };

  await prisma.solicitudSinStock.update({
    where: { id: solicitudId },
    data: { estado: "RECHAZADO", respondidoPorId: userId, respondidoAt: new Date() },
  });

  revalidatePath("/alertas");
}
