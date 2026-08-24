"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Helpers 

function inicioMes(año: number, mes: number) {
 return new Date(año, mes - 1, 1);
}
function finMes(año: number, mes: number) {
 return new Date(año, mes, 0, 23, 59, 59, 999);
}
function diasVencida(fecha: Date): number {
 return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
}

// OVERVIEW 

export async function getResumenContable() {
 const now = new Date();
 const año = now.getFullYear();
 const mes = now.getMonth() + 1;

 const inicioActual = inicioMes(año, mes);
 const finActual = finMes(año, mes);
 const inicioAnterior = mes === 1 ? inicioMes(año - 1, 12) : inicioMes(año, mes - 1);
 const finAnterior = mes === 1 ? finMes(año - 1, 12) : finMes(año, mes - 1);

 const [
 cxcAgg,
 cxcVencidoAgg,
 cxpAgg,
 cxpVencidoAgg,
 ventasMesAgg,
 ventasAnteriorAgg,
 gastosMesAgg,
 itbisVentasAgg,
 itbisComprasAgg,
 numFacturas,
 numCompras,
 ] = await Promise.all([
 // CxC total pendiente
 prisma.cuentaPorCobrar.aggregate({
 where: { estado: { not: "PAGADO" } },
 _sum: { saldo: true },
 }),
 // CxC vencidas
 prisma.cuentaPorCobrar.aggregate({
 where: { estado: { not: "PAGADO" }, fechaVencimiento: { lt: now } },
 _sum: { saldo: true },
 }),
 // CxP total pendiente
 prisma.cuentaPorPagar.aggregate({
 where: { estado: { not: "PAGADO" } },
 _sum: { saldo: true },
 }),
 // CxP vencidas
 prisma.cuentaPorPagar.aggregate({
 where: { estado: { not: "PAGADO" }, fechaVencimiento: { lt: now } },
 _sum: { saldo: true },
 }),
 // Ventas del mes actual (FACTURADAS)
 prisma.venta.aggregate({
 where: { tipo: "FACTURADA", createdAt: { gte: inicioActual, lte: finActual } },
 _sum: { total: true, subtotal: true, itbis: true },
 }),
 // Ventas mes anterior
 prisma.venta.aggregate({
 where: { tipo: "FACTURADA", createdAt: { gte: inicioAnterior, lte: finAnterior } },
 _sum: { total: true },
 }),
 // Gastos del mes
 prisma.gasto.aggregate({
 where: { fecha: { gte: inicioActual, lte: finActual } },
 _sum: { monto: true },
 }),
 // ITBIS cobrado en ventas del mes
 prisma.venta.aggregate({
 where: { tipo: "FACTURADA", createdAt: { gte: inicioActual, lte: finActual } },
 _sum: { itbis: true },
 }),
 // ITBIS pagado en compras del mes
 prisma.compra.aggregate({
 where: { fechaFactura: { gte: inicioActual, lte: finActual } },
 _sum: { itbis: true },
 }),
 // Número de facturas del mes
 prisma.venta.count({ where: { tipo: "FACTURADA", createdAt: { gte: inicioActual, lte: finActual } } }),
 // Número de compras del mes
 prisma.compra.count({ where: { fechaFactura: { gte: inicioActual, lte: finActual } } }),
 ]);

 const ventasMes = Number(ventasMesAgg._sum.total ?? 0);
 const ventasAnterior = Number(ventasAnteriorAgg._sum.total ?? 0);
 const gastosMes = Number(gastosMesAgg._sum.monto ?? 0);
 const itbisCobrado = Number(itbisVentasAgg._sum.itbis ?? 0);
 const itbisPagado = Number(itbisComprasAgg._sum.itbis ?? 0);

 const variacionVentas = ventasAnterior === 0
 ? null
 : ((ventasMes - ventasAnterior) / ventasAnterior) * 100;

 return {
 cxcTotal: Number(cxcAgg._sum.saldo ?? 0),
 cxcVencido: Number(cxcVencidoAgg._sum.saldo ?? 0),
 cxpTotal: Number(cxpAgg._sum.saldo ?? 0),
 cxpVencido: Number(cxpVencidoAgg._sum.saldo ?? 0),
 ventasMes,
 ventasAnterior,
 variacionVentas,
 gastosMes,
 itbisCobrado,
 itbisPagado,
 itbisNeto: itbisCobrado - itbisPagado,
 utilidadBruta: Number(ventasMesAgg._sum.subtotal ?? 0) - gastosMes,
 numFacturas,
 numCompras,
 mes,
 año,
 };
}

// CxC AGRUPADA POR CLIENTE 

