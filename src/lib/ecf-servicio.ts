/**
 * Lógica e-CF del lado del servidor: arma el documento para el conector a partir
 * de una venta o una nota de crédito, lo emite y guarda la respuesta en ecf*.
 *
 * No es un archivo de server actions: lo usan src/actions/ecf.ts (con sesión),
 * las acciones de facturación y el route handler de sincronización (con token).
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { fechaRD, hoyRD, sumarDiasRD } from "@/lib/fechas";
import {
  camposDesdeRespuesta, consultarECF, emitirECF, ErrorEcf, ESTADOS_EN_CURSO,
  reemitirECF, reintentarECF,
  type DocumentoEcf, type LineaEcf, type RespuestaEcf,
} from "@/lib/ecf";

const LIMITE_RFCE = 250_000;

// ── Cuadre exacto de montos ───────────────────────────────────────────────────
// El conector calcula cada línea como round2(cantidad × precio) y rechaza la
// factura si el total no coincide al centavo con lo cobrado. Para que siempre
// cuadre, cada línea se manda de forma que su importe sea exactamente el
// subtotal que guardó la app; si no se puede con la cantidad real (cantidades
// fraccionadas de más de 2 decimales, redondeos), va como 1 × importe.

const cents = (n: number) => Math.round(n * 100 + (n >= 0 ? 1e-7 : -1e-7));

/** Lo que el conector calcula: round_half_up(cantidad × precio, 2), en centavos. */
function brutoConector(cant2: number, precio4: number): number {
  const q = Math.round(cant2 * 100);        // cantidad en centésimas (entero)
  const p = Math.round(precio4 * 10_000);   // precio en diezmilésimas (entero)
  return Math.floor((q * p + 5_000) / 10_000);
}

