import { notFound } from "next/navigation";
import { getReportePrestamos } from "@/actions/caja";
import { getEmpleadosActivos } from "@/actions/caja";
import { prisma } from "@/lib/prisma";

interface PageProps {
 searchParams: Promise<{
 empleadoId?: string;
 desde?: string;
 hasta?: string;
 }>;
}

function primerDiaMes() {
 const d = new Date(); d.setDate(1);
 return d.toISOString().slice(0, 10);
}
function hoy() { return new Date().toISOString().slice(0, 10); }

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fmtFecha(d: Date | string) {
 return new Date(d).toLocaleDateString("es-DO", {
 day: "2-digit", month: "long", year: "numeric",
 });
}

function fmtFechaCorta(d: Date | string) {
 return new Date(d).toLocaleDateString("es-DO", {
 day: "2-digit", month: "short", year: "numeric",
 });
}

export default async function ImprimirPrestamosPdfPage({ searchParams }: PageProps) {
 const params = await searchParams;
 const empleadoId = params.empleadoId ?? "todos";
 const desde = params.desde ?? primerDiaMes();
 const hasta = params.hasta ?? hoy();

 const reporte = await getReportePrestamos({ empleadoId, desde, hasta });
 if (!reporte) notFound();

 // Datos de la empresa desde configuración
 const configs = await prisma.configuracion.findMany({
 where: { clave: { in: ["EMPRESA_NOMBRE", "EMPRESA_RNC", "EMPRESA_TELEFONO"] } },
 });
 const cfg = Object.fromEntries(configs.map(c => [c.clave, c.valor]));
 const empresaNombre = cfg.EMPRESA_NOMBRE ?? "Ferretería AP";
 const empresaRnc = cfg.EMPRESA_RNC ?? "";
 const empresaTel = cfg.EMPRESA_TELEFONO ?? "";

 const hoyStr = fmtFecha(new Date());
 const desdeStr = fmtFechaCorta(desde + "T12:00:00");
 const hastaStr = fmtFechaCorta(hasta + "T12:00:00");

 const unSoloEmpleado = reporte.empleados.length === 1
 ? reporte.empleados[0]
 : null;

 return (
 <> <style>{` @media print {
 @page { size: letter portrait; margin: 1.2cm 1.5cm; }
 .no-print { display: none !important; }
 body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
 }
 body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; background: #fff; margin: 0; padding: 0; }
 .header { border-bottom: 2px solid #F47717; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
 .empresa-nombre { font-size: 18px; font-weight: 700; color: #F47717; }
 .reporte-titulo { font-size: 14px; font-weight: 600; margin-top: 4px; color: #111; }
 .meta { font-size: 10px; color: #666; margin-top: 2px; }
 .periodo-badge { background: #F47717; color: white; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
 .empleado-section { margin-bottom: 20px; page-break-inside: avoid; }
 .empleado-header { background: #f5f5f5; border-left: 4px solid #F47717; padding: 8px 12px; margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; }
 .empleado-nombre { font-weight: 700; font-size: 13px; }
 .empleado-sub { font-size: 10px; color: #666; margin-top: 1px; }
 .empleado-total { font-weight: 700; font-size: 13px; color: #F47717; }
 table { width: 100%; border-collapse: collapse; font-size: 11px; }
 thead tr { background: #111; color: white; }
 thead th { padding: 6px 10px; text-align: left; font-weight: 600; }
 thead th:last-child { text-align: right; }
 tbody tr:nth-child(even) { background: #fafafa; }
 tbody td { padding: 6px 10px; border-bottom: 1px solid #eee; }
 tbody td:last-child { text-align: right; font-family: monospace; }
 tfoot tr { background: #fff3e5; }
 tfoot td { padding: 7px 10px; font-weight: 700; border-top: 2px solid #F47717; }
 tfoot td:last-child { text-align: right; font-family: monospace; color: #F47717; font-size: 12px; }
 .total-general { background: #111; color: white; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border-radius: 4px; margin-top: 16px; }
 .total-general-label { font-size: 13px; font-weight: 700; }
 .total-general-monto { font-size: 15px; font-weight: 700; font-family: monospace; color: #F47717; }
 .firma-section { margin-top: 32px; display: flex; gap: 40px; page-break-inside: avoid; }
 .firma-box { flex: 1; text-align: center; }
 .firma-line { border-top: 1px solid #999; margin-top: 40px; padding-top: 6px; font-size: 10px; color: #555; }
 .pie { font-size: 9px; color: #aaa; text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 8px; }
 .print-btn { position: fixed; top: 16px; right: 16px; background: #F47717; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
 .print-btn:hover { background: #e06615; }
 `}</style> {/* Botón imprimir — solo visible en pantalla */}
 <button className="print-btn no-print" onClick={() => window.print()}> Imprimir / PDF
 </button> {/* Contenido imprimible */}
 <div style={{ maxWidth: 740, margin: "0 auto", padding: "24px 24px 0" }}> {/* Encabezado */}
 <div className="header"> <div> <div className="empresa-nombre">{empresaNombre}</div> {empresaRnc && <div className="meta">RNC: {empresaRnc}</div>}
 {empresaTel && <div className="meta">Tel: {empresaTel}</div>}
 <div className="reporte-titulo">Estado de Préstamos a Empleados</div> <div className="meta"> {unSoloEmpleado
 ? `Empleado: ${unSoloEmpleado.empleado?.nombre} ${unSoloEmpleado.empleado?.apellido}` : "Todos los empleados"}
 </div> </div> <div style={{ textAlign: "right" }}> <div className="periodo-badge">{desdeStr} — {hastaStr}</div> <div className="meta" style={{ marginTop: 8 }}>Emitido: {hoyStr}</div> </div> </div> {/* Sin datos */}
 {reporte.empleados.length === 0 && (
 <p style={{ textAlign: "center", color: "#999", padding: "40px 0" }}> Sin préstamos registrados en el período seleccionado
 </p> )}

 {/* Por empleado */}
 {reporte.empleados.map((grupo) => (
 <div key={grupo.empleado?.id} className="empleado-section"> <div className="empleado-header"> <div> <div className="empleado-nombre"> {grupo.empleado?.nombre} {grupo.empleado?.apellido}
 </div> <div className="empleado-sub"> {grupo.empleado?.cargo} · C.C. {grupo.empleado?.cedula}
 </div> </div> <div className="empleado-total">{fmt(grupo.total)}</div> </div> <table> <thead> <tr> <th style={{ width: 110 }}>Fecha</th> <th>Concepto / Nota</th> <th style={{ width: 130 }}>Monto</th> </tr> </thead> <tbody> {grupo.prestamos.map((p) => (
 <tr key={p.id}> <td style={{ color: "#555" }}>{fmtFechaCorta(p.fecha)}</td> <td>{p.concepto || "Préstamo"}</td> <td>{fmt(p.monto)}</td> </tr> ))}
 </tbody> <tfoot> <tr> <td colSpan={2}> Total — {grupo.empleado?.nombre} {grupo.empleado?.apellido}
 </td> <td>{fmt(grupo.total)}</td> </tr> </tfoot> </table> </div> ))}

 {/* Total general (multi-empleado) */}
 {reporte.empleados.length > 1 && (
 <div className="total-general"> <span className="total-general-label">TOTAL GENERAL DEL PERÍODO</span> <span className="total-general-monto">{fmt(reporte.totalGeneral)}</span> </div> )}

 {/* Firma (solo cuando es un empleado) */}
 {unSoloEmpleado && (
 <div className="firma-section"> <div className="firma-box"> <div className="firma-line"> Firma del Empleado<br /> {unSoloEmpleado.empleado?.nombre} {unSoloEmpleado.empleado?.apellido}
 </div> </div> <div className="firma-box"> <div className="firma-line"> Responsable de Nómina
 </div> </div> <div className="firma-box"> <div className="firma-line"> Administración
 </div> </div> </div> )}

 <div className="pie"> Generado por {empresaNombre} — {hoyStr} · Documento interno, no tiene validez fiscal
 </div> </div> {/* Script para auto-abrir diálogo de impresión */}
 <script dangerouslySetInnerHTML={{ __html: ` document.querySelector('.print-btn').addEventListener('click', function() { window.print(); });
 `}} /> </> );
}