export async function getCxCPorCliente(opts: {
 mostrarTodas?: boolean;
 busqueda?: string;
}) {
 const { mostrarTodas = false, busqueda = "" } = opts;

 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const where: any = {
 ...(mostrarTodas ? {} : { estado: { not: "PAGADO" } }),
 ...(busqueda
 ? {
 OR: [
 { cliente: { nombre: { contains: busqueda, mode: "insensitive" } } },
 { venta: { numero: { contains: busqueda, mode: "insensitive" } } },
 ],
 }
 : {}),
 };

 const cxcs = await prisma.cuentaPorCobrar.findMany({
 where,
 include: {
 cliente: { select: { id: true, nombre: true, rnc: true } },
 venta: { select: { id: true, numero: true, fechaEmision: true, ncf: true } },
 },
 orderBy: { fechaVencimiento: "asc" },
 });

 // Agrupar por cliente en JS
 const mapa = new Map<string, {
 cliente: { id: string; nombre: string; rnc: string | null };
 totalSaldo: number;
 totalVencido: number;
 facturas: Array<{
 id: string;
 ventaId: string;
 numero: string;
 monto: number;
 saldo: number;
 fechaVencimiento: Date;
 fechaEmision: Date | null;
 ncf: string | null;
 estado: string;
 diasVencida: number;
 diasRestantes: number;
 }>;
 }>();

 for (const c of cxcs) {
 const dias = diasVencida(c.fechaVencimiento);
 const key = c.clienteId;

 if (!mapa.has(key)) {
 mapa.set(key, {
 cliente: c.cliente,
 totalSaldo: 0,
 totalVencido: 0,
 facturas: [],
 });
 }
 const grupo = mapa.get(key)!;
 const saldo = Number(c.saldo);
 grupo.totalSaldo += saldo;
 if (dias > 0) grupo.totalVencido += saldo;
 const hoy = new Date(); hoy.setHours(0,0,0,0);
 const venc = new Date(c.fechaVencimiento); venc.setHours(0,0,0,0);
 const diffMs = venc.getTime() - hoy.getTime();
 const diasRestantes = Math.round(diffMs / 86400000);
 grupo.facturas.push({
 id: c.id,
 ventaId: c.ventaId,
 numero: c.venta.numero,
 monto: Number(c.monto),
 saldo,
 fechaVencimiento: c.fechaVencimiento,
 fechaEmision: c.venta.fechaEmision ?? null,
 ncf: c.venta.ncf ?? null,
 estado: c.estado,
 diasVencida: dias,
 diasRestantes,
 });
 }

 // Convertir a array ordenado por deuda mayor primero
 return Array.from(mapa.values()).sort((a, b) => b.totalSaldo - a.totalSaldo);
}

// CxP AGRUPADA POR SUPLIDOR 

export async function getCxPPorSuplidor(opts: {
 mostrarTodas?: boolean;
 busqueda?: string;
}) {
 const { mostrarTodas = false, busqueda = "" } = opts;

 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const where: any = {
 ...(mostrarTodas ? {} : { estado: { not: "PAGADO" } }),
 ...(busqueda
 ? {
 OR: [
 { suplidor: { nombre: { contains: busqueda, mode: "insensitive" } } },
 { compra: { numero: { contains: busqueda, mode: "insensitive" } } },
 ],
 }
 : {}),
 };

 const cxps = await prisma.cuentaPorPagar.findMany({
 where,
 include: {
 suplidor: { select: { id: true, nombre: true, rnc: true } },
 compra: { select: { id: true, numero: true, fechaFactura: true, ncf: true, noFacturaSuplidor: true } },
 },
 orderBy: { fechaVencimiento: "asc" },
 });

 const mapa = new Map<string, {
 suplidor: { id: string; nombre: string; rnc: string | null };
 totalSaldo: number;
 totalVencido: number;
 compras: Array<{
 id: string;
 compraId: string;
 numero: string;
 monto: number;
 saldo: number;
 fechaVencimiento: Date;
 fechaFactura: Date | null;
 ncf: string | null;
 noFacturaSuplidor: string | null;
 estado: string;
 diasVencida: number;
 diasRestantes: number;
 }>;
 }>();

 for (const c of cxps) {
 const dias = diasVencida(c.fechaVencimiento);
 const key = c.suplidorId;

 if (!mapa.has(key)) {
 mapa.set(key, {
 suplidor: c.suplidor,
 totalSaldo: 0,
 totalVencido: 0,
 compras: [],
 });
 }
 const grupo = mapa.get(key)!;
 const saldo = Number(c.saldo);
 grupo.totalSaldo += saldo;
 if (dias > 0) grupo.totalVencido += saldo;
 const hoyP = new Date(); hoyP.setHours(0,0,0,0);
 const vencP = new Date(c.fechaVencimiento); vencP.setHours(0,0,0,0);
 const diasRestantesP = Math.round((vencP.getTime() - hoyP.getTime()) / 86400000);
 grupo.compras.push({
 id: c.id,
 compraId: c.compraId,
 numero: c.compra.numero,
 monto: Number(c.monto),
 saldo,
 fechaVencimiento: c.fechaVencimiento,
 fechaFactura: c.compra.fechaFactura ?? null,
 ncf: c.compra.ncf ?? null,
 noFacturaSuplidor: c.compra.noFacturaSuplidor ?? null,
 estado: c.estado,
 diasVencida: dias,
 diasRestantes: diasRestantesP,
 });
 }

 return Array.from(mapa.values()).sort((a, b) => b.totalSaldo - a.totalSaldo);
}

