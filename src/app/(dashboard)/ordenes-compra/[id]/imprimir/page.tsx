import { notFound } from "next/navigation";
import { getOrdenCompra } from "@/actions/ordenes-compra";
import { marcarOrdenEnviadaAlImprimir } from "@/actions/ordenes-compra";
import { PrintButtons } from "@/components/nominas/print-buttons";

interface PageProps {
 params: Promise<{ id: string }>;
}

const fmt = (n: number | null | undefined) => n == null ? "0.00" : Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: Date | null | undefined) => d == null ? "—" : new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" });

export default async function ImprimirOrdenCompraPage({ params }: PageProps) {
 const { id } = await params;
 const oc = await getOrdenCompra(id);
 if (!oc) notFound();

 // Auto-marcar como ENVIADA si es BORRADOR (al imprimir = se envía al suplidor)
 await marcarOrdenEnviadaAlImprimir(id);

 const fecha = fmtDate(oc.fechaEmision ?? oc.createdAt);

 const subtotal = Number(oc.subtotal);
 const itbisTotal = Number(oc.itbis);
 const total = Number(oc.total);

 // Calcular ITBIS por línea (informativo, no guardado por detalle)
 // Se estimamos 18% sobre el costo si el producto no es exento
 const detallesConITBIS = oc.detalles.map((d) => {
 const cant = Number(d.cantidad);
 const costo = Number(d.costo);
 const sub = cant * costo;
 // Para OCs existentes no tenemos exentoItbis por línea  calculamos proporcional
 const itbisLin = total > subtotal && subtotal > 0
 ? sub * (itbisTotal / subtotal)
 : 0;
 return { ...d, cantN: cant, costoN: costo, subN: sub, itbisN: itbisLin };
 });

 return (
 <> <PrintButtons /> <p className="no-print text-center text-sm text-gray-500 pt-6 pb-2"> Presiona <strong>Ctrl+P</strong> (Windows) o <strong>+P</strong> (Mac) para imprimir
 </p> <div className="doc-wrap"> <div className="doc"> {/* Encabezado */}
 <div className="doc-header"> <div> <div className="company-name">Ferretería AP</div> <div className="company-sub">Orden de Compra</div> </div> <div className="doc-meta"> <div className="doc-tipo">ORDEN DE COMPRA</div> <div className="doc-numero">{oc.numero}</div> <div className="doc-fecha">{fecha}</div> </div> </div> {/* Info suplidor + orden */}
 <div className="section-grid"> <div className="section-box"> <div className="section-label">SUPLIDOR</div> <div className="section-value-lg">{oc.suplidor.nombre}</div> {oc.suplidor.rnc && <div className="section-value">RNC: {oc.suplidor.rnc}</div>}
 {oc.suplidor.telefono && <div className="section-value">Tel: {oc.suplidor.telefono}</div>}
 {oc.suplidor.email && <div className="section-value">{oc.suplidor.email}</div>}
 </div> <div className="section-box"> {oc.fechaEntrega && (
 <> <div className="section-label">FECHA DE ENTREGA ESPERADA</div> <div className="section-value-lg">{fmtDate(oc.fechaEntrega)}</div> </> )}
 {oc.usuario && (
 <> <div className="section-label mt-1">SOLICITADO POR</div> <div className="section-value">{oc.usuario.nombre}</div> </> )}
 {oc.notas && (
 <> <div className="section-label mt-1">INSTRUCCIONES</div> <div className="section-value">{oc.notas}</div> </> )}
 </div> </div> {/* Tabla de productos */}
 <table className="prod-table"> <thead> <tr> <th className="th-left">#</th> <th className="th-left">Código</th> <th className="th-left">Descripción</th> <th className="th-left">Unidad</th> <th className="th-right">Cantidad</th> <th className="th-right">Costo Unit.</th> <th className="th-right">ITBIS 18%</th> <th className="th-right">Total</th> </tr> </thead> <tbody> {detallesConITBIS.map((d, i) => (
 <tr key={d.id} className={i % 2 === 0 ? "tr-even" : ""}> <td className="td-num">{i + 1}</td> <td className="td-code">{d.producto.codigo}</td> <td className="td-desc">{d.producto.nombre}</td> <td className="td-unit">{d.producto.unidadMedida}</td> <td className="td-num td-bold"> {d.cantN.toLocaleString("es-DO", { maximumFractionDigits: 4 })}
 </td> <td className="td-num">RD$ {fmt(d.costoN)}</td> <td className={`td-num ${d.itbisN > 0 ? "td-itbis" : "td-muted"}`}> {d.itbisN > 0 ? `RD$ ${fmt(d.itbisN)}` : "—"}
 </td> <td className="td-num td-bold">RD$ {fmt(d.subN + d.itbisN)}</td> </tr> ))}
 </tbody> <tfoot> <tr className="tf-sub"> <td colSpan={7} className="td-right td-label">Subtotal (sin ITBIS)</td> <td className="td-num">RD$ {fmt(subtotal)}</td> </tr> <tr className="tf-itbis"> <td colSpan={7} className="td-right td-label">ITBIS 18%</td> <td className="td-num">RD$ {fmt(itbisTotal)}</td> </tr> <tr className="tf-total"> <td colSpan={7} className="td-right td-label-total">TOTAL ESTIMADO</td> <td className="td-num td-total-val">RD$ {fmt(total)}</td> </tr> </tfoot> </table> {/* Firmas */}
 <div className="firmas"> <div className="firma"> <div className="firma-line" /> <div className="firma-label"> Solicitado por
 {oc.usuario && <><br /><strong>{oc.usuario.nombre}</strong></>}
 </div> </div> <div className="firma"> <div className="firma-line" /> <div className="firma-label">Aprobado por</div> </div> <div className="firma"> <div className="firma-line" /> <div className="firma-label">Recibido por (Suplidor)</div> </div> </div> <p className="footer-note"> {oc.numero} · Generada el {fecha} · Ferretería AP
 </p> </div> </div> <style>{` * { box-sizing: border-box; margin: 0; padding: 0; }
 body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11.5px; color: #111; background: #f5f5f5; }
 .doc-wrap { max-width: 820px; margin: 0 auto; padding: 0 16px 32px; }
 .doc { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 28px 32px 24px; margin-top: 16px; box-shadow: 0 1px 8px rgba(0,0,0,.08); }
 .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #111; padding-bottom: 14px; margin-bottom: 16px; }
 .company-name { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; line-height: 1; }
 .company-sub { font-size: 10px; color: #888; margin-top: 3px; }
 .doc-meta { text-align: right; }
 .doc-tipo { font-size: 10px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #555; }
 .doc-numero{ font-size: 18px; font-weight: 900; line-height: 1.1; }
 .doc-fecha { font-size: 10px; color: #666; margin-top: 3px; }
 .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
 .section-box { padding: 10px 14px; background: #f8f8f8; border-radius: 5px; border-left: 3px solid #111; }
 .section-label { font-size: 8.5px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 3px; }
 .section-value-lg { font-size: 14px; font-weight: 700; }
 .section-value { font-size: 11.5px; color: #333; }
 .mt-1 { margin-top: 8px; }
 .prod-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10.5px; }
 .th-left,.th-right { padding: 6px 8px; background: #111; color: #fff; font-weight: 700; font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; }
 .th-right { text-align: right; }
 .th-left { text-align: left; }
 .tr-even { background: #f9f9f9; }
 .td-num { text-align: right; padding: 5px 8px; font-family: 'Courier New', monospace; }
 .td-right { text-align: right; padding: 5px 8px; }
 .td-code { padding: 5px 8px; font-family: 'Courier New', monospace; font-size: 10px; }
 .td-desc { padding: 5px 8px; }
 .td-unit { padding: 5px 8px; color: #555; font-size: 10.5px; }
 .td-bold { font-weight: 700; }
 .td-muted { color: #aaa; }
 .td-itbis { color: #c05a0a; }
 .td-label { font-size: 10px; font-weight: 600; color: #555; }
 .td-label-total { font-size: 11px; font-weight: 900; }
 .tf-sub td, .tf-itbis td { border-top: 1px solid #eee; padding: 4px 8px; }
 .tf-total td { border-top: 2px solid #111; padding: 6px 8px; background: #f4f4f4; }
 .td-total-val { font-size: 14px; font-weight: 900; font-family: 'Courier New', monospace; }
 .firmas { display: flex; gap: 32px; padding-top: 28px; border-top: 1px solid #e5e5e5; margin-top: 8px; }
 .firma { flex: 1; }
 .firma-line { border-bottom: 1px solid #aaa; height: 44px; margin-bottom: 5px; }
 .firma-label { font-size: 10px; color: #888; text-align: center; }
 .footer-note { font-size: 10px; color: #999; text-align: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid #eee; }
 @media print {
 body { background: white; }
 .no-print { display: none !important; }
 .doc-wrap { max-width: 100%; padding: 0; }
 .doc { border: none; border-radius: 0; box-shadow: none; margin: 0; padding: 20px 24px; }
 .th-left,.th-right { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
 .tf-total td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
 }
 `}</style> </> );
}
