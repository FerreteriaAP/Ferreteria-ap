/**
 * Generador centralizado de números de documento.
 *
 * Formato: PREFIJO/AÑO/NNNN
 *   - PREFIJO: FAC, CDC, CMP, NCR, ODC, COT, OVN, PDV …
 *   - AÑO: año actual del sistema (2026, 2027 …)
 *   - NNNN: contador global continuo, 4 dígitos (no resetea por año)
 *
 * El contador vive en la tabla `secuencia_documento` (campo `siguiente`).
 * El prefijo almacenado en BD es solo de referencia; el de código es
 * la fuente de verdad para el formato.
 */

import { prisma } from "@/lib/prisma";

export async function generarNumero(tipo: string, prefijo: string): Promise<string> {
  const año = new Date().getFullYear();

  // upsert atómico: crea el registro si no existe y siempre incrementa
  const seq = await prisma.secuenciaDocumento.upsert({
    where:  { tipo },
    create: { tipo, prefijo, siguiente: 2, digitos: 4 },
    update: { siguiente: { increment: 1 } },
  });

  // siguiente - 1 porque upsert ya lo incrementó
  const num = String(seq.siguiente - 1).padStart(4, "0");
  return `${prefijo}/${año}/${num}`;
}