// ANALÍTICAS — P&L MENSUAL
//
// Devuelve por mes: ventas netas SIN ITBIS (subtotal — el ITBIS es un pasivo
// fiscal recaudado para la DGII, no ingreso propio), costo de lo vendido,
// ganancia bruta, gastos operativos y ganancia neta.
//
// Revenue = SUM(dv.subtotal) — base sin ITBIS (lo que realmente le pertenece al negocio)
// COGS = cantidad × COALESCE(costoAlVender, costoPromedio)
//        costoAlVender es el snapshot del costo en el momento de facturar (inmutable).
//        Si no existe (ventas anteriores), se usa costoPromedio actual como fallback.
//        Si el producto es fraccionado, se divide entre factorFraccion.
//
export async function getResumenMensualPL(año: number) {
 type VRow = { mes: number; ventas: string; cogs: string; num: string };
 type GRow = { mes: number; gastos: string };

 const [ventaRows, gastoRows] = await Promise.all([
 // Ventas CON ITBIS (total facturado al cliente) + COGS con costoPromedio
 // Revenue = subtotal + itbis (dinero real recibido del cliente)
 // COGS = cantidad × costoPromedio; si fraccionado ÷ factorFraccion
 prisma.$queryRaw<VRow[]>` SELECT
 EXTRACT(MONTH FROM v."createdAt")::int AS mes,
 SUM(dv.subtotal + dv.itbis)::text AS ventas,
 SUM(
 CASE
 WHEN p."esFraccionable" = true
 AND p."factorFraccion" IS NOT NULL
 AND p."factorFraccion" > 0
 AND (
 -- Datos nuevos: unidad explícita diferente a la base
 (dv.unidad IS NOT NULL AND dv.unidad <> p."unidadMedida")
 OR
 -- Datos viejos (unidad NULL): fraccionado si precioFinal < precioVenta
 (dv.unidad IS NULL AND dv."precioFinal" < p."precioVenta")
 )
 THEN dv.cantidad * p."costoPromedio" / p."factorFraccion"
 ELSE dv.cantidad * p."costoPromedio"
 END
 )::text AS cogs,
 COUNT(DISTINCT v.id)::text AS num
 FROM ventas v
 JOIN detalles_venta dv ON dv."ventaId" = v.id
 JOIN productos p ON p.id = dv."productoId" WHERE v.tipo = 'FACTURADA' AND EXTRACT(YEAR FROM v."createdAt") = ${año}
 GROUP BY mes
 ORDER BY mes
 `,
 // Gastos operativos por mes
 prisma.$queryRaw<GRow[]>` SELECT
 EXTRACT(MONTH FROM fecha)::int AS mes,
 SUM(monto)::text AS gastos
 FROM gastos
 WHERE EXTRACT(YEAR FROM fecha) = ${año}
 GROUP BY mes
 ORDER BY mes
 `,
 ]);

 return Array.from({ length: 12 }, (_, i) => {
 const m = i + 1;
 const vr = ventaRows.find((r) => r.mes === m);
 const gr = gastoRows.find((r) => r.mes === m);

 const ventas = Number(vr?.ventas ?? 0);
 const cogs = Number(vr?.cogs ?? 0);
 const gastos = Number(gr?.gastos ?? 0);
 const gananciaBruta = ventas - cogs;
 const gananciaNeta = gananciaBruta - gastos;
 const num = Number(vr?.num ?? 0);

 return {
 mes: m,
 ventas,
 cogs,
 gastos,
 gananciaBruta,
 gananciaNeta,
 margenBruto: ventas > 0 ? (gananciaBruta / ventas) * 100 : 0,
 margenNeto: ventas > 0 ? (gananciaNeta / ventas) * 100 : 0,
 num,
 };
 });
}