function fmtCant(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function lineaExacta(o: {
  descripcion: string; unidad?: string | null; cantidad: number; baseCentavos: number;
  exento: boolean; esServicio: boolean;
}): LineaEcf {
  const { cantidad, baseCentavos } = o;
  const comun = { itbis: (o.exento ? "exento" : 18) as LineaEcf["itbis"], es_servicio: o.esServicio };
  const cant2 = Math.round(cantidad * 100) / 100;
  if (cantidad > 0 && Math.abs(cant2 - cantidad) < 1e-9) {
    const precio4 = Math.round((baseCentavos / 100 / cant2) * 10_000) / 10_000;
    if (brutoConector(cant2, precio4) === baseCentavos) {
      return { descripcion: o.descripcion, cantidad: cant2, precio_unitario: precio4, ...comun };
    }
  }
  const unidad = o.unidad ? ` ${o.unidad}` : "";
  return {
    descripcion: `${fmtCant(cantidad)}${unidad} × ${o.descripcion}`,
    cantidad: 1,
    precio_unitario: baseCentavos / 100,
    ...comun,
  };
}

/** Ajusta itbis_total para que base + ITBIS = total cobrado, al centavo. */
function totales(lineas: LineaEcf[], totalCobrado: number) {
  const base = lineas.reduce((s, l) => s + cents(l.cantidad * l.precio_unitario), 0);
  const totalC = cents(totalCobrado);
  return { itbis_total: (totalC - base) / 100, total_esperado: totalC / 100 };
}

// ── Comprador ────────────────────────────────────────────────────────────────

function rncLimpio(rnc?: string | null) {
  const d = (rnc ?? "").replace(/\D/g, "");
  return d.length === 9 || d.length === 11 ? d : "";
}

type ClienteEcf = { nombre: string; nombreLegal: string | null; rnc: string | null; email: string | null };

function comprador(tipo: number, cliente: ClienteEcf, total: number): { comprador?: DocumentoEcf["comprador"]; error?: string } {
  const rnc = rncLimpio(cliente.rnc);
  const nombre = (cliente.nombreLegal || cliente.nombre || "").trim();
  const exige = tipo === 31 || tipo === 44 || tipo === 45 || (tipo === 32 && total >= LIMITE_RFCE);
  if (exige && !rnc) {
    const motivo = tipo === 32
      ? `una factura de consumo de RD$${LIMITE_RFCE.toLocaleString("en-US")} o más`
      : tipo === 31 ? "una factura de crédito fiscal" : "este tipo de comprobante";
    return { error: `El cliente "${cliente.nombre}" no tiene RNC o cédula válido (9 u 11 dígitos), y es obligatorio para ${motivo}. Corrige el cliente o usa B02 (consumo).` };
  }
  if (!rnc) return {};
  return { comprador: { rnc, nombre, ...(cliente.email ? { correo: cliente.email } : {}) } };
}

export function tipoEcfDesdeNcf(tipoNcf?: string | null): 31 | 32 | 44 | 45 {
  if (tipoNcf === "B01") return 31;
  if (tipoNcf === "B14") return 44;
  if (tipoNcf === "B15") return 45;
  return 32;
}

// ── Documento desde una venta ─────────────────────────────────────────────────

const FORMA: Record<string, string> = {
  EFECTIVO: "efectivo", TARJETA: "tarjeta", TRANSFERENCIA: "transferencia",
  CHEQUE: "cheque", CREDITO: "credito", NC: "nota_credito",
};

export async function documentoDesdeVenta(
  ventaId: string,
  opts: { tipoNcf?: string | null; formas?: { metodo: string; monto: number }[] } = {},
): Promise<{ doc: DocumentoEcf } | { error: string }> {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: {
      cliente: { select: { nombre: true, nombreLegal: true, rnc: true, email: true } },
      detalles: {
        orderBy: { orden: "asc" },
        include: { producto: { select: { nombre: true, exentoItbis: true, esServicio: true } } },
      },
    },
  });
  if (!venta) return { error: "Venta no encontrada" };
  if (!venta.detalles.length) return { error: "La venta no tiene productos" };

  const tipo = tipoEcfDesdeNcf(opts.tipoNcf !== undefined ? opts.tipoNcf : venta.tipoNcf);
  const total = Number(venta.total);
  const c = comprador(tipo, venta.cliente, total);
  if (c.error) return { error: c.error };

  const lineas = venta.detalles.map((d) => lineaExacta({
    descripcion: (d.descripcion || d.producto.nombre).trim(),
    unidad: d.unidad,
    cantidad: Number(d.cantidad),
    baseCentavos: cents(Number(d.subtotal)),
    exento: d.exentoItbis || d.producto.exentoItbis,
    esServicio: d.producto.esServicio,
  }));

  // Pago: a crédito si la venta lo es o si en caja se dejó parte a crédito.
  const hayCreditoCaja = opts.formas?.some((f) => f.metodo === "CREDITO" && f.monto > 0) ?? false;
  const esCredito = hayCreditoCaja || (!opts.formas && venta.credito !== "CONTADO");
  let fechaLimite: string | null = null;
  if (esCredito) {
    fechaLimite = venta.fechaVencimiento
      ? fechaRD(venta.fechaVencimiento)
      : sumarDiasRD(venta.diasCredito ?? 30);
  }
  let formas: { forma: string; monto: number }[] | undefined;
  if (opts.formas?.length) {
    const f = opts.formas.filter((x) => x.monto > 0).map((x) => ({ forma: FORMA[x.metodo] ?? "otras", monto: cents(x.monto) / 100 }));
    const suma = f.reduce((s, x) => s + cents(x.monto), 0);
    if (suma === cents(total)) formas = f; // si no cuadra al centavo, se omite (es opcional)
  }

  return {
    doc: {
      referencia: venta.id,
      numero_interno: venta.numero.slice(0, 20),
      tipo,
      fecha_emision: hoyRD(),
      ...(c.comprador ? { comprador: c.comprador } : {}),
      pago: { condicion: esCredito ? "credito" : "contado", fecha_limite: fechaLimite, ...(formas ? { formas } : {}) },
      lineas,
      ...totales(lineas, total),
    },
  };
}

// ── Documento desde una nota de crédito (tipo 34) ─────────────────────────────

interface DetalleNC { productoId: string; nombre: string; unidad: string; cantidad: number; subtotal: number }

const NCF_VALIDO = /^(E\d{12}|B\d{10})$/;

