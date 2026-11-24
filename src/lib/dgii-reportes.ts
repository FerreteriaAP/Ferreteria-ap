/**
 * Formatos de envío de datos de la DGII: 606 (compras y gastos) y 607 (ventas).
 * Estructura según los instructivos oficiales vigentes (606: feb. 2026; 607: dic. 2025).
 *
 * TXT: primera línea "606|RNC|AAAAMM|cantidad" y luego un registro por comprobante
 * con 23 campos separados por "|". Montos con punto decimal y 2 decimales; fechas
 * AAAAMMDD; campos sin valor, vacíos. Nombre: DGII_F_606_RNC_AAAAMM.TXT.
 * Excel: los mismos 23 campos y, al final, columnas de control (suplidor/cliente,
 * documento interno) que no van en el TXT.
 */
import { prisma } from "@/lib/prisma";
import { EMPRESA } from "@/lib/empresa";
import { fechaRD } from "@/lib/fechas";
import type { HojaXlsx } from "@/lib/xlsx";

export const RNC_EMISOR = EMPRESA.rnc.replace(/\D/g, "");
const LIMITE_CONSUMO = 250_000;

export const CAMPOS_606 = [
  "RNC o Cédula", "Tipo Id", "Tipo Bienes y Servicios Comprados", "NCF", "NCF o Documento Modificado",
  "Fecha Comprobante", "Fecha Pago", "Monto Facturado en Servicios", "Monto Facturado en Bienes",
  "Total Monto Facturado", "ITBIS Facturado", "ITBIS Retenido", "ITBIS sujeto a Proporcionalidad (Art. 349)",
  "ITBIS llevado al Costo", "ITBIS por Adelantar", "ITBIS percibido en compras", "Tipo de Retención en ISR",
  "Monto Retención Renta", "ISR Percibido en compras", "Impuesto Selectivo al Consumo",
  "Otros Impuestos/Tasas", "Monto Propina Legal", "Forma de Pago",
];

export const CAMPOS_607 = [
  "RNC/Cédula o Pasaporte", "Tipo Identificación", "Número Comprobante Fiscal",
  "Número Comprobante Fiscal Modificado", "Tipo de Ingreso", "Fecha Comprobante", "Fecha de Retención",
  "Monto Facturado", "ITBIS Facturado", "ITBIS Retenido por Terceros", "ITBIS Percibido",
  "Retención Renta por Terceros", "ISR Percibido", "Impuesto Selectivo al Consumo", "Otros Impuestos/Tasas",
  "Monto Propina Legal", "Efectivo", "Cheque/Transferencia/Depósito", "Tarjeta Débito/Crédito",
  "Venta a Crédito", "Bonos o Certificados de Regalo", "Permuta", "Otras Formas de Ventas",
];

/** Un registro: 23 campos (texto, monto o vacío) + columnas de control para el Excel. */
type Campo = string | number | null;
interface Registro { campos: Campo[]; control: string[] }

export interface Reporte {
  formato: "606" | "607";
  periodo: string;       // AAAAMM
  registros: Registro[]; // los que van en el TXT
  fueraDelTxt?: { titulo: string; registros: Registro[] }; // control interno (Excel)
  controlEncabezados: string[];
}

// ── utilidades ────────────────────────────────────────────────────────────────

/** Rango del mes en hora de RD (UTC−4, sin horario de verano). */
export function rangoPeriodo(periodo: string) {
  const m = /^(\d{4})(\d{2})$/.exec(periodo);
  if (!m) throw new Error("Período inválido (AAAAMM)");
  const y = Number(m[1]), mes = Number(m[2]);
  if (mes < 1 || mes > 12) throw new Error("Período inválido (AAAAMM)");
  return { desde: new Date(Date.UTC(y, mes - 1, 1, 4)), hasta: new Date(Date.UTC(y, mes, 1, 4)) };
}

const aaaammdd = (d: Date) => fechaRD(d).replace(/-/g, "");
const r2 = (n: number) => Math.round(n * 100 + (n >= 0 ? 1e-7 : -1e-7)) / 100;
const soloDigitos = (s?: string | null) => (s ?? "").replace(/\D/g, "");
const tipoId = (rnc: string) => (rnc.length === 9 ? "1" : rnc.length === 11 ? "2" : "");
/** Montos opcionales: vacío si es cero. */
const opc = (n: number) => (Math.abs(n) < 0.005 ? null : r2(n));