// ANALÍTICAS — VENTAS POR CATEGORÍA CON MÁRGENES 
//
// Revenue = subtotal + itbis (total cobrado al cliente, igual que en factura)
// COGS = cantidad × costoPromedio; si la venta es en fracción (dv.unidad ≠
// p.unidadMedida) se divide entre factorFraccion.
// Esto hace que comprar a 490 y vender a 560 muestre margen 12.5%
// sin importar el ITBIS ni el tipo de unidad.
//
export async function getVentasPorCategoria(opts: {
 año: number;
 mes?: number;
}) {
 const { año, mes } = opts;

 const inicio = mes ? inicioMes(año, mes) : new Date(año, 0, 1);
 const fin = mes ? finMes(año, mes) : new Date(año, 11, 31, 23, 59, 59);

 const detalles = await prisma.detalleVenta.findMany({
 where: {
 venta: {
 tipo: "FACTURADA",
 createdAt: { gte: inicio, lte: fin },
 },
 },
 select: {
 subtotal: true,
 itbis: true,
 unidad: true,
 precioFinal: true,
 cantidad: true,
 descuento: true,
 producto: {
 select: {
 costoPromedio: true,
 precioVenta: true,
 esFraccionable: true,
 factorFraccion: true,
 unidadMedida: true,
 categoria: {
 select: { nombre: true, codigo: true },
 },
 },
 },
 },
 });

 const mapa = new Map<string, {
 categoria: string;
 codigo: string;
 ventas: number; // subtotal sin ITBIS — ingreso real del negocio
 cogs: number; // costo real de lo vendido
 cantLineas: number;
 }>();

 for (const d of detalles) {
 const cat = d.producto.categoria.nombre;
 const key = cat;

 // Revenue = subtotal + itbis (total facturado al cliente, dinero real recibido)
 const ventas = Number(d.subtotal) + Number(d.itbis);

 // COGS: costoPromedio actual (costoAlVender se activará tras migrar el servidor)
 const cantidad = Number(d.cantidad);
 const costo = Number(d.producto.costoPromedio);

 const factor = d.producto.factorFraccion != null ? Number(d.producto.factorFraccion) : 0;
 const precioFinal = Number(d.precioFinal);
 const precioVenta = Number(d.producto.precioVenta);

 const isFraccionada =
 d.producto.esFraccionable &&
 factor > 0 &&
 (
 // Datos nuevos: unidad explícita diferente a la base
 (d.unidad != null && d.unidad !== d.producto.unidadMedida)
 ||
 // Datos viejos (unidad null): fraccionado si precioFinal < precioVenta
 (d.unidad == null && precioVenta > 0 && precioFinal < precioVenta)
 );

 const cogs = isFraccionada
 ? cantidad * costo / factor
 : cantidad * costo;

 if (!mapa.has(key)) {
 mapa.set(key, {
 categoria: cat,
 codigo: d.producto.categoria.codigo,
 ventas: 0,
 cogs: 0,
 cantLineas: 0,
 });
 }
 const g = mapa.get(key)!;
 g.ventas += ventas;
 g.cogs += cogs;
 g.cantLineas += 1;
 }

 return Array.from(mapa.values())
 .map((g) => ({
 ...g,
 ganancia: g.ventas - g.cogs,
 margen: g.ventas > 0 ? ((g.ventas - g.cogs) / g.ventas) * 100 : 0,
 }))
 .sort((a, b) => b.ventas - a.ventas);
}

// IMPUESTOS — RESUMEN ITBIS 

export async function getResumenITBIS(opts: { año: number; mes: number }) {
 const { año, mes } = opts;
 const inicio = inicioMes(año, mes);
 const fin = finMes(año, mes);

 const [ventasITBIS, comprasITBIS] = await Promise.all([
 // ITBIS cobrado en ventas (desglosado por factura)
 prisma.venta.findMany({
 where: {
 tipo: "FACTURADA",
 createdAt: { gte: inicio, lte: fin },
 itbis: { gt: 0 },
 },
 select: {
 id: true,
 numero: true,
 createdAt: true,
 subtotal: true,
 itbis: true,
 total: true,
 tipoNcf: true,
 ncf: true,
 cliente: { select: { nombre: true, rnc: true } },
 },
 orderBy: { createdAt: "asc" },
 }),
 // ITBIS pagado en compras (desglosado por compra)
 prisma.compra.findMany({
 where: {
 fechaFactura: { gte: inicio, lte: fin },
 itbis: { gt: 0 },
 },
 select: {
 id: true,
 numero: true,
 fechaFactura: true,
 subtotal: true,
 itbis: true,
 total: true,
 tipoNcfCompra: true,
 ncf: true,
 suplidor: { select: { nombre: true, rnc: true } },
 },
 orderBy: { fechaFactura: "asc" },
 }),
 ]);

 const totalCobrado = ventasITBIS.reduce((s, v) => s + Number(v.itbis), 0);
 const totalPagado = comprasITBIS.reduce((s, c) => s + Number(c.itbis), 0);

 return {
 totalCobrado,
 totalPagado,
 neto: totalCobrado - totalPagado,
 ventas: ventasITBIS.map((v) => ({
 id: v.id,
 numero: v.numero,
 fecha: v.createdAt,
 subtotal: Number(v.subtotal),
 itbis: Number(v.itbis),
 total: Number(v.total),
 ncf: v.ncf,
 tipo: v.tipoNcf,
 cliente: v.cliente,
 })),
 compras: comprasITBIS.map((c) => ({
 id: c.id,
 compraId: c.id, // alias for link
 numero: c.numero,
 fecha: c.fechaFactura,
 subtotal: Number(c.subtotal),
 itbis: Number(c.itbis),
 total: Number(c.total),
 ncf: c.ncf,
 tipo: c.tipoNcfCompra,
 suplidor: c.suplidor,
 })),
 };
}

