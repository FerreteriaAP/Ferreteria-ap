import { notFound } from "next/navigation";
import { getVenta } from "@/actions/ventas";
import { PrintButtons } from "@/components/nominas/print-buttons";

interface PageProps {
 params: Promise<{ id: string }>;
 searchParams: Promise<{ conduceId?: string }>;
}

export default async function ImprimirConducePage({ params, searchParams }: PageProps) {
 const { id } = await params;
 const { conduceId } = await searchParams;
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const v = (await getVenta(id)) as any;
 if (!v) notFound();

 // Si se pasa conduceId, imprimir ese conduce específico; si no, el primero
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const conduce = conduceId
 ? (v.conduces ?? []).find((c: any) => c.id === conduceId) ?? v.conduces?.[0]
 : v.conduces?.[0];

 const fecha = new Date(v.fechaEmision).toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" });

 // Si el conduce tiene ítems parciales en detallesRecepcion, usarlos; si no, todos los ítems de la factura
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const itemsConduce: any[] | null = conduce?.detallesRecepcion?.length
 ? conduce.detallesRecepcion
 : null;

 return (
 <> <PrintButtons /> <p className="no-print text-center text-sm text-gray-500 pt-6 pb-2"> Presiona <strong>Ctrl+P</strong> (Windows) o <strong>+P</strong> (Mac) para imprimir
 </p> <div className="doc-wrap"> <div className="doc"> {/* Encabezado */}
 <div className="doc-header"> <div> <div className="company-name">Ferretería AP</div> <div className="company-sub">Sistema de Gestión Comercial</div> </div> <div className="doc-meta"> <div className="doc-tipo">CONDUCE DE ENTREGA</div> <div className="doc-numero">{conduce?.numero ?? v.numero}</div> <div className="doc-fecha">{fecha}</div> </div> </div> {/* Info */}
 <div className="section-grid"> <div className="section-box"> <div className="section-label">ENTREGAR A</div> <div className="section-value-lg">{v.cliente.nombre}</div> {v.cliente.rnc && <div className="section-value">RNC: {v.cliente.rnc}</div>}
 {v.direccion && (
 <> <div className="section-label mt-1">DIRECCIÓN DE ENTREGA</div> <div className="section-value"> <strong>{v.direccion.etiqueta}</strong><br /> {v.direccion.direccion}
 {v.direccion.sector ? `, ${v.direccion.sector}` : ""}
 {v.direccion.ciudad ? `, ${v.direccion.ciudad}` : ""}
 {v.direccion.referencia && (
 <><br /><em>Ref: {v.direccion.referencia}</em></> )}
 </div> </> )}
 {conduce?.firmaRecibido && (
 <> <div className="section-label mt-1">RECIBE</div> <div className="section-value">{conduce.firmaRecibido}</div> </> )}
 </div> <div className="section-box"> <div className="section-label">REFERENCIA OV</div> <div className="section-value">{v.numero}</div> {conduce?.firmaEntregado && (
 <><div className="section-label mt-1">ENTREGADO POR</div> <div className="section-value">{conduce.firmaEntregado}</div></> )}
 {conduce?.firmaChofer && (
 <><div className="section-label mt-1">CHOFER</div> <div className="section-value">{conduce.firmaChofer}</div></> )}
 {(conduce?.observaciones || v.notas) && (
 <><div className="section-label mt-1">OBSERVACIONES</div> <div className="section-value">{conduce?.observaciones || v.notas}</div></> )}
 </div> </div> {/* Productos */}
 <table className="prod-table"> <thead> <tr> <th className="th-left">#</th> <th className="th-left">Código</th> <th className="th-left">Descripción</th> <th className="th-right">Cant.</th> <th className="th-left">Unidad</th> <th className="th-center"></th> </tr> </thead> <tbody> {itemsConduce ? (
 // Conduce parcial — mostrar solo los ítems seleccionados
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 itemsConduce.map((item: any, i: number) => (
 <tr key={item.productoId} className={i % 2 === 0 ? "tr-even" : ""}> <td className="td-num">{i + 1}</td> <td className="td-code">—</td> <td className="td-desc">{item.nombre}</td> <td className="td-num td-bold"> {Number(item.cantEnviada).toLocaleString("es-DO", { maximumFractionDigits: 4 })}
 </td> <td className="td-unit">{item.unidad}</td> <td className="td-check"></td> </tr> ))
 ) : (
 // Conduce completo — todos los ítems de la factura
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 v.detalles.map((d: any, i: number) => (
 <tr key={d.id} className={i % 2 === 0 ? "tr-even" : ""}> <td className="td-num">{i + 1}</td> <td className="td-code">{d.producto.codigo}</td> <td className="td-desc">{d.descripcion || d.producto.nombre}</td> <td className="td-num td-bold"> {Number(d.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 })}
 </td> <td className="td-unit">{d.unidad ?? d.producto.unidadMedida}</td> <td className="td-check"></td> </tr> ))
 )}
 </tbody> </table> {/* Total bultos / resumen */}
 <div className="conduce-footer"> <p className="conduce-items"> Total líneas:{" "}
 <strong>{itemsConduce ? itemsConduce.length : v.detalles.length}</strong> {itemsConduce && (
 <span className="parcial-badge"> (envío parcial)</span> )}
 </p> </div> {/* Firmas */}
 <div className="firmas"> <div className="firma"> <div className="firma-line" /> <div className="firma-label"> Entregado por
 {conduce?.firmaEntregado && <><br /><strong>{conduce.firmaEntregado}</strong></>}
 </div> </div> <div className="firma"> <div className="firma-line" /> <div className="firma-label"> Recibido por
 {conduce?.firmaRecibido && <><br /><strong>{conduce.firmaRecibido}</strong></>}
 </div> </div> <div className="firma"> <div className="firma-line" /> <div className="firma-label"> Chofer
 {conduce?.firmaChofer && <><br /><strong>{conduce.firmaChofer}</strong></>}
 </div> </div> </div> <p className="footer-note"> Al firmar este conduce el cliente confirma haber recibido los productos en perfecto estado
 </p> </div> </div> <style>{` * { box-sizing: border-box; margin: 0; padding: 0; }
 body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11.5px; color: #111; background: #f5f5f5; }
 .doc-wrap { max-width: 760px; margin: 0 auto; padding: 0 16px 32px; }
 .doc { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 28px 32px 24px; margin-top: 16px; box-shadow: 0 1px 8px rgba(0,0,0,.08); }
 .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #111; padding-bottom: 14px; margin-bottom: 16px; }
 .company-name { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; line-height: 1; }
 .company-sub { font-size: 10px; color: #888; margin-top: 3px; }
 .doc-meta { text-align: right; }
 .doc-tipo { font-size: 10px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #555; }
 .doc-numero { font-size: 18px; font-weight: 900; line-height: 1.1; }
 .doc-fecha { font-size: 10px; color: #666; margin-top: 3px; }
 .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
 .section-box { padding: 10px 14px; background: #f8f8f8; border-radius: 5px; border-left: 3px solid #111; }
 .section-label { font-size: 8.5px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 3px; }
 .section-value-lg { font-size: 14px; font-weight: 700; }
 .section-value { font-size: 11.5px; color: #333; }
 .mt-1 { margin-top: 8px; }
 .prod-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
 .th-left, .th-right, .th-center { padding: 6px 8px; background: #111; color: #fff; font-weight: 700; font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; }
 .th-right { text-align: right; }
 .th-left { text-align: left; }
 .th-center { text-align: center; }
 .tr-even { background: #f9f9f9; }
 .td-num { text-align: right; padding: 5px 8px; font-family: 'Courier New', monospace; }
 .td-code { padding: 5px 8px; font-family: 'Courier New', monospace; font-size: 10.5px; }
 .td-desc { padding: 5px 8px; }
 .td-unit { padding: 5px 8px; color: #555; font-size: 10.5px; }
 .td-check { text-align: center; padding: 5px 8px; font-size: 14px; }
 .td-bold { font-weight: 700; }
 .conduce-footer { display: flex; justify-content: space-between; font-size: 11.5px; color: #555; margin-bottom: 20px; padding: 8px 0; border-top: 1px solid #eee; }
 .conduce-items { font-size: 12px; }
 .parcial-badge { font-size: 10px; color: #7c3aed; background: #ede9fe; border-radius: 3px; padding: 1px 5px; margin-left: 4px; }
 .firmas { display: flex; gap: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5; }
 .firma { flex: 1; }
 .firma-line { border-bottom: 1px solid #aaa; height: 36px; margin-bottom: 5px; }
 .firma-label { font-size: 10px; color: #888; text-align: center; }
 .footer-note { font-size: 10px; color: #999; text-align: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid #eee; }
 @media print {
 body { background: white; }
 .no-print { display: none !important; }
 .doc-wrap { max-width: 100%; padding: 0; }
 .doc { border: none; border-radius: 0; box-shadow: none; margin: 0; padding: 20px 24px; }
 .th-left, .th-right, .th-center { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
 }
 `}</style> </> );
}
