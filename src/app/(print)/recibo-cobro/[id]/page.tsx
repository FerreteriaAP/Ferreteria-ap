import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButtons } from "@/components/nominas/print-buttons";

interface PageProps {
 params: Promise<{ id: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtNum = (n: any) => {
 const [ent, dec] = Number(n).toFixed(2).split(".");
 return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

const metodosLabel: Record<string, string> = {
 EFECTIVO: "Efectivo",
 TARJETA: "Tarjeta de crédito/débito",
 TRANSFERENCIA: "Transferencia bancaria",
 CHEQUE: "Cheque",
};

export default async function ReciboCobro({ params }: PageProps) {
 const { id } = await params;

 // 1. Cargar el movimiento con su turno y cajera
 const mov = await prisma.movimientoCaja.findUnique({
 where: { id },
 include: { turno: { include: { usuario: { select: { nombre: true, apellido: true } } } } },
 });
 if (!mov || mov.subTipo !== "COBRO_CXC") notFound();

 // 2. Si tiene CxC asociada, cargarla con cliente y factura
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 let cxc: any = null;
 if (mov.cxcId) {
 cxc = await prisma.cuentaPorCobrar.findUnique({
 where: { id: mov.cxcId },
 include: {
 venta: { select: { numero: true, total: true } },
 cliente: { select: { nombre: true, rnc: true, telefono: true } },
 },
 });
 }

 const fechaPago = new Date(mov.fecha).toLocaleDateString("es-DO", {
 day: "2-digit", month: "long", year: "numeric",
 hour: "2-digit", minute: "2-digit",
 });

 const cajera = `${mov.turno.usuario.nombre} ${mov.turno.usuario.apellido}`.trim();

 // Número de recibo = últimos 8 chars del ID del movimiento (legible)
 const noRecibo = id.slice(-8).toUpperCase();

 return (
 <> <PrintButtons /> <p className="no-print text-center text-sm text-gray-500 pt-6 pb-2"> Presiona <strong>Ctrl+P</strong> (Windows) o <strong>+P</strong> (Mac) para imprimir
 </p> <div className="doc-wrap"> <div className="doc"> {/* Encabezado */}
 <div className="doc-header"> <div> <div className="company-name">Ferretería AP</div> <div className="company-sub">Sistema de Gestión Comercial</div> </div> <div className="doc-meta"> <div className="doc-tipo">RECIBO DE INGRESO</div> <div className="doc-numero">REC-{noRecibo}</div> <div className="doc-fecha">{fechaPago}</div> </div> </div> {/* Datos del cobro */}
 <div className="section-grid"> <div className="section-box"> <div className="section-label">RECIBIDO DE</div> <div className="section-value-lg">{cxc?.cliente?.nombre ?? "—"}</div> {cxc?.cliente?.rnc && (
 <div className="section-value">RNC: {cxc.cliente.rnc}</div> )}
 {cxc?.cliente?.telefono && (
 <div className="section-value">Tel: {cxc.cliente.telefono}</div> )}
 </div> <div className="section-box"> <div className="section-label">REFERENCIA DE FACTURA</div> <div className="section-value-lg">{cxc?.venta?.numero ?? "—"}</div> {cxc?.venta?.total && (
 <> <div className="section-label mt-1">MONTO TOTAL FACTURA</div> <div className="section-value">RD$ {fmtNum(cxc.venta.total)}</div> </> )}
 </div> </div> {/* Detalle del pago */}
 <div className="pago-box"> <div className="pago-row pago-highlight"> <span className="pago-label">Monto recibido</span> <span className="pago-monto">RD$ {fmtNum(mov.monto)}</span> </div> <div className="pago-row"> <span className="pago-label">Forma de pago</span> <span className="pago-value">{metodosLabel[mov.metodo ?? ""] ?? mov.metodo ?? "—"}</span> </div> <div className="pago-row"> <span className="pago-label">Fecha de pago</span> <span className="pago-value">{fechaPago}</span> </div> <div className="pago-row"> <span className="pago-label">Atendido por (cajera)</span> <span className="pago-value">{cajera}</span> </div> {mov.notas && (
 <div className="pago-row"> <span className="pago-label">Notas</span> <span className="pago-value notes">{mov.notas}</span> </div> )}
 </div> {/* Estado de confirmación */}
 <div className={`estado-box ${mov.confirmado ? "confirmado" : "pendiente"}`}> {mov.confirmado
 ? " Cobro confirmado y aplicado a la cuenta" : " Pago registrado — pendiente de confirmación por la administración"}
 </div> {/* Firmas */}
 <div className="firmas"> <div className="firma"> <div className="firma-line" /> <div className="firma-label"> Recibido por
 <br /><strong>{cajera}</strong> </div> </div> <div className="firma"> <div className="firma-line" /> <div className="firma-label"> Entregado por (cliente)
 <br /><strong>{cxc?.cliente?.nombre ?? ""}</strong> </div> </div> </div> <p className="footer-note"> Este recibo acredita el pago parcial o total de la factura indicada. Consérvelo como comprobante.
 </p> </div> </div> <style>{` * { box-sizing: border-box; margin: 0; padding: 0; }
 body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11.5px; color: #111; background: #f5f5f5; }
 .doc-wrap { max-width: 640px; margin: 0 auto; padding: 0 16px 32px; }
 .doc { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 28px 32px 24px; margin-top: 16px; box-shadow: 0 1px 8px rgba(0,0,0,.08); }
 .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #111; padding-bottom: 14px; margin-bottom: 20px; }
 .company-name { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
 .company-sub { font-size: 10px; color: #888; margin-top: 3px; }
 .doc-meta { text-align: right; }
 .doc-tipo { font-size: 10px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #555; }
 .doc-numero { font-size: 18px; font-weight: 900; line-height: 1.1; }
 .doc-fecha { font-size: 10px; color: #666; margin-top: 3px; }
 .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
 .section-box { padding: 10px 14px; background: #f8f8f8; border-radius: 5px; border-left: 3px solid #111; }
 .section-label { font-size: 8.5px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 3px; }
 .section-value-lg { font-size: 14px; font-weight: 700; }
 .section-value { font-size: 11px; color: #333; }
 .mt-1 { margin-top: 8px; }
 .pago-box { border: 1px solid #e5e5e5; border-radius: 6px; overflow: hidden; margin-bottom: 16px; }
 .pago-row { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 14px; border-bottom: 1px solid #f0f0f0; }
 .pago-row:last-child { border-bottom: none; }
 .pago-highlight { background: #f0f7ff; }
 .pago-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #666; }
 .pago-monto { font-size: 22px; font-weight: 900; color: #111; font-family: 'Courier New', monospace; }
 .pago-value { font-size: 12px; font-weight: 500; color: #222; text-align: right; max-width: 60%; }
 .pago-value.notes { font-style: italic; color: #555; font-size: 11px; }
 .estado-box { text-align: center; padding: 8px 14px; border-radius: 5px; font-size: 11px; font-weight: 600; margin-bottom: 20px; }
 .estado-box.confirmado { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
 .estado-box.pendiente { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
 .firmas { display: flex; gap: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5; margin-bottom: 14px; }
 .firma { flex: 1; }
 .firma-line { border-bottom: 1px solid #aaa; height: 36px; margin-bottom: 5px; }
 .firma-label { font-size: 10px; color: #888; text-align: center; }
 .footer-note { font-size: 10px; color: #999; text-align: center; padding-top: 10px; border-top: 1px solid #eee; }
 @media print {
 body { background: white; }
 .no-print { display: none !important; }
 .doc-wrap { max-width: 100%; padding: 0; }
 .doc { border: none; border-radius: 0; box-shadow: none; margin: 0; padding: 20px 24px; }
 }
 `}</style> </> );
}