// ESTADO DE CUENTA POR CLIENTE 
//
// Devuelve todas las CxC pendientes (y parcialmente pagadas) de un cliente.
// El bucket de aging se basa en la EDAD de la factura (días desde fechaEmision),
// no en la fecha de vencimiento. Así una factura de 2 días siempre cae en 0-30
// sin importar el plazo de crédito del cliente.
//
export async function getEstadoCuenta(clienteId: string, incluirPagadas = false) {
 const [cliente, cxcs, ncsCliente] = await Promise.all([
 prisma.contacto.findUnique({
 where: { id: clienteId },
 select: {
 id: true,
 nombre: true,
 nombreLegal: true,
 rnc: true,
 telefono: true,
 email: true,
 credito: true,
 limiteCredito: true,
 saldoFavor: true,
 },
 }),
 prisma.cuentaPorCobrar.findMany({
 where: {
 clienteId,
 ...(incluirPagadas ? {} : { estado: { not: "PAGADO" } }),
 },
 include: {
 venta: {
 select: {
 id: true,
 numero: true,
 createdAt: true,
 ncf: true,
 tipoNcf: true,
 pagosRecibidos: { select: { metodo: true, monto: true, referencia: true }, where: { metodo: "NC" } },
 },
 },
 },
 orderBy: { fechaEmision: "asc" },
 }),
 prisma.notaCredito.findMany({
 where: { clienteId, estado: "PENDIENTE" },
 orderBy: { createdAt: "asc" },
 include: { venta: { select: { numero: true } } },
 }),
 ]);

 if (!cliente) return null;

 const creditoDias: Record<string, number> = {
 CONTADO: 0,
 DIAS_30: 30,
 DIAS_45: 45,
 DIAS_60: 60,
 };
 const diasCredito = creditoDias[cliente.credito] ?? 0;

 const hoy = new Date();

 const facturas = cxcs.map((c) => {
 const diasDesdeVto = Math.floor(
 (hoy.getTime() - new Date(c.fechaVencimiento).getTime()) / 86400000
 );
 // Bucket de aging basado en la EDAD de la factura (días desde emisión).
 // Una factura de 2 días siempre va en 0-30, sin importar el plazo de crédito.
 // El flag vencida sigue basado en diasDesdeVto > 0 (¿ya pasó la fecha de pago?).
 const diasDesdeEmision = Math.max(
 0,
 Math.floor((hoy.getTime() - new Date(c.fechaEmision).getTime()) / 86400000)
 );
 let bucket: "0-30" | "30-60" | "60-90" | "90+";
 if (diasDesdeEmision <= 30) bucket = "0-30";
 else if (diasDesdeEmision <= 60) bucket = "30-60";
 else if (diasDesdeEmision <= 90) bucket = "60-90";
 else bucket = "90+";

 const vencida = diasDesdeVto > 0;

 // Pagos con NC registrados en PagoVenta
 const pagosNc = c.venta.pagosRecibidos.map((p: { monto: unknown; referencia: string | null }) => ({
 monto: Number(p.monto),
 referencia: p.referencia ?? null,
 }));
 const totalPagadoConNc = pagosNc.reduce((s: number, p: { monto: number }) => s + p.monto, 0);

 return {
 id: c.id,
 ventaId: c.ventaId,
 numero: c.venta.numero,
 ncf: c.venta.ncf ?? null,
 tipoNcf: c.venta.tipoNcf ?? null,
 fechaFactura: c.venta.createdAt,
 fechaEmision: c.fechaEmision,
 fechaVencimiento: c.fechaVencimiento,
 monto: Number(c.monto),
 montoPagado: Number(c.montoPagado),
 saldo: Number(c.saldo),
 estado: c.estado,
 diasDesdeVto,
 bucket,
 vencida,
 pagosNc,
 totalPagadoConNc,
 };
 });

 // Totales por bucket
 const totBucket = (b: string) => facturas.filter((f) => f.bucket === b).reduce((s, f) => s + f.saldo, 0);

 const notasCredito = ncsCliente.map(nc => ({
 id: nc.id,
 numero: nc.numero,
 monto: Number(nc.monto),
 montoRestante: Number(nc.montoRestante),
 ventaNumero: nc.venta.numero,
 motivo: nc.motivo,
 createdAt: nc.createdAt,
 }));

 return {
 cliente: { ...cliente, diasCredito, saldoFavor: Number(cliente.saldoFavor ?? 0) },
 facturas,
 notasCredito,
 totales: {
 "0-30": totBucket("0-30"),
 "30-60": totBucket("30-60"),
 "60-90": totBucket("60-90"),
 "90+": totBucket("90+"),
 total: facturas.reduce((s, f) => s + f.saldo, 0),
 vencido: facturas.filter((f) => f.vencida).reduce((s, f) => s + f.saldo, 0),
 },
 generadoEn: hoy,
 };
}

