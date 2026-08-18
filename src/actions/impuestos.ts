"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
 TIPOS_IMPUESTO,
 type TipoImpuesto,
 type PagoImpuestoRow,
} from "@/lib/impuestos-config";

// Consulta 

export async function getPagosImpuesto(
 mes: number,
 anio: number
): Promise<Record<TipoImpuesto, PagoImpuestoRow | null>> {
 const registros = await prisma.pagoImpuesto.findMany({ where: { mes, anio } });

 return TIPOS_IMPUESTO.reduce((acc, tipo) => {
 const r = registros.find((x) => x.tipo === tipo);
 acc[tipo] = r
 ? {
 id: r.id,
 tipo: r.tipo,
 mes: r.mes,
 anio: r.anio,
 monto: Number(r.monto),
 pagado: r.pagado,
 fechaPago: r.fechaPago ? r.fechaPago.toISOString() : null,
 referencia: r.referencia,
 notas: r.notas,
 }
 : null;
 return acc;
 }, {} as Record<TipoImpuesto, PagoImpuestoRow | null>);
}

// Mutación 

const UpsertSchema = z.object({
 tipo: z.enum(TIPOS_IMPUESTO),
 mes: z.coerce.number().int().min(1).max(12),
 anio: z.coerce.number().int().min(2020).max(2100),
 monto: z.coerce.number().min(0),
 pagado: z.boolean().default(false),
 fechaPago: z.string().nullable().optional(),
 referencia: z.string().max(100).nullable().optional(),
 notas: z.string().max(500).nullable().optional(),
});

export async function upsertPagoImpuesto(
 _prev: { error?: string; success?: boolean } | null,
 formData: FormData
): Promise<{ error?: string; success?: boolean }> {
 const pagado = formData.get("pagado") === "1";

 const parsed = UpsertSchema.safeParse({
 tipo: formData.get("tipo"),
 mes: formData.get("mes"),
 anio: formData.get("anio"),
 monto: formData.get("monto"),
 pagado,
 fechaPago: formData.get("fechaPago") || null,
 referencia: formData.get("referencia") || null,
 notas: formData.get("notas") || null,
 });

 if (!parsed.success) {
 const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
 return { error: msg };
 }

 const { tipo, mes, anio, monto, fechaPago, referencia, notas } = parsed.data;

 try {
 await prisma.pagoImpuesto.upsert({
 where: { tipo_mes_anio: { tipo, mes, anio } },
 create: {
 tipo, mes, anio, monto, pagado,
 fechaPago: fechaPago ? new Date(fechaPago) : null,
 referencia: referencia ?? null,
 notas: notas ?? null,
 },
 update: {
 monto, pagado,
 fechaPago: fechaPago ? new Date(fechaPago) : null,
 referencia: referencia ?? null,
 notas: notas ?? null,
 },
 });
 revalidatePath("/contabilidad/impuestos");
 return { success: true };
 } catch (err) {
 console.error("upsertPagoImpuesto:", err);
 return { error: "Error al guardar. Intenta de nuevo." };
 }
}
