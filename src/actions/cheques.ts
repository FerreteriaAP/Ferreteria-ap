"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Admin: marcar cheque listo ────────────────────────────────────────────────

export async function marcarChequeListo(contactoId: string) {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado" };
  const rol = (session.user as { rol?: string }).rol;
  if (rol !== "ADMINISTRADOR") return { error: "Sin permisos" };

  await prisma.contacto.update({
    where: { id: contactoId },
    data: { chequeListo: true, fechaChequeListo: new Date() },
  });

  revalidatePath("/alertas");
  revalidatePath(`/contactos/${contactoId}`);
  return { ok: true };
}

// ── Admin: desmarcar cheque listo ─────────────────────────────────────────────

export async function desmarcarChequeListo(contactoId: string) {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado" };
  const rol = (session.user as { rol?: string }).rol;
  if (rol !== "ADMINISTRADOR") return { error: "Sin permisos" };

  await prisma.contacto.update({
    where: { id: contactoId },
    data: { chequeListo: false, fechaChequeListo: null },
  });

  revalidatePath("/alertas");
  revalidatePath(`/contactos/${contactoId}`);
  return { ok: true };
}

// ── Vendedor/Asistente: marcar cheque entregado ───────────────────────────────

export async function marcarChequeEntregado(contactoId: string) {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado" };
  const userId = (session.user as { id: string }).id;
  const rol = (session.user as { rol?: string }).rol;

  const rolesPermitidos = ["VENDEDOR", "ASISTENTE_ADMINISTRATIVO", "ADMINISTRADOR"];
  if (!rolesPermitidos.includes(rol ?? "")) return { error: "Sin permisos" };

  const contacto = await prisma.contacto.findUnique({
    where: { id: contactoId },
    select: { chequeListo: true, nombre: true },
  });
  if (!contacto?.chequeListo) return { error: "Este suplidor no tiene cheque pendiente" };

  await prisma.$transaction([
    prisma.alertaChequePago.create({
      data: {
        contactoId,
        entregadoPorId: userId,
        vistoPorAdmin: false,
      },
    }),
    prisma.contacto.update({
      where: { id: contactoId },
      data: { chequeListo: false, fechaChequeListo: null },
    }),
  ]);

  revalidatePath("/alertas");
  return { ok: true };
}

// ── Admin: dismiss alerta de cheque entregado ─────────────────────────────────

export async function dismissAlertaCheque(alertaId: string) {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado" };
  const rol = (session.user as { rol?: string }).rol;
  if (rol !== "ADMINISTRADOR") return { error: "Sin permisos" };

  await prisma.alertaChequePago.update({
    where: { id: alertaId },
    data: { vistoPorAdmin: true },
  });

  revalidatePath("/alertas");
  return { ok: true };
}