// ANALÍTICAS — VENTAS POR CLIENTE 
//
// Por cada cliente: total vendido (subtotal sin ITBIS), COGS corregido para
// productos fraccionados y ganancia / margen derivados.
//
export async function getVentasPorCliente(opts: { año: number; mes?: number; limit?: number }) {
 const { año, mes, limit = 10 } = opts;
 const inicio = mes ? inicioMes(año, mes) : new Date(año, 0, 1);
 const fin = mes ? finMes(año, mes) : new Date(año, 11, 31, 23, 59, 59);

 type Row = {
 clienteId: string;
 nombre: string;
 rnc: string | null;
 ventas: string;
 totalFacturado: string;
 cogs: string;
 facturas: string;
 };

 const rows = await prisma.$queryRaw<Row[]>` SELECT
 c.id AS "clienteId",
 c.nombre,
 c.rnc,
 SUM(dv.subtotal)::text AS ventas,
 SUM(dv.subtotal + dv.itbis)::text AS "totalFacturado",
 SUM(
 CASE
 WHEN p."esFraccionable" = true
 AND p."factorFraccion" IS NOT NULL
 AND p."factorFraccion" > 0
 AND (
 (dv.unidad IS NOT NULL AND dv.unidad <> p."unidadMedida")
 OR (dv.unidad IS NULL AND dv."precioFinal" < p."precioVenta")
 )
 THEN dv.cantidad * p."costoPromedio" / p."factorFraccion"
 ELSE dv.cantidad * p."costoPromedio"
 END
 )::text AS cogs,
 COUNT(DISTINCT v.id)::text AS facturas
 FROM ventas v
 JOIN contactos c ON c.id = v."clienteId" JOIN detalles_venta dv ON dv."ventaId" = v.id
 JOIN productos p ON p.id = dv."productoId" WHERE v.tipo = 'FACTURADA' AND v."createdAt" >= ${inicio}
 AND v."createdAt" <= ${fin}
 GROUP BY c.id, c.nombre, c.rnc
 ORDER BY SUM(dv.subtotal + dv.itbis) DESC
 LIMIT ${limit}
 `;

 return rows.map((r) => {
 const ventas = Number(r.totalFacturado); // con ITBIS — dinero real recibido
 const totalFacturado = Number(r.totalFacturado);
 const cogs = Number(r.cogs);
 return {
 clienteId: r.clienteId,
 nombre: r.nombre,
 rnc: r.rnc,
 ventas,
 totalFacturado,
 cogs,
 ganancia: ventas - cogs,
 margen: ventas > 0 ? ((ventas - cogs) / ventas) * 100 : 0,
 facturas: Number(r.facturas),
 };
 });
}

// ANALÍTICAS — TOP PRODUCTOS 
//
// Los N productos más vendidos en el período, con COGS y margen real.
//
export async function getTopProductos(opts: { año: number; mes?: number; limit?: number }) {
 const { año, mes, limit = 10 } = opts;
 const inicio = mes ? inicioMes(año, mes) : new Date(año, 0, 1);
 const fin = mes ? finMes(año, mes) : new Date(año, 11, 31, 23, 59, 59);

 type Row = {
 productoId: string;
 codigo: string;
 nombre: string;
 categoria: string;
 unidad: string;
 ventas: string;       // subtotal sin ITBIS — base para ganancia
 totalFacturado: string; // subtotal + itbis — lo que aparece en facturas
 cogs: string;
 cantidad: string;     // siempre en unidad base (fraccionadas ÷ factorFraccion)
 facturas: string;
 };

 const rows = await prisma.$queryRaw<Row[]>` SELECT
 p.id AS "productoId",
 p.codigo,
 p.nombre,
 cat.nombre AS categoria,
 p."unidadMedida" AS unidad,
 SUM(dv.subtotal)::text AS ventas,
 SUM(dv.subtotal + dv.itbis)::text AS "totalFacturado",
 SUM(
 CASE
 WHEN p."esFraccionable" = true
 AND p."factorFraccion" IS NOT NULL
 AND p."factorFraccion" > 0
 AND (
 (dv.unidad IS NOT NULL AND dv.unidad <> p."unidadMedida")
 OR (dv.unidad IS NULL AND dv."precioFinal" < p."precioVenta")
 )
 THEN dv.cantidad * p."costoPromedio" / p."factorFraccion"
 ELSE dv.cantidad * p."costoPromedio"
 END
 )::text AS cogs,
 SUM(
 CASE
 WHEN p."esFraccionable" = true
 AND p."factorFraccion" IS NOT NULL
 AND p."factorFraccion" > 0
 AND (
 (dv.unidad IS NOT NULL AND dv.unidad <> p."unidadMedida")
 OR (dv.unidad IS NULL AND dv."precioFinal" < p."precioVenta")
 )
 THEN dv.cantidad / p."factorFraccion"
 ELSE dv.cantidad
 END
 )::text AS cantidad,
 COUNT(DISTINCT v.id)::text AS facturas
 FROM detalles_venta dv
 JOIN ventas v ON v.id = dv."ventaId" JOIN productos p ON p.id = dv."productoId" JOIN categorias cat ON cat.id = p."categoriaId" WHERE v.tipo = 'FACTURADA' AND v."createdAt" >= ${inicio}
 AND v."createdAt" <= ${fin}
 GROUP BY p.id, p.codigo, p.nombre, cat.nombre, p."unidadMedida"
 ORDER BY SUM(dv.subtotal + dv.itbis) DESC
 LIMIT ${limit}
 `;

 return rows.map((r) => {
 const ventas = Number(r.ventas);         // sin ITBIS
 const totalFacturado = Number(r.totalFacturado); // con ITBIS — para mostrar en UI
 const cogs = Number(r.cogs);
 return {
 productoId: r.productoId,
 codigo: r.codigo,
 nombre: r.nombre,
 categoria: r.categoria,
 unidad: r.unidad,
 ventas,
 totalFacturado,
 cogs,
 ganancia: ventas - cogs,  // ganancia real = subtotal (sin ITBIS) − costo
 margen: ventas > 0 ? ((ventas - cogs) / ventas) * 100 : 0,
 cantidad: Number(r.cantidad), // en unidad base (fraccionadas ya convertidas)
 facturas: Number(r.facturas),
 };
 });
}