function formaPago606(metodos: string[], quedaPendiente: boolean): string {
  const tipos = new Set<string>(metodos.map((m) => (m === "EFECTIVO" ? "01" : m === "TARJETA" ? "03" : "02")));
  if (quedaPendiente) tipos.add("04");
  if (tipos.size === 0) return "04";
  return tipos.size === 1 ? [...tipos][0] : "07";
}

// ── 606: compras y gastos ────────────────────────────────────────────────────

function fila606(o: {
  rnc: string; tipo: string; ncf: string; fecha: Date; fechaPago: Date | null;
  servicios: number; bienes: number; itbis: number; forma: string; control: string[];
}): Registro {
  const total = r2(o.servicios + o.bienes);
  return {
    campos: [
      o.rnc, tipoId(o.rnc), o.tipo, o.ncf, null,
      aaaammdd(o.fecha), o.fechaPago ? aaaammdd(o.fechaPago) : null,
      r2(o.servicios), r2(o.bienes), total, r2(o.itbis),
      null, null, null, r2(o.itbis), null, null, null, null, null, null, null,
      o.forma,
    ],
    control: o.control,
  };
}

export async function reporte606(periodo: string): Promise<Reporte> {
  const { desde, hasta } = rangoPeriodo(periodo);
  const [compras, gastos, caja] = await Promise.all([
    prisma.compra.findMany({
      where: { fechaFactura: { gte: desde, lt: hasta }, ncf: { not: null } },
      include: { suplidor: { select: { nombre: true, rnc: true } }, pagos: { select: { fecha: true, metodo: true, monto: true } } },
      orderBy: { fechaFactura: "asc" },
    }),
    prisma.gasto.findMany({
      where: { fecha: { gte: desde, lt: hasta }, ncf: { not: null } },
      orderBy: { fecha: "asc" },
    }),
    prisma.movimientoCaja.findMany({
      where: { fecha: { gte: desde, lt: hasta }, ncf: { not: null }, subTipo: { in: ["GASTO", "COMPRA_MERCANCIA"] } },
      orderBy: { fecha: "asc" },
    }),
  ]);

  const registros: Registro[] = [];

  for (const c of compras) {
    const pagado = c.pagos.reduce((s, p) => s + Number(p.monto), 0);
    const pendiente = Number(c.total) - pagado > 0.01;
    const ultimoPago = c.pagos.length ? c.pagos.reduce((a, p) => (p.fecha > a ? p.fecha : a), c.pagos[0].fecha) : null;
    registros.push(fila606({
      rnc: soloDigitos(c.suplidor.rnc), tipo: "09", ncf: c.ncf!.trim().toUpperCase(),
      fecha: c.fechaFactura, fechaPago: pendiente ? null : ultimoPago,
      servicios: 0, bienes: Number(c.subtotal), itbis: Number(c.itbis),
      forma: formaPago606(c.pagos.map((p) => p.metodo), pendiente),
      control: [c.suplidor.nombre, `Compra ${c.numero}`],
    }));
  }

  for (const g of gastos) {
    const itbis = Number(g.itbis);
    const base = Number(g.monto) - itbis;
    registros.push(fila606({
      rnc: soloDigitos(g.suplidorRnc), tipo: g.tipo606 ?? "02", ncf: g.ncf!,
      fecha: g.fecha, fechaPago: g.fecha,
      servicios: g.esServicio ? base : 0, bienes: g.esServicio ? 0 : base, itbis,
      forma: formaPago606(g.metodo ? [g.metodo] : ["EFECTIVO"], false),
      control: [g.suplidorNombre ?? "", `Gasto ${g.numero}: ${g.descripcion}`],
    }));
  }

  for (const m of caja) {
    const itbis = Number(m.itbis ?? 0);
    const base = Number(m.monto) - itbis;
    const esCompra = m.subTipo === "COMPRA_MERCANCIA";
    registros.push(fila606({
      rnc: soloDigitos(m.suplidorRnc), tipo: m.tipo606 ?? (esCompra ? "09" : "02"), ncf: m.ncf!,
      fecha: m.fecha, fechaPago: m.fecha,
      servicios: esCompra ? 0 : base, bienes: esCompra ? base : 0, itbis,
      forma: "01",
      control: [m.suplidorNombre ?? m.concepto, `Caja (${esCompra ? "compra" : "gasto"}): ${m.concepto}`],
    }));
  }

  registros.sort((a, b) => String(a.campos[5]).localeCompare(String(b.campos[5])));
  return { formato: "606", periodo, registros, controlEncabezados: ["Suplidor", "Origen en el sistema"] };
}

