import { notFound } from "next/navigation";
import { getVenta } from "@/actions/ventas";
import { PrintButtons } from "@/components/nominas/print-buttons";
import { PrintLogo } from "@/components/print/logo";
import { EMPRESA, getBancosEmpresa, CREDITO_LABEL, NCF_LABEL } from "@/lib/empresa";
import { auth } from "@/lib/auth";

interface PageProps { params: Promise<{ id: string }> }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtN = (n: any) => {
  const [ent, dec] = Number(n).toFixed(2).split(".");
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

export default async function ImprimirFacturaPage({ params }: PageProps) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [v, bancos, session] = await Promise.all([
    getVenta(id) as Promise<any>,
    getBancosEmpresa(),
    auth(),
  ]);
  if (!v || v.tipo !== "FACTURADA") notFound();
  const isAdmin = (session?.user as { rol?: string } | undefined)?.rol === "ADMINISTRADOR";

  const fecha = new Date(v.fechaEmision).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
  const vence = v.fechaVencimiento
    ? new Date(v.fechaVencimiento).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tieneDesc = v.detalles.some((d: any) => Number(d.descuento) > 0);
  const tipoLabel = v.tipoNcf ? (NCF_LABEL[v.tipoNcf] ?? "Factura") : "Factura";

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

          {/* ENCABEZADO: empresa (izq) | tipo + número (der) */}
          <div className="header-grid">
            <div>
              <div className="emp-det">RNC: {EMPRESA.rnc}</div>
              <div className="emp-det">Tel.: {EMPRESA.tel} (WhatsApp) · {EMPRESA.email}</div>
              <div className="emp-det">{EMPRESA.dir}</div>
              <div className="emp-det">{EMPRESA.ciudad}</div>
              {/* Solo fecha de emisión — más grande y en negrita, sin fecha de vencimiento */}
              <div className="fecha-emision">
                <span className="fecha-emision-lbl">Fecha:</span>
                <span className="fecha-emision-val">{fecha}</span>
              </div>
            </div>
            <div className="tipo-box">
              <div className="tipo-titulo">{tipoLabel}</div>
              {v.ncf && <div className="tipo-det"><strong>NCF:</strong> {v.ncf}</div>}
              <div className="tipo-det"><strong>No.:</strong> {v.numero}</div>
              {/* Condición removida de aquí — ya está en el cuadro del cliente */}
            </div>
          </div>

          {/* CLIENTE — info completa del cliente */}
          <div className="cli-box">
            <div className="cli-grid">
              <div>
                {v.cliente.rnc && (
                  <div className="cli-row"><span className="cli-lbl">RNC:</span> {v.cliente.rnc}</div>
                )}
                <div className="cli-row">
                  <span className="cli-lbl">Razón Social:</span> <strong>{v.cliente.nombre}</strong>
                </div>
                {v.cliente.telefono && (
                  <div className="cli-row"><span className="cli-lbl">Tel.:</span> {v.cliente.telefono}</div>
                )}
                {v.cliente.email && (
                  <div className="cli-row"><span className="cli-lbl">Email:</span> {v.cliente.email}</div>
                )}
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
                <div className="cli-row"><span className="cli-lbl">Plazo de pago:</span> {CREDITO_LABEL[v.credito] ?? v.credito}</div>
                {vence && (
                  <div className="cli-row"><span className="cli-lbl">Vencimiento:</span> {vence}</div>
                )}
              </div>
            </div>
          </div>