// ANALÍTICAS — MÉTODOS DE PAGO 
//
// Agrupa los pagos recibidos por tipo de medio: EFECTIVO, TARJETA,
// TRANSFERENCIA, CHEQUE. Para TARJETA descuenta la comisión bancaria
// configurada en la clave "comision_tarjeta" de la tabla Configuracion
// (por defecto 3.0 %).
//
export async function getResumenPagos(opts: { año: number; mes?: number }) {
 const { año, mes } = opts;
 const inicio = mes ? inicioMes(año, mes) : new Date(año, 0, 1);
 const fin = mes ? finMes(año, mes) : new Date(año, 11, 31, 23, 59, 59);

 const [pagos, comisionConfig] = await Promise.all([
 prisma.pagoVenta.findMany({
 where: {
 fecha: { gte: inicio, lte: fin },
 venta: { tipo: "FACTURADA" },
 },
 select: { metodo: true, monto: true },
 }),
 prisma.configuracion.findUnique({ where: { clave: "comision_tarjeta" } }),
 ]);

 const comisionPct = comisionConfig ? parseFloat(comisionConfig.valor) : 3.0;

 // Agrupar por método
 const mapa = new Map<string, number>();
 for (const p of pagos) {
 const k = p.metodo.toUpperCase();
 mapa.set(k, (mapa.get(k) ?? 0) + Number(p.monto));
 }

 const tarjeta = mapa.get("TARJETA") ?? 0;
 const comision = tarjeta * (comisionPct / 100);
 // Excluir NC (nota de crédito) del total — no es efectivo recibido, es un ajuste contable
 const total = Array.from(mapa.entries())
 .filter(([k]) => k !== "NC")
 .reduce((s, [, v]) => s + v, 0);

 const METODOS: Array<{ key: string; label: string; icon: string }> = [
 { key: "EFECTIVO", label: "Efectivo", icon: "" },
 { key: "TARJETA", label: "Tarjeta", icon: "" },
 { key: "TRANSFERENCIA", label: "Transferencia", icon: "" },
 { key: "CHEQUE", label: "Cheque", icon: "" },
 ];

 return {
 porMetodo: METODOS.map((m) => ({
 metodo: m.key,
 label: m.label,
 icon: m.icon,
 monto: mapa.get(m.key) ?? 0,
 // comisión solo para tarjeta
 comision: m.key === "TARJETA" ? comision : 0,
 neto: m.key === "TARJETA" ? tarjeta - comision : (mapa.get(m.key) ?? 0),
 })).filter((m) => m.monto > 0),
 total,
 comisionPct,
 totalComisiones: comision,
 totalNeto: total - comision,
 };
}

// GASTOS — RESUMEN POR CATEGORÍA 

export async function getResumenGastos(opts: { año: number; mes?: number }) {
 const { año, mes } = opts;
 const inicio = mes ? inicioMes(año, mes) : new Date(año, 0, 1);
 const fin = mes ? finMes(año, mes) : new Date(año, 11, 31, 23, 59, 59);

 const gastos = await prisma.gasto.findMany({
 where: { fecha: { gte: inicio, lte: fin } },
 include: { categoria: true },
 orderBy: { fecha: "desc" },
 });

 // Por categoría
 const mapa = new Map<string, { cat: string; total: number; count: number }>();
 for (const g of gastos) {
 const key = g.categoria.nombre;
 if (!mapa.has(key)) mapa.set(key, { cat: key, total: 0, count: 0 });
 const entry = mapa.get(key)!;
 entry.total += Number(g.monto);
 entry.count += 1;
 }

 const totalGeneral = gastos.reduce((s, g) => s + Number(g.monto), 0);
 const porCategoria = Array.from(mapa.values())
 .sort((a, b) => b.total - a.total)
 .map((c) => ({ ...c, pct: totalGeneral > 0 ? (c.total / totalGeneral) * 100 : 0 }));

 // Mensual (si se pidió el año completo, agrupar por mes)
 type MRow = { mes: number; total: string };
 const mensual = mes
 ? []
 : await prisma.$queryRaw<MRow[]>` SELECT EXTRACT(MONTH FROM fecha)::int AS mes, SUM(monto)::text AS total
 FROM gastos
 WHERE EXTRACT(YEAR FROM fecha) = ${año}
 GROUP BY mes
 ORDER BY mes
 `;

 return {
 totalGeneral,
 porCategoria,
 mensual: Array.from({ length: 12 }, (_, i) => {
 const row = (mensual as MRow[]).find((r) => r.mes === i + 1);
 return { mes: i + 1, total: Number(row?.total ?? 0) };
 }),
 detalle: gastos.map((g) => ({
 id: g.id,
 numero: g.numero,
 categoria: g.categoria.nombre,
 descripcion: g.descripcion,
 monto: Number(g.monto),
 fecha: g.fecha,
 metodo: g.metodo,
 })),
 };
}