// ── 607: ventas ──────────────────────────────────────────────────────────────

function esConsumo(v: { tipoNcf: string | null; ecfTipo: number | null; ncf: string | null }) {
  const n = (v.ncf ?? "").toUpperCase();
  return v.ecfTipo === 32 || v.tipoNcf === "B02" || n.startsWith("B02") || n.startsWith("E32");
}

/** Fecha del comprobante: la de la firma del e-CF; si no, la de facturación (CxC) o la de emisión. */
function fechaComprobante(v: { ecfFechaFirma: string | null; fechaEmision: Date; cuentasPorCobrar: { createdAt: Date }[] }): Date {
  const m = v.ecfFechaFirma?.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T16:00:00Z`);
  return v.cuentasPorCobrar[0]?.createdAt ?? v.fechaEmision;
}

export async function reporte607(periodo: string): Promise<Reporte> {
  const { desde, hasta } = rangoPeriodo(periodo);
  const [ventas, ncs] = await Promise.all([
    prisma.venta.findMany({
      // Facturada (actualizada) dentro o después del mes y creada antes de que termine.
      where: { tipo: "FACTURADA", ncf: { not: null }, updatedAt: { gte: desde }, fechaEmision: { lt: hasta } },
      select: {
        id: true, numero: true, ncf: true, tipoNcf: true, ecfTipo: true, ecfFechaFirma: true,
        subtotal: true, itbis: true, total: true, fechaEmision: true,
        cliente: { select: { nombre: true, rnc: true } },
        pagosRecibidos: { select: { metodo: true, monto: true } },
        cuentasPorCobrar: { select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
    prisma.notaCredito.findMany({
      where: { ecfEncf: { not: null }, createdAt: { gte: desde, lt: hasta } },
      select: {
        numero: true, ecfEncf: true, monto: true, createdAt: true, detalles: true,
        cliente: { select: { nombre: true, rnc: true } },
        venta: { select: { ncf: true, tipoNcf: true, ecfTipo: true, total: true } },
      },
    }),
  ]);

  const registros: Registro[] = [];
  const consumoMenor: Registro[] = [];

  for (const v of ventas) {
    const fecha = fechaComprobante(v);
    if (fecha < desde || fecha >= hasta) continue;
    const total = Number(v.total);
    const rnc = soloDigitos(v.cliente.rnc);
    // Formas de pago (con impuestos): lo cobrado por método y el resto a crédito.
    const porMetodo: Record<string, number> = {};
    for (const p of v.pagosRecibidos) porMetodo[p.metodo] = (porMetodo[p.metodo] ?? 0) + Number(p.monto);
    let efectivo = porMetodo.EFECTIVO ?? 0;
    let banco = (porMetodo.CHEQUE ?? 0) + (porMetodo.TRANSFERENCIA ?? 0);
    let tarjeta = porMetodo.TARJETA ?? 0;
    let otras = porMetodo.NC ?? 0;
    // Si se cobró de más (cambio, redondeo), se recorta para que sume el total.
    let exceso = r2(efectivo + banco + tarjeta + otras - total);
    for (const quitar of ["otras", "efectivo", "banco", "tarjeta"] as const) {
      if (exceso <= 0) break;
      const v0 = { otras, efectivo, banco, tarjeta }[quitar];
      const q = Math.min(v0, exceso);
      if (quitar === "otras") otras -= q; else if (quitar === "efectivo") efectivo -= q; else if (quitar === "banco") banco -= q; else tarjeta -= q;
      exceso = r2(exceso - q);
    }
    const credito = r2(total - efectivo - banco - tarjeta - otras);

    const reg: Registro = {
      campos: [
        rnc || null, rnc ? tipoId(rnc) : null, v.ncf!, null, "01", aaaammdd(fecha), null,
        r2(Number(v.subtotal)), r2(Number(v.itbis)),
        null, null, null, null, null, null, null,
        opc(efectivo), opc(banco), opc(tarjeta), opc(credito), null, null, opc(otras),
      ],
      control: [v.cliente.nombre, `Factura ${v.numero}`],
    };
    (esConsumo(v) && total < LIMITE_CONSUMO ? consumoMenor : registros).push(reg);
  }

  for (const n of ncs) {
    const monto = Number(n.monto);
    const detalles = (n.detalles ?? []) as { subtotal: number; productoId: string }[];
    const productos = await prisma.producto.findMany({
      where: { id: { in: detalles.map((d) => d.productoId) } }, select: { id: true, exentoItbis: true },
    });
    const exento = new Map(productos.map((p) => [p.id, p.exentoItbis]));
    const base = r2(detalles.reduce((s, d) => s + (exento.get(d.productoId) ? Number(d.subtotal) : Number(d.subtotal) / 1.18), 0));
    const rnc = soloDigitos(n.cliente.rnc);
    const reg: Registro = {
      campos: [
        rnc || null, rnc ? tipoId(rnc) : null, n.ecfEncf!, n.venta.ncf ?? null, "01", aaaammdd(n.createdAt), null,
        base, r2(monto - base),
        null, null, null, null, null, null, null,
        null, null, null, null, null, null, r2(monto),
      ],
      control: [n.cliente.nombre, `Nota de crédito ${n.numero}`],
    };
    const original = { ...n.venta, ncf: n.venta.ncf };
    (esConsumo(original) && Number(n.venta.total) < LIMITE_CONSUMO ? consumoMenor : registros).push(reg);
  }

  const orden = (a: Registro, b: Registro) => String(a.campos[5]).localeCompare(String(b.campos[5]));
  registros.sort(orden);
  consumoMenor.sort(orden);
  return {
    formato: "607", periodo, registros,
    fueraDelTxt: { titulo: "Consumo menor 250k", registros: consumoMenor },
    controlEncabezados: ["Cliente", "Documento en el sistema"],
  };
}

// ── salidas ──────────────────────────────────────────────────────────────────

const fmtTxt = (c: Campo) => (c === null || c === undefined ? "" : typeof c === "number" ? c.toFixed(2) : c.replace(/\|/g, " "));

export function nombreArchivo(r: Reporte, ext: "TXT" | "xlsx") {
  return `DGII_F_${r.formato}_${RNC_EMISOR}_${r.periodo}.${ext}`;
}

export function aTxt(r: Reporte): string {
  const lineas = [`${r.formato}|${RNC_EMISOR}|${r.periodo}|${r.registros.length}`];
  for (const reg of r.registros) lineas.push(reg.campos.map(fmtTxt).join("|"));
  return lineas.join("\r\n") + "\r\n";
}

export function aHojas(r: Reporte): HojaXlsx[] {
  const campos = r.formato === "606" ? CAMPOS_606 : CAMPOS_607;
  // RNC, NCF, NCF modificado, códigos y fechas van como texto (conservan ceros a la izquierda).
  const texto = r.formato === "606" ? [0, 1, 2, 3, 4, 5, 6, 16, 22] : [0, 1, 2, 3, 4, 5, 6];
  const hoja = (nombre: string, regs: Registro[]): HojaXlsx => {
    const filas = regs.map((x) => [...x.campos, ...x.control]);
    // Fila de totales para los montos
    if (regs.length) {
      const tot: (string | number | null)[] = campos.map((_, i) =>
        texto.includes(i) ? null : r2(regs.reduce((s, x) => s + (typeof x.campos[i] === "number" ? (x.campos[i] as number) : 0), 0)));
      tot[0] = "TOTAL";
      filas.push([...tot, ...r.controlEncabezados.map(() => null)]);
    }
    return { nombre, encabezados: [...campos, ...r.controlEncabezados], filas, columnasTexto: texto };
  };
  const hojas = [hoja(`${r.formato} ${r.periodo}`, r.registros)];
  if (r.fueraDelTxt) hojas.push(hoja(r.fueraDelTxt.titulo, r.fueraDelTxt.registros));
  return hojas;
}
