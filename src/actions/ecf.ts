"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ecfActivo, ESTADOS_ATENCION, ESTADOS_EN_CURSO, saludECF } from "@/lib/ecf";
import { emitirNotaCredito, emitirVenta, reemitir, reintentar, sincronizarPendientes } from "@/lib/ecf-servicio";

async function sesion() {
  const s = await auth();
  return s?.user?.id ? s : null;
}

function refrescar(tipo: "venta" | "nc", id: string) {
  revalidatePath("/ecf");
  if (tipo === "venta") revalidatePath(`/ventas/${id}`);
}

/** Botón "Emitir e-CF" para una factura que quedó sin comprobante (conector caído, datos). */
export async function emitirEcfVenta(ventaId: string) {
  if (!(await sesion())) return { error: "No autorizado" };
  if (!ecfActivo()) return { error: "La facturación electrónica no está activa" };
  const v = await prisma.venta.findUnique({ where: { id: ventaId }, select: { tipo: true, ecfEncf: true } });
  if (!v || v.tipo !== "FACTURADA") return { error: "Solo se emite e-CF de facturas" };
  if (v.ecfEncf) return { error: "Esta factura ya tiene e-CF" };
  const r = await emitirVenta(ventaId);
  refrescar("venta", ventaId);
  return r;
}

export async function emitirEcfNotaCredito(ncId: string) {
  if (!(await sesion())) return { error: "No autorizado" };
  if (!ecfActivo()) return { error: "La facturación electrónica no está activa" };
  const r = await emitirNotaCredito(ncId);
  refrescar("nc", ncId);
  return r;
}

export async function reintentarEcf(tipo: "venta" | "nc", id: string) {
  if (!(await sesion())) return { error: "No autorizado" };
  const r = await reintentar({ tipo, id });
  refrescar(tipo, id);
  return r;
}

export async function reemitirEcf(tipo: "venta" | "nc", id: string) {
  if (!(await sesion())) return { error: "No autorizado" };
  const r = await reemitir({ tipo, id });
  refrescar(tipo, id);
  return r;
}

export async function sincronizarEcf() {
  if (!(await sesion())) return { error: "No autorizado" };
  const r = await sincronizarPendientes();
  revalidatePath("/ecf");
  return r;
}

/** Datos para la pantalla "Comprobantes electrónicos". */
export async function getPanelEcf() {
  const enCurso = ESTADOS_EN_CURSO as string[];
  const atencion = ESTADOS_ATENCION as string[];
  const selVenta = {
    id: true, numero: true, total: true, createdAt: true, tipoNcf: true,
    ecfTipo: true, ecfEncf: true, ecfEstado: true, ecfMensajes: true, ecfError: true, ecfActualizado: true,
    cliente: { select: { nombre: true } },
  } as const;
  const selNc = {
    id: true, numero: true, monto: true, createdAt: true,
    ecfTipo: true, ecfEncf: true, ecfEstado: true, ecfMensajes: true, ecfError: true, ecfActualizado: true,
    cliente: { select: { nombre: true } },
  } as const;

  const [ventasAtencion, ventasSinEcf, ncsAtencion, enCursoCount, aceptadasHoy, salud] = await Promise.all([
    prisma.venta.findMany({ where: { ecfEstado: { in: atencion } }, select: selVenta, orderBy: { updatedAt: "desc" }, take: 100 }),
    // Facturas que deberían tener e-CF y no lo tienen (falló la llamada al conector).
    prisma.venta.findMany({
      where: { tipo: "FACTURADA", ecfEncf: null, ecfError: { not: null } },
      select: selVenta, orderBy: { updatedAt: "desc" }, take: 100,
    }),
    prisma.notaCredito.findMany({
      where: { OR: [{ ecfEstado: { in: atencion } }, { ecfEncf: null, ecfError: { not: null } }] },
      select: selNc, orderBy: { updatedAt: "desc" }, take: 100,
    }),
    prisma.venta.count({ where: { ecfEstado: { in: enCurso } } }),
    prisma.venta.count({
      where: {
        ecfEstado: { in: ["aceptado", "aceptado_condicional"] },
        ecfActualizado: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
      },
    }),
    saludECF().then((s) => ({ ok: true as const, datos: s })).catch((e: unknown) => ({
      ok: false as const, error: e instanceof Error ? e.message : String(e),
    })),
  ]);

  return {
    activo: ecfActivo(),
    salud,
    enCurso: enCursoCount,
    aceptadasUltimas24h: aceptadasHoy,
    ventas: [...ventasAtencion, ...ventasSinEcf].map((v) => ({ ...v, total: Number(v.total) })),
    notasCredito: ncsAtencion.map((n) => ({ ...n, monto: Number(n.monto) })),
  };
}