export async function documentoDesdeNotaCredito(
  ncId: string,
): Promise<{ doc: DocumentoEcf } | { error: string } | { omitir: string }> {
  const nc = await prisma.notaCredito.findUnique({
    where: { id: ncId },
    include: {
      cliente: { select: { nombre: true, nombreLegal: true, rnc: true, email: true } },
      venta: {
        select: {
          id: true, numero: true, total: true, ncf: true, ecfEncf: true, ecfFechaFirma: true, updatedAt: true,
          cuentasPorCobrar: { select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 1 },
        },
      },
    },
  });
  if (!nc) return { error: "Nota de crédito no encontrada" };

  const ncfOriginal = (nc.venta.ecfEncf || nc.venta.ncf || "").trim().toUpperCase();
  if (!NCF_VALIDO.test(ncfOriginal)) {
    return { omitir: `La factura ${nc.venta.numero} no tiene comprobante fiscal; la nota de crédito no se reporta a la DGII.` };
  }

  // Fecha del documento original: la de su e-CF; si era un NCF B, la de facturación.
  let fechaOriginal: string;
  const m = nc.venta.ecfFechaFirma?.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (nc.venta.ecfEncf && m) fechaOriginal = `${m[3]}-${m[2]}-${m[1]}`;
  else fechaOriginal = fechaRD(nc.venta.cuentasPorCobrar[0]?.createdAt ?? nc.venta.updatedAt);

  const detalles = (nc.detalles ?? []) as unknown as DetalleNC[];
  if (!detalles.length) return { error: "La nota de crédito no tiene detalle" };
  const productos = await prisma.producto.findMany({
    where: { id: { in: detalles.map((d) => d.productoId) } },
    select: { id: true, exentoItbis: true, esServicio: true },
  });
  const pmap = new Map(productos.map((p) => [p.id, p]));

  const lineas = detalles.map((d) => {
    const p = pmap.get(d.productoId);
    const exento = p?.exentoItbis ?? false;
    const final = Number(d.subtotal); // con ITBIS
    return lineaExacta({
      descripcion: d.nombre,
      unidad: d.unidad,
      cantidad: Number(d.cantidad),
      baseCentavos: cents(exento ? final : final / 1.18),
      exento,
      esServicio: p?.esServicio ?? false,
    });
  });

  const monto = Number(nc.monto);
  const total = Number(nc.venta.total);
  const c = comprador(34, nc.cliente, monto);

  return {
    doc: {
      referencia: `nc_${nc.id}`,
      numero_interno: nc.numero.slice(0, 20),
      tipo: 34,
      fecha_emision: hoyRD(),
      ...(c.comprador ? { comprador: c.comprador } : {}),
      pago: { condicion: "contado" },
      lineas,
      documento_modificado: {
        ncf: ncfOriginal,
        fecha: fechaOriginal,
        codigo_modificacion: Math.abs(monto - total) < 0.01 ? 1 : 3,
        razon: (nc.motivo || "Devolución").slice(0, 90),
      },
      ...totales(lineas, monto),
    },
  };
}

// ── Emitir y guardar ──────────────────────────────────────────────────────────

type Destino = { tipo: "venta" | "nc"; id: string };

async function guardar(dest: Destino, data: Prisma.VentaUpdateInput & Prisma.NotaCreditoUpdateInput) {
  if (dest.tipo === "venta") await prisma.venta.update({ where: { id: dest.id }, data });
  else await prisma.notaCredito.update({ where: { id: dest.id }, data });
}

function mensajeError(e: unknown) {
  if (e instanceof ErrorEcf) return e.detalles.length ? `${e.message}: ${e.detalles.join("; ")}` : e.message;
  return e instanceof Error ? e.message : String(e);
}

async function aplicarRespuesta(dest: Destino, r: RespuestaEcf) {
  const campos = camposDesdeRespuesta(r);
  // Con e-CF el NCF visible de la venta es el e-NCF: así reportes y búsquedas siguen igual.
  await guardar(dest, dest.tipo === "venta" ? { ...campos, ncf: r.encf } : campos);
}