// Pago masivo CxC 

export interface PagoMasivoCxCItem {
 cxcId: string;
 ventaId: string;
 monto: number; // saldo a pagar
}

export async function pagarMultiplesCxC(
 pagos: PagoMasivoCxCItem[],
 metodo: string,
 fecha: string,
 referencia?: string,
 notas?: string,
) {
 if (!pagos.length) return { error: "No hay facturas seleccionadas" };
 if (!metodo) return { error: "Selecciona la forma de pago" };
 if (!fecha) return { error: "Indica la fecha de pago" };

 const fechaDate = new Date(fecha);

 for (const p of pagos) {
 await prisma.$transaction(async (tx) => {
 // Registrar pago en la venta
 await tx.pagoVenta.create({
 data: { ventaId: p.ventaId, monto: p.monto, fecha: fechaDate, metodo, referencia: referencia || null },
 });

 // Actualizar estadoPago de la venta
 const venta = await tx.venta.findUnique({
 where: { id: p.ventaId },
 select: { total: true, pagosRecibidos: { select: { monto: true } } },
 });
 if (venta) {
 const totalPagado = venta.pagosRecibidos.reduce((s, pv) => s + Number(pv.monto), 0);
 const saldoFinal = Number(venta.total) - totalPagado;
 const estadoPago = saldoFinal <= 0 ? "PAGADO" : totalPagado > 0 ? "PAGADO_PARCIAL" : "PENDIENTE";
 await tx.venta.update({ where: { id: p.ventaId }, data: { estadoPago: estadoPago as never } });
 }

 // Actualizar CxC
 const cxc = await tx.cuentaPorCobrar.findUnique({ where: { id: p.cxcId } });
 if (cxc) {
 const nuevoPagado = Number(cxc.montoPagado) + p.monto;
 const nuevoSaldo = Math.max(0, Number(cxc.monto) - nuevoPagado);
 await tx.cuentaPorCobrar.update({
 where: { id: p.cxcId },
 data: {
 montoPagado: nuevoPagado,
 saldo: nuevoSaldo,
 estado: nuevoSaldo <= 0 ? "PAGADO" : nuevoPagado > 0 ? "PAGADO_PARCIAL" : "PENDIENTE",
 },
 });
 }
 });

 revalidatePath(`/ventas/${p.ventaId}`);
 }

 revalidatePath("/contabilidad/cxc");
 revalidatePath("/ventas");
 return { ok: true };
}

// Pago masivo CxP 

export interface PagoMasivoCxPItem {
 cxpId: string;
 compraId: string;
 monto: number; // saldo a pagar
}

export async function pagarMultiplesCxP(
 pagos: PagoMasivoCxPItem[],
 metodo: string,
 fecha: string,
 referencia?: string,
 notas?: string,
) {
 if (!pagos.length) return { error: "No hay compras seleccionadas" };
 if (!metodo) return { error: "Selecciona la forma de pago" };
 if (!fecha) return { error: "Indica la fecha de pago" };

 const fechaDate = new Date(fecha);

 for (const p of pagos) {
 await prisma.$transaction(async (tx) => {
 // Registrar pago en la compra
 await tx.pagoCompra.create({
 data: { compraId: p.compraId, monto: p.monto, fecha: fechaDate, metodo, referencia: referencia || null, notas: notas || null },
 });

 // Actualizar estadoPago de la compra
 const compra = await tx.compra.findUnique({
 where: { id: p.compraId },
 select: { total: true, pagos: { select: { monto: true } } },
 });
 if (compra) {
 const totalPagado = compra.pagos.reduce((s, pv) => s + Number(pv.monto), 0);
 const estadoPago = totalPagado >= Number(compra.total) ? "PAGADO" : "PAGADO_PARCIAL";
 await tx.compra.update({ where: { id: p.compraId }, data: { estadoPago: estadoPago as never } });
 }

 // Actualizar CxP
 const cxp = await tx.cuentaPorPagar.findUnique({ where: { id: p.cxpId } });
 if (cxp) {
 const nuevoPagado = Number(cxp.montoPagado) + p.monto;
 const nuevoSaldo = Math.max(0, Number(cxp.monto) - nuevoPagado);
 await tx.cuentaPorPagar.update({
 where: { id: p.cxpId },
 data: {
 montoPagado: nuevoPagado,
 saldo: nuevoSaldo,
 estado: nuevoSaldo <= 0 ? "PAGADO" : nuevoPagado > 0 ? "PAGADO_PARCIAL" : "PENDIENTE",
 },
 });
 }
 });

 revalidatePath(`/compras/${p.compraId}`);
 }

 revalidatePath("/contabilidad/cxp");
 revalidatePath("/compras");
 return { ok: true };
}
