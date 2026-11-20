"use server";

import { prisma } from "@/lib/prisma";
import { TipoComprobante } from "@/generated/prisma";

// Formato DGII: E31XXXXXXXXXX — tipo (3 chars) + 10 dígitos = 13 chars total
function formatNcf(tipo: string, numero: number): string {
  return `${tipo}${String(numero).padStart(10, "0")}`;
}

export async function siguienteNcf(tipo: "E31" | "E32" | "E34"): Promise<
  { ncf: string; siguiente: number } | { error: string }
> {
  const seq = await prisma.secuenciaEcf.findUnique({
    where: { tipo: tipo as TipoComprobante },
  });

  if (!seq) return { error: `No hay secuencia configurada para ${tipo}` };
  if (seq.siguiente > seq.hasta) {
    return { error: `Secuencia ${tipo} agotada (límite: ${seq.hasta}). Contacta a GTI para ampliar la autorización.` };
  }

  // Reservar el número atómicamente
  const updated = await prisma.secuenciaEcf.update({
    where: { tipo: tipo as TipoComprobante },
    data: { siguiente: { increment: 1 } },
  });

  return {
    ncf: formatNcf(tipo, seq.siguiente),
    siguiente: updated.siguiente,
  };
}

export async function getSecuenciasEcf() {
  return prisma.secuenciaEcf.findMany({ orderBy: { tipo: "asc" } });
}
