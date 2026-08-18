import { notFound } from "next/navigation";
import { getVenta } from "@/actions/ventas";
import { PrintButtons } from "@/components/nominas/print-buttons";

interface PageProps {
 params: Promise<{ id: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtNum = (n: any) => {
 const [ent, dec] = Number(n).toFixed(2).split(".");
 return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

export default async function ImprimirCotizacionPage({ params }: PageProps) {
 const { id } = await params;
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const v = (await getVenta(id)) as any;
 if (!v) notFound();

 const esCotizacion = v.tipo === "COTIZACION" || v.tipo === "ORDEN_VENTA";
 const titulo = v.tipo === "COTIZACION" ? "COTIZACIÓN" : "ORDEN DE VENTA";
 const fecha = new Date(v.fechaEmision).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" });
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const tieneDescuento = v.detalles.some((d: any) => Number(d.descuento) > 0);

 return (
 <> <PrintButtons /> <p className="no-print text-center text-sm text-gray-500 pt-6 pb-2"> Presiona <strong>Ctrl+P</strong> (Windows) o <strong>+P</strong> (Mac) para imprimir
 </p> <div className="doc-wrap"> <div className="doc"> {/* Encabezado */}
 <div className="doc-header"> <div> <div className="company-name">Ferretería AP</div> <div className="company-sub">Sistema de Gestión Comercial</div> </div> <div className="doc-meta"> <div className="doc-tipo">{titulo}</div> <div className="doc-numero">{v.numero}</div> <div className="doc-fecha">{fecha}</div> </div> </div> {/* Cliente */}
 <div className="section-grid"> <div className="section-box"> <div className="section-label">CLIENTE</div> <div className="section-value-lg">{v.cliente.nombre}</div> {v.cliente.rnc && <div className="section-value">RNC: {v.cliente.rnc}</div>}
 </div> <div className="section-box"> <div className="section-label">CONDICIÓN DE PAGO</div> <div className="section-value"> {v.credito === "CONTADO" ? "Contado" :
 v.credito === "DIAS_30" ? "30 días" :
 v.credito === "DIAS_45" ? "45 días" : "60 días"}
 </div> {v.fechaVencimiento && (
 <><div className="section-label mt-1">VÁLIDA HASTA</div> <div className="section-value"> {new Date(v.fechaVencimiento).toLocaleDateString("es-DO")}
 </div></> )}
 {v.fechaEntrega && (
 <><div className="section-label mt-1">ENTREGA ESTIMADA</div> <div className="section-value"> {new Date(v.fechaEntrega).toLocaleDateString("es-DO")}
 </div></> )}
 </div> </div> {/* Tabla de productos */}
 <table className="prod-table"> <thead> <tr> <th className="th-left">#</th> <th className="th-left">Código</th> <th className="th-left">Descripción</th> <th className="th-right">Cant.</th> <th className="th-right">Precio</th> {tieneDescuento && <th className="th-right">Desc.</th>}
 <th className="th-right">ITBIS</th> <th className="th-right">Subtotal</th> </tr> </thead> <tbody> {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
 {v.detalles.map((d: any, i: number) => (
 <tr key={d.id} className={i % 2 === 0 ? "tr-even" : ""}> <td className="td-num">{i + 1}</td> <td className="td-code">{d.producto.codigo}</td> <td className="td-desc"> {d.descripcion || d.producto.nombre}
 <span className="unit"> / {d.unidad ?? d.producto.unidadMedida}</span> </td> <td className="td-num"> {Number(d.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 })}
 </td> {/* Precio base SIN ITBIS */}
 <td className="td-num">{fmtNum(d.precio)}</td> {tieneDescuento && (
 <td className="td-num"> {Number(d.descuento) > 0 ? `${Number(d.descuento)}%` : "—"}
 </td> )}
 <td className="td-num">{d.exentoItbis ? "—" : fmtNum(d.itbis)}</td> {/* Subtotal = base × qty (sin ITBIS) */}
 <td className="td-num td-bold">{fmtNum(d.subtotal)}</td> </tr> ))}
 </tbody> </table> {/* Totales */}
 <div className="totales"> <div className="total-row"> <span>Subtotal</span> <span>{fmtNum(v.subtotal)}</span> </div> {Number(v.descuento) > 0 && (
 <div className="total-row neg"> <span>Descuento</span> <span>-{fmtNum(v.descuento)}</span> </div> )}
 <div className="total-row"> <span>ITBIS (18%)</span> <span>{fmtNum(v.itbis)}</span> </div> <div className="total-row total-final"> <span>TOTAL RD$</span> <span>{fmtNum(v.total)}</span> </div> </div> {/* Notas */}
 {v.notas && (
 <div className="notas"> <strong>Notas:</strong> {v.notas}
 </div> )}

 {/* Firmas */}
 {!esCotizacion && (
 <div className="firmas"> <div className="firma"> <div className="firma-line" /> <div className="firma-label">Vendedor / Autorizado</div> </div> <div className="firma"> <div className="firma-line" /> <div className="firma-label">Cliente / Recibido conforme</div> </div> </div> )}

 {esCotizacion && (
 <p className="footer-note"> Esta cotización es válida por los días indicados · Precios en RD$ · Sujeto a disponibilidad de inventario
 </p> )}
 </div> </div> <style>{` * { box-sizing: border-box; margin: 0; padding: 0; }
 body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11.5px; color: #111; background: #f5f5f5; }
 .doc-wrap { max-width: 760px; margin: 0 auto; padding: 0 16px 32px; }
 .doc { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 28px 32px 24px; margin-top: 16px; box-shadow: 0 1px 8px rgba(0,0,0,.08); }

 /* Encabezado */
 .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #111; padding-bottom: 14px; margin-bottom: 16px; }
 .company-name { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; line-height: 1; }
 .company-sub { font-size: 10px; color: #888; margin-top: 3px; }
 .doc-meta { text-align: right; }
 .doc-tipo { font-size: 10px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #555; }
 .doc-numero { font-size: 18px; font-weight: 900; line-height: 1.1; }
 .doc-fecha { font-size: 10px; color: #666; margin-top: 3px; }

 /* Secciones info */
 .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
 .section-box { padding: 10px 14px; background: #f8f8f8; border-radius: 5px; border-left: 3px solid #111; }
 .section-label { font-size: 8.5px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 3px; }
 .section-value-lg { font-size: 14px; font-weight: 700; }
 .section-value { font-size: 11.5px; color: #333; }
 .mt-1 { margin-top: 8px; }

 /* Tabla */
 .prod-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
 .th-left, .th-right { padding: 6px 8px; background: #111; color: #fff; font-weight: 700; font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; }
 .th-right { text-align: right; }
 .th-left { text-align: left; }
 .tr-even { background: #f9f9f9; }
 .td-num { text-align: right; padding: 5px 8px; font-family: 'Courier New', monospace; }
 .td-code { padding: 5px 8px; font-family: 'Courier New', monospace; font-size: 10.5px; }
 .td-desc { padding: 5px 8px; }
 .td-bold { font-weight: 700; }
 .unit { color: #888; font-size: 9.5px; }

 /* Totales */
 .totales { display: flex; flex-direction: column; align-items: flex-end; margin-bottom: 16px; }
 .total-row { display: flex; justify-content: space-between; gap: 60px; font-size: 12px; padding: 2.5px 0; min-width: 280px; }
 .total-row span:last-child { font-family: 'Courier New', monospace; }
 .neg { color: #c00; }
 .total-final { font-size: 15px; font-weight: 900; border-top: 2px solid #111; padding-top: 6px; margin-top: 4px; }

 /* Notas */
 .notas { font-size: 10.5px; color: #555; margin-bottom: 16px; padding: 8px 12px; background: #f8f8f8; border-radius: 4px; }

 /* Firmas */
 .firmas { display: flex; gap: 48px; padding-top: 20px; border-top: 1px solid #e5e5e5; margin-top: 16px; }
 .firma { flex: 1; }
 .firma-line { border-bottom: 1px solid #aaa; height: 32px; margin-bottom: 5px; }
 .firma-label { font-size: 10px; color: #888; text-align: center; }
 .footer-note { font-size: 10px; color: #999; text-align: center; margin-top: 16px; border-top: 1px solid #eee; padding-top: 10px; }

 @media print {
 body { background: white; }
 .no-print { display: none !important; }
 .doc-wrap { max-width: 100%; padding: 0; }
 .doc { border: none; border-radius: 0; box-shadow: none; margin: 0; padding: 20px 24px; }
 .th-left, .th-right { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
 }
 `}</style> </> );
}