/** Emite el e-CF de una venta ya facturada. No lanza: devuelve el error para mostrarlo. */
export async function emitirVenta(
  ventaId: string,
  opts: { asincrono?: boolean; formas?: { metodo: string; monto: number }[] } = {},
): Promise<{ ok: true; encf: string; estado: string } | { error: string }> {
  const armado = await documentoDesdeVenta(ventaId, { formas: opts.formas });
  if ("error" in armado) {
    await guardar({ tipo: "venta", id: ventaId }, { ecfError: armado.error, ecfActualizado: new Date() });
    return { error: armado.error };
  }
  try {
    const r = await emitirECF(armado.doc, { asincrono: opts.asincrono });
    await aplicarRespuesta({ tipo: "venta", id: ventaId }, r);
    return { ok: true, encf: r.encf, estado: r.estado };
  } catch (e) {
    const msg = mensajeError(e);
    await guardar({ tipo: "venta", id: ventaId }, { ecfError: msg, ecfActualizado: new Date() });
    return { error: msg };
  }
}

export async function emitirNotaCredito(
  ncId: string,
): Promise<{ ok: true; encf: string; estado: string } | { omitida: string } | { error: string }> {
  const armado = await documentoDesdeNotaCredito(ncId);
  if ("omitir" in armado) return { omitida: armado.omitir };
  if ("error" in armado) {
    await guardar({ tipo: "nc", id: ncId }, { ecfError: armado.error, ecfActualizado: new Date() });
    return { error: armado.error };
  }
  try {
    const r = await emitirECF(armado.doc, { asincrono: true });
    await aplicarRespuesta({ tipo: "nc", id: ncId }, r);
    return { ok: true, encf: r.encf, estado: r.estado };
  } catch (e) {
    const msg = mensajeError(e);
    await guardar({ tipo: "nc", id: ncId }, { ecfError: msg, ecfActualizado: new Date() });
    return { error: msg };
  }
}

const referencia = (d: Destino) => (d.tipo === "venta" ? d.id : `nc_${d.id}`);

/** Reenvía un documento en estado pendiente_envio o verificar (mismo e-NCF). */
export async function reintentar(dest: Destino) {
  try {
    const r = await reintentarECF(referencia(dest));
    await aplicarRespuesta(dest, r);
    return { ok: true as const, estado: r.estado };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

/** Tras un rechazo: vuelve a armar el documento con los datos actuales y pide un e-NCF nuevo. */
export async function reemitir(dest: Destino) {
  const armado = dest.tipo === "venta" ? await documentoDesdeVenta(dest.id) : await documentoDesdeNotaCredito(dest.id);
  if ("omitir" in armado) return { error: armado.omitir };
  if ("error" in armado) return { error: armado.error };
  try {
    const r = await reemitirECF(referencia(dest), armado.doc);
    await aplicarRespuesta(dest, r);
    return { ok: true as const, encf: r.encf, estado: r.estado };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

/** Consulta al conector los documentos que siguen en curso y actualiza su estado. */
export async function sincronizarPendientes(limite = 100) {
  const where = { ecfEstado: { in: ESTADOS_EN_CURSO as string[] } };
  const [ventas, ncs] = await Promise.all([
    prisma.venta.findMany({ where, select: { id: true }, take: limite, orderBy: { ecfActualizado: "asc" } }),
    prisma.notaCredito.findMany({ where, select: { id: true }, take: limite, orderBy: { ecfActualizado: "asc" } }),
  ]);
  const destinos: Destino[] = [
    ...ventas.map((v) => ({ tipo: "venta" as const, id: v.id })),
    ...ncs.map((n) => ({ tipo: "nc" as const, id: n.id })),
  ];
  let actualizados = 0;
  const errores: string[] = [];
  for (const d of destinos) {
    try {
      const r = await consultarECF(referencia(d));
      await aplicarRespuesta(d, r);
      actualizados++;
    } catch (e) {
      errores.push(`${referencia(d)}: ${mensajeError(e)}`);
      if (e instanceof ErrorEcf && e.http === 0) break; // conector caído: no insistir con el resto
    }
  }
  return { revisados: destinos.length, actualizados, errores };
}