          {/* TABLA — Código · Descripción · Unidad · Cantidad · Precio · ITBIS · Importe */}
          <table className="tbl">
            <thead>
              <tr>
                <th className="th-cod">Código</th>
                <th className="th-l">Descripción</th>
                <th className="th-c">Unidad</th>
                <th className="th-r">Cantidad</th>
                <th className="th-r">Precio Unit.</th>
                {tieneDesc && <th className="th-r">Desc.</th>}
                <th className="th-r">ITBIS</th>
                <th className="th-r">Importe</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {v.detalles.map((d: any, i: number) => (
                <tr key={d.id} className={i % 2 === 1 ? "tr-alt" : ""}>
                  <td className="td-cod">{d.producto.codigo}</td>
                  <td className="td-l">{d.descripcion || d.producto.nombre}</td>
                  <td className="td-c">{d.unidad ?? d.producto.unidadMedida}</td>
                  <td className="td-r">{Number(d.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 })}</td>
                  <td className="td-r mono">{fmtN(d.precio)}</td>
                  {tieneDesc && (
                    <td className="td-r">{Number(d.descuento) > 0 ? `${d.descuento}%` : "—"}</td>
                  )}
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

          {/* TOTALES + NCF */}
          <div className="bot-grid">
            {/* NCF / Comprobante fiscal — izquierda */}
            <div className="ncf-box">
              <div className="ncf-label">COMPROBANTE FISCAL ELECTRÓNICO</div>
              {v.ncf
                ? <div className="ncf-value">{v.ncf}</div>
                : <div className="ncf-placeholder">NCF / QR pendiente de configuración DGII</div>
              }
            </div>

            {/* Totales — derecha */}
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

          {v.notas && (
            <div className="notas-box"><strong>Notas:</strong> {v.notas}</div>
          )}

          {/* CÓDIGO DE SEGURIDAD — solo visible para ADMINISTRADOR */}
          {isAdmin && v.codigoSeguridad && (
            <div className="admin-codigo-box">
              <span className="admin-codigo-lbl">Código de seguridad:</span>
              <span className="admin-codigo-val">{v.codigoSeguridad}</span>
            </div>
          )}

          {/* INFORMACIÓN DE PAGO + FOOTER — flujo normal, última página */}
          <div className="footer-area">
            <div className="banco-tit">INFORMACIÓN DE PAGO</div>
            <div className="banco-ref">Referencia de pago: <strong>{v.numero}</strong></div>
            <div className="banco-lista">
              {bancos.length === 0 && (
                <div className="banco-item" style={{ color: "#aaa", fontSize: 10 }}>
                  <span className="bico">•</span>
                  <span>Cuentas bancarias no configuradas</span>
                </div>
              )}
              {bancos.map((b, i) => (
                <div key={i} className="banco-item">
                  <span className="bico">•</span>
                  <span>{b.banco}{b.tipo ? ` (${b.tipo})` : ""}: <strong>{b.cuenta}</strong></span>
                </div>
              ))}
            </div>
            <div className="footer-line">
              Favor emitir sus pagos a nombre de <strong>{EMPRESA.nombre}</strong> · RNC {EMPRESA.rnc} · Tel. {EMPRESA.tel} · {EMPRESA.email} · {EMPRESA.dir}, {EMPRESA.ciudad}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #ebebeb; }

        .wrap { max-width: 820px; margin: 0 auto; padding: 0 16px 40px; }
        .doc { background: #fff; padding: 32px 40px 28px; margin-top: 10px; border-radius: 6px; box-shadow: 0 2px 12px rgba(0,0,0,.12); }

        /* Logo */
        .logo-area { padding-bottom: 18px; margin-bottom: 18px; border-bottom: 3.5px solid #f5821f; }

        /* Encabezado */
        .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 18px; align-items: start; }
        .emp-det { font-size: 10px; color: #444; line-height: 1.7; }

        /* Fecha de emisión — más grande y legible */
        .fecha-emision { margin-top: 8px; display: flex; align-items: baseline; gap: 6px; }
        .fecha-emision-lbl { font-size: 11px; color: #666; font-weight: 700; }
        .fecha-emision-val { font-size: 13px; font-weight: 700; color: #111; }

        .tipo-box { text-align: right; }
        .tipo-titulo { font-size: 20px; font-weight: 700; color: #f5821f; line-height: 1.2; margin-bottom: 10px; }
        .tipo-det { font-size: 11.5px; color: #333; line-height: 1.9; }

        /* Cliente */
        .cli-box { background: #f7f7f7; border-left: 4px solid #f5821f; border-radius: 0 4px 4px 0; padding: 11px 16px; margin-bottom: 18px; }
        .cli-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cli-row { font-size: 11.5px; line-height: 1.9; }
        .cli-lbl { color: #666; font-weight: 600; margin-right: 4px; }

        /* Tabla */
        .tbl { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .th-l, .th-r, .th-c, .th-cod { padding: 6px 7px; background: #000204; color: #fff; font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
        .th-l { text-align: left; }
        .th-r { text-align: right; }
        .th-c { text-align: center; }
        .th-cod { text-align: left; width: 72px; }
        .tr-alt { background: #f8f8f8; }
        .td-l { padding: 5px 7px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
        .td-r { padding: 5px 7px; text-align: right; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
        .td-c { padding: 5px 7px; text-align: center; color: #555; border-bottom: 1px solid #f0f0f0; font-size: 10.5px; }
        .td-cod { padding: 5px 7px; border-bottom: 1px solid #f0f0f0; font-size: 9.5px; color: #888; font-family: 'Courier New', monospace; }
        .mono { font-family: 'Courier New', monospace; }
        .bold { font-weight: 700; }
        .etag { font-size: 9px; font-weight: 700; color: #2e7d32; background: #e8f5e9; padding: 1px 6px; border-radius: 20px; border: 1px solid #c8e6c9; }

        /* Totales + NCF */
        .bot-grid { display: grid; grid-template-columns: 1fr auto; gap: 28px; align-items: start; margin-bottom: 20px; }
        .ncf-box { border: 1px dashed #ccc; border-radius: 4px; padding: 10px 12px; min-height: 60px; align-self: stretch; display: flex; flex-direction: column; justify-content: center; }
        .ncf-label { font-size: 7.5px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #aaa; margin-bottom: 4px; }
        .ncf-value { font-size: 13px; font-weight: 700; font-family: monospace; color: #333; }
        .ncf-placeholder { font-size: 9px; color: #ccc; font-style: italic; }

        .tot-area { min-width: 260px; }
        .tot-tbl { width: 100%; border-collapse: collapse; }
        .tot-lbl { padding: 6px 14px 6px 12px; font-size: 12px; color: #444; border-bottom: 1px solid #eee; }
        .tot-val { padding: 6px 12px; text-align: right; font-family: 'Courier New', monospace; font-size: 12px; border-bottom: 1px solid #eee; }
        .tot-lbl-f { padding: 10px 14px 10px 12px; font-size: 14px; font-weight: 700; color: #fff; background: #f5821f; border-radius: 4px 0 0 4px; }
        .tot-val-f { padding: 10px 12px; font-size: 14px; font-weight: 700; color: #fff; background: #f5821f; border-radius: 0 4px 4px 0; text-align: right; font-family: 'Courier New', monospace; }

        .notas-box { margin-bottom: 16px; font-size: 10.5px; color: #555; padding: 7px 10px; background: #f9f9f9; border-radius: 4px; border-left: 3px solid #ddd; }

        /* Información de pago + footer — empujado al fondo de la última página */
        .footer-area { padding-top: 16px; border-top: 1px solid #e8e8e8; margin-top: auto; }
        .banco-tit { font-size: 8.5px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: #999; margin-bottom: 6px; }
        .banco-ref { font-size: 11px; margin-bottom: 6px; color: #333; }
        .banco-item { font-size: 11px; line-height: 1.9; display: flex; gap: 5px; }
        .bico { color: #f5821f; font-weight: 700; }
        .footer-line { font-size: 10px; color: #777; text-align: center; padding-top: 10px; margin-top: 10px; border-top: 1px solid #e8e8e8; }

        /* Código de seguridad — solo admin */
        .admin-codigo-box { margin-bottom: 14px; display: flex; align-items: baseline; gap: 8px; }
        .admin-codigo-lbl { font-size: 10px; color: #999; }
        .admin-codigo-val { font-size: 13px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 0.12em; color: #555; }

        /* Impresión */
        @media print {
          @page { size: letter; margin: 8mm 14mm 12mm; }
          body { background: white; }
          .no-print { display: none !important; }
          .wrap { max-width: 100%; padding: 0; }
          /* Flex column + min-height → footer-area siempre al fondo de la última página */
          .doc {
            box-shadow: none; border-radius: 0; margin: 0; padding: 16px 20px 20px;
            display: flex; flex-direction: column;
            min-height: 259mm;
          }
          .th-l, .th-r, .th-c, .th-cod,
          .tot-lbl-f, .tot-val-f,
          .logo-area, .cli-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}
