import { notFound } from "next/navigation";
import { getVenta } from "@/actions/ventas";
import { PrintButtons } from "@/components/nominas/print-buttons";
import { PrintLogo } from "@/components/print/logo";
import { EMPRESA, CREDITO_LABEL } from "@/lib/empresa";

interface PageProps { params: Promise<{ id: string }> }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtN = (n: any) => {
  const [ent, dec] = Number(n).toFixed(2).split(".");
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

export default async function ImprimirCotizacionPage({ params }: PageProps) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (await getVenta(id)) as any;
  if (!v) notFound();

  const titulo = v.tipo === "ORDEN_VENTA" ? "ORDEN DE VENTA" : "COTIZACIÓN";
  const fechaEmision = new Date(v.fechaEmision ?? new Date()).toLocaleDateString("es-DO", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const fechaVence = v.fechaVencimiento
    ? new Date(v.fechaVencimiento).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;
  const fechaEntrega = v.fechaEntrega
    ? new Date(v.fechaEntrega).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tieneDesc = v.detalles.some((d: any) => Number(d.descuento) > 0);

  return (
    <>
      <PrintButtons />
      <p className="no-print" style={{ textAlign: "center", fontSize: 13, color: "#666", padding: "20px 0 8px" }}>
        Presiona <strong>Ctrl+P</strong> (Windows) o <strong>⌘+P</strong> (Mac) para imprimir
      </p>

      <div className="wrap">
        <div className="doc">

          {/* LOGO */}
          <div className="logo-area">
            <PrintLogo width={270} height={72} />
          </div>

          {/* ENCABEZADO */}
          <div className="header-grid">
            <div>
              <div className="emp-det">RNC: {EMPRESA.rnc}</div>
              <div className="emp-det">Tel.: {EMPRESA.tel} (WhatsApp) · {EMPRESA.email}</div>
              <div className="emp-det">{EMPRESA.dir}</div>
              <div className="emp-det">{EMPRESA.ciudad}</div>
              <table className="fecha-tbl">
                <tbody>
                  <tr><td className="fecha-lbl">Fecha:</td><td className="fecha-val">{fechaEmision}</td></tr>
                  {fechaVence && <tr><td className="fecha-lbl">Válida hasta:</td><td className="fecha-val">{fechaVence}</td></tr>}
                  {fechaEntrega && <tr><td className="fecha-lbl">Entrega est.:</td><td className="fecha-val">{fechaEntrega}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="tipo-box">
              <div className="tipo-titulo">{titulo}</div>
              <div className="tipo-det"><strong>No.:</strong> {v.numero}</div>
              <div className="tipo-det"><strong>Condición:</strong> {CREDITO_LABEL[v.credito] ?? v.credito}</div>
            </div>
          </div>

          {/* CLIENTE */}
          <div className="cli-box">
            <div className="cli-grid">
              <div>
                {v.cliente.rnc && <div className="cli-row"><span className="cli-lbl">RNC:</span> {v.cliente.rnc}</div>}
                <div className="cli-row"><span className="cli-lbl">Cliente:</span> <strong>{v.cliente.nombre}</strong></div>
                {v.cliente.telefono && <div className="cli-row"><span className="cli-lbl">Tel.:</span> {v.cliente.telefono}</div>}
                {v.cliente.email && <div className="cli-row"><span className="cli-lbl">Email:</span> {v.cliente.email}</div>}
                {v.direccion && (
                  <div className="cli-row">
                    <span className="cli-lbl">Dirección:</span>{" "}
                    {v.direccion.etiqueta} — {v.direccion.direccion}
                    {v.direccion.sector ? `, ${v.direccion.sector}` : ""}
                    {v.direccion.ciudad ? `, ${v.direccion.ciudad}` : ""}
                  </div>
                )}
              </div>
              <div>
                <div className="cli-row"><span className="cli-lbl">Referencia:</span> <strong>{v.numero}</strong></div>
                <div className="cli-row"><span className="cli-lbl">Condición de pago:</span> {CREDITO_LABEL[v.credito] ?? v.credito}</div>
                {fechaVence && <div className="cli-row"><span className="cli-lbl">Válida hasta:</span> {fechaVence}</div>}
              </div>
            </div>
          </div>

          {/* TABLA */}
          <table className="tbl">
            <thead>
              <tr>
                <th className="th-c">#</th>
                <th className="th-l">Descripción</th>
                <th className="th-r">Cantidad</th>
                <th className="th-r">Precio Unit.</th>
                {tieneDesc && <th className="th-r">Desc.</th>}
                <th className="th-r">ITBIS</th>
                <th className="th-r">Total</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {v.detalles.map((d: any, i: number) => (
                <tr key={d.id} className={i % 2 === 1 ? "tr-alt" : ""}>
                  <td className="td-c">{i + 1}</td>
                  <td className="td-l">
                    <div className="pnom">{d.descripcion || d.producto.nombre}</div>
                    <div className="psub">{d.producto.codigo} · {d.unidad ?? d.producto.unidadMedida}</div>
                  </td>
                  <td className="td-r">{Number(d.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 })}</td>
                  <td className="td-r mono">{fmtN(d.precio)}</td>
                  {tieneDesc && <td className="td-r">{Number(d.descuento) > 0 ? `${d.descuento}%` : "—"}</td>}
                  <td className="td-r">
                    {d.exentoItbis
                      ? <span className="etag">Exento</span>
                      : <span className="mono">{fmtN(d.itbis)}</span>}
                  </td>
                  <td className="td-r mono bold">{fmtN(d.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALES + NOTAS */}
          <div className="bot-grid">
            <div className="notas-area">
              {v.notas && (
                <>
                  <div className="notas-tit">NOTAS</div>
                  <div className="notas-val">{v.notas}</div>
                </>
              )}
              <div className="disclaimer">
                Esta cotización no constituye una factura. Los precios son válidos hasta la fecha indicada.
              </div>
            </div>
            <div className="tot-area">
              <table className="tot-tbl">
                <tbody>
                  <tr>
                    <td className="tot-lbl">Subtotal (s/ITBIS)</td>
                    <td className="tot-val">RD$ {fmtN(v.subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="tot-lbl">ITBIS (18%)</td>
                    <td className="tot-val">RD$ {fmtN(v.itbis)}</td>
                  </tr>
                  <tr className="tot-final">
                    <td className="tot-lbl-f">Total</td>
                    <td className="tot-val-f">RD$ {fmtN(v.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="footer-line">
            {EMPRESA.nombre} · RNC {EMPRESA.rnc} · {EMPRESA.tel} · {EMPRESA.email}
          </div>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #ebebeb; }
        .wrap { max-width: 820px; margin: 0 auto; padding: 0 16px 40px; }
        .doc { background: #fff; padding: 32px 40px 28px; margin-top: 10px; border-radius: 6px; box-shadow: 0 2px 12px rgba(0,0,0,.12); }

        .logo-area { padding-bottom: 18px; margin-bottom: 18px; border-bottom: 3.5px solid #f5821f; }

        .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 18px; align-items: start; }
        .emp-det { font-size: 10px; color: #444; line-height: 1.7; }

        /* Fechas alineadas en tabla */
        .fecha-tbl { border-collapse: collapse; margin-top: 6px; }
        .fecha-lbl { font-size: 10px; color: #666; font-weight: 600; padding-right: 8px; white-space: nowrap; }
        .fecha-val { font-size: 10px; color: #333; font-weight: 500; }

        .tipo-box { text-align: right; }
        .tipo-titulo { font-size: 22px; font-weight: 700; color: #f5821f; line-height: 1.2; margin-bottom: 10px; }
        .tipo-det { font-size: 11.5px; color: #333; line-height: 1.9; }

        .cli-box { background: #f7f7f7; border-left: 4px solid #f5821f; border-radius: 0 4px 4px 0; padding: 11px 16px; margin-bottom: 18px; }
        .cli-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cli-row { font-size: 11.5px; line-height: 1.9; }
        .cli-lbl { color: #666; font-weight: 600; margin-right: 4px; }

        .tbl { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .th-l, .th-r, .th-c { padding: 7px 9px; background: #000204; color: #fff; font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
        .th-l { text-align: left; }
        .th-r { text-align: right; }
        .th-c { text-align: center; width: 28px; }
        .tr-alt { background: #f8f8f8; }
        .td-l { padding: 7px 9px; border-bottom: 1px solid #f0f0f0; }
        .td-r { padding: 7px 9px; text-align: right; border-bottom: 1px solid #f0f0f0; }
        .td-c { padding: 7px 9px; text-align: center; color: #888; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
        .pnom { font-size: 11.5px; font-weight: 500; }
        .psub { font-size: 9.5px; color: #999; margin-top: 2px; }
        .mono { font-family: 'Courier New', monospace; }
        .bold { font-weight: 700; }
        .etag { font-size: 9.5px; font-weight: 700; color: #2e7d32; background: #e8f5e9; padding: 1px 7px; border-radius: 20px; border: 1px solid #c8e6c9; }

        .bot-grid { display: grid; grid-template-columns: 1fr auto; gap: 28px; align-items: start; margin-bottom: 18px; }
        .notas-tit { font-size: 8.5px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: #999; margin-bottom: 5px; }
        .notas-val { font-size: 11px; color: #333; margin-bottom: 12px; }
        .disclaimer { font-size: 10px; color: #aaa; font-style: italic; }

        .tot-area { min-width: 260px; }
        .tot-tbl { width: 100%; border-collapse: collapse; }
        .tot-lbl { padding: 6px 14px 6px 12px; font-size: 12px; color: #444; border-bottom: 1px solid #eee; }
        .tot-val { padding: 6px 12px; text-align: right; font-family: 'Courier New', monospace; font-size: 12px; border-bottom: 1px solid #eee; }
        .tot-lbl-f { padding: 10px 14px 10px 12px; font-size: 14px; font-weight: 700; color: #fff; background: #f5821f; border-radius: 4px 0 0 4px; }
        .tot-val-f { padding: 10px 12px; font-size: 14px; font-weight: 700; color: #fff; background: #f5821f; border-radius: 0 4px 4px 0; text-align: right; font-family: 'Courier New', monospace; }

        .footer-line { font-size: 10px; color: #777; text-align: center; padding-top: 12px; border-top: 1px solid #e8e8e8; margin-top: 20px; }

        @media print {
          @page { size: letter; margin: 12mm 15mm 22mm; }
          body { background: white; }
          .no-print { display: none !important; }
          .wrap { max-width: 100%; padding: 0; }
          .doc { box-shadow: none; border-radius: 0; margin: 0; padding: 18px 22px; }
          .th-l, .th-r, .th-c, .tot-lbl-f, .tot-val-f, .logo-area, .cli-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Footer pegado al fondo de la página */
          .footer-line {
            position: fixed;
            bottom: 6mm;
            left: 0; right: 0;
            border-top: 1px solid #e8e8e8;
            padding-top: 5px;
            background: white;
            margin-top: 0;
          }
        }
      `}</style>
    </>
  );
}
