import { notFound } from "next/navigation";
import { getOrdenCompra } from "@/actions/ordenes-compra";
import { marcarOrdenEnviadaAlImprimir } from "@/actions/ordenes-compra";
import { PrintButtons } from "@/components/nominas/print-buttons";
import { PrintLogo } from "@/components/print/logo";
import { EMPRESA } from "@/lib/empresa";

interface PageProps { params: Promise<{ id: string }> }

const fmt = (n: number | null | undefined) =>
  n == null ? "0.00" : Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: Date | null | undefined) =>
  d == null ? "—" : new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function ImprimirOrdenCompraPage({ params }: PageProps) {
  const { id } = await params;
  const oc = await getOrdenCompra(id);
  if (!oc) notFound();

  // Marcar como enviada en background — sin await para no bloquear SSR
  marcarOrdenEnviadaAlImprimir(id).catch(() => {});

  const fecha    = fmtDate(oc.fechaEmision ?? oc.createdAt);
  const subtotal = Number(oc.subtotal);
  const itbisTotal = Number(oc.itbis);
  const total    = Number(oc.total);

  const detallesConITBIS = oc.detalles.map((d) => {
    const cant  = Number(d.cantidad);
    const costo = Number(d.costo);
    const sub   = cant * costo;
    const itbisLin = total > subtotal && subtotal > 0 ? sub * (itbisTotal / subtotal) : 0;
    return { ...d, cantN: cant, costoN: costo, subN: sub, itbisN: itbisLin };
  });

  return (
    <>
      <PrintButtons />
      <p className="no-print" style={{ textAlign: "center", fontSize: 13, color: "#666", padding: "20px 0 8px" }}>
        Papel: <strong>8½&quot; × 11&quot;</strong> (Carta) · Presiona <strong>Ctrl+P</strong> / <strong>⌘+P</strong> para imprimir
      </p>

      <div className="wrap">
        <div className="doc">

          {/* ── LOGO + TIPO DOC ── */}
          <div className="logo-area">
            <PrintLogo width={270} height={72} />
            <div className="tipo-box">
              <div className="tipo-titulo">ORDEN DE COMPRA</div>
              <div className="tipo-num">{oc.numero}</div>
            </div>
          </div>

          {/* ── DATOS EMPRESA + FECHA ── */}
          <div className="emp-row">
            <div>
              <div className="emp-det">{EMPRESA.dir} · {EMPRESA.ciudad}</div>
              <div className="emp-det">Tel.: {EMPRESA.tel} · {EMPRESA.email}</div>
              <div className="emp-det">RNC: {EMPRESA.rnc}</div>
            </div>
            <div className="fecha-bloque">
              <span className="fecha-lbl">Fecha:</span>
              <span className="fecha-val">{fecha}</span>
              {oc.fechaEntrega && (
                <div className="fecha-entrega">
                  Entrega esperada: <strong>{fmtDate(oc.fechaEntrega)}</strong>
                </div>
              )}
            </div>
          </div>

          {/* ── CAJA INFO: suplidor (izq) | datos entrega (der) ── */}
          <div className="cli-box">
            <div className="cli-grid">
              {/* Izquierda — suplidor */}
              <div>
                <div className="cli-sec">SUPLIDOR</div>
                <div className="cli-nombre">{oc.suplidor.nombre}</div>
                {oc.suplidor.rnc     && <div className="cli-row"><span className="cli-lbl">RNC:</span> {oc.suplidor.rnc}</div>}
                {(oc.suplidor as { telefono?: string }).telefono &&
                  <div className="cli-row"><span className="cli-lbl">Tel.:</span> {(oc.suplidor as { telefono?: string }).telefono}</div>}
                {(oc.suplidor as { email?: string }).email &&
                  <div className="cli-row"><span className="cli-lbl">Email:</span> {(oc.suplidor as { email?: string }).email}</div>}
                {oc.notas && (
                  <div className="cli-row" style={{ marginTop: 6 }}>
                    <span className="cli-lbl">Instrucciones:</span><br />
                    <span style={{ fontSize: "10.5px" }}>{oc.notas}</span>
                  </div>
                )}
              </div>

              {/* Derecha — datos de entrega */}
              <div>
                <div className="cli-sec">DATOS DE ENTREGA</div>
                <div className="cli-row"><span className="cli-lbl">Estado:</span> <strong>SOLICITUD</strong></div>
                <div className="cli-row">
                  <span className="cli-lbl">Dirección de entrega:</span><br />
                  <span style={{ fontSize: "10.5px" }}>{EMPRESA.dir}<br />{EMPRESA.ciudad}</span>
                </div>
                {oc.usuario && (
                  <div className="cli-row" style={{ marginTop: 4 }}>
                    <span className="cli-lbl">Solicitado por:</span> {oc.usuario.nombre}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── TABLA ── */}
          <table className="tbl">
            <thead>
              <tr>
                <th className="th-c">#</th>
                <th className="th-l">Código</th>
                <th className="th-l">Descripción</th>
                <th className="th-l">Unidad</th>
                <th className="th-r">Cantidad</th>
                <th className="th-r">Costo Unit.</th>
                <th className="th-r">ITBIS 18%</th>
                <th className="th-r">Total</th>
              </tr>
            </thead>
            <tbody>
              {detallesConITBIS.map((d, i) => (
                <tr key={d.id} className={i % 2 === 1 ? "tr-alt" : ""}>
                  <td className="td-c">{i + 1}</td>
                  <td className="td-l"><span className="mono">{d.producto.codigo}</span></td>
                  <td className="td-l">{d.producto.nombre}</td>
                  <td className="td-l">{d.producto.unidadMedida}</td>
                  <td className="td-r bold">{d.cantN.toLocaleString("es-DO", { maximumFractionDigits: 4 })}</td>
                  <td className="td-r">RD$ {fmt(d.costoN)}</td>
                  <td className={`td-r ${d.itbisN > 0 ? "itbis" : "muted"}`}>
                    {d.itbisN > 0 ? `RD$ ${fmt(d.itbisN)}` : "—"}
                  </td>
                  <td className="td-r bold">RD$ {fmt(d.subN + d.itbisN)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="tf-sub">
                <td colSpan={7} className="tf-lbl">Subtotal (sin ITBIS)</td>
                <td className="td-r">RD$ {fmt(subtotal)}</td>
              </tr>
              <tr className="tf-itbis">
                <td colSpan={7} className="tf-lbl">ITBIS 18%</td>
                <td className="td-r">RD$ {fmt(itbisTotal)}</td>
              </tr>
              <tr className="tf-total">
                <td colSpan={7} className="tf-lbl-total">TOTAL ESTIMADO</td>
                <td className="td-r bold-total">RD$ {fmt(total)}</td>
              </tr>
            </tfoot>
          </table>

          {/* ── ÁREA PIE — firmas + footer (margin-top:auto → última página) ── */}
          <div className="footer-area">

            {/* Firmas */}
            <div className="firmas">
              <div className="firma">
                <div className="firma-line" />
                <div className="firma-lbl">
                  Solicitado por
                  {oc.usuario && <><br /><strong>{oc.usuario.nombre}</strong></>}
                </div>
              </div>
              <div className="firma">
                <div className="firma-line" />
                <div className="firma-lbl">Sello de la compañía</div>
              </div>
              <div className="firma">
                <div className="firma-line" />
                <div className="firma-lbl">Firma de despacho (Suplidor)</div>
              </div>
            </div>

            {/* Footer */}
            <div className="footer-line">
              {oc.numero} · Generada el {fecha} · {EMPRESA.nombre} · RNC {EMPRESA.rnc} · {EMPRESA.tel} · {EMPRESA.dir}, {EMPRESA.ciudad}
            </div>

          </div>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #ebebeb; }
        .wrap { max-width: 860px; margin: 0 auto; padding: 0 16px 40px; }
        .doc {
          background: #fff;
          padding: 32px 40px 28px;
          margin-top: 10px;
          border-radius: 6px;
          box-shadow: 0 2px 12px rgba(0,0,0,.12);
          display: flex;
          flex-direction: column;
        }

        /* ── LOGO + TIPO DOC ── */
        .logo-area {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 14px;
          margin-bottom: 10px;
          border-bottom: 3.5px solid #f5821f;
        }
        .tipo-box { text-align: right; }
        .tipo-titulo {
          font-size: 20px; font-weight: 900; color: #f5821f;
          letter-spacing: 0.02em; line-height: 1.2; margin-bottom: 4px;
        }
        .tipo-num { font-size: 15px; font-weight: 700; color: #1a1a1a; }

        /* ── EMPRESA + FECHA ── */
        .emp-row {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 14px;
        }
        .emp-det { font-size: 10.5px; color: #444; line-height: 1.7; }
        .fecha-bloque { text-align: right; }
        .fecha-lbl { font-size: 11px; color: #666; margin-right: 5px; }
        .fecha-val { font-size: 15px; font-weight: 700; color: #1a1a1a; }
        .fecha-entrega { font-size: 10.5px; color: #555; margin-top: 3px; }

        /* ── CAJA SUPLIDOR ── */
        .cli-box {
          background: #f7f7f7;
          border-left: 4px solid #f5821f;
          border-radius: 0 4px 4px 0;
          padding: 11px 16px;
          margin-bottom: 18px;
        }
        .cli-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .cli-sec { font-size: 8px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: #888; margin-bottom: 4px; }
        .cli-nombre { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
        .cli-row { font-size: 11px; line-height: 1.9; }
        .cli-lbl { color: #666; font-weight: 600; margin-right: 4px; }

        /* ── TABLA ── */
        .tbl { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 11px; }
        .th-l, .th-r, .th-c {
          padding: 7px 8px;
          background: #000204; color: #fff;
          font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
        }
        .th-l { text-align: left; }
        .th-r { text-align: right; }
        .th-c { text-align: center; width: 26px; }
        .tr-alt { background: #f8f8f8; }
        .td-l { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
        .td-r { padding: 6px 8px; text-align: right; border-bottom: 1px solid #f0f0f0; }
        .td-c { padding: 6px 8px; text-align: center; color: #888; border-bottom: 1px solid #f0f0f0; font-size: 10px; }
        .mono { font-family: 'Courier New', monospace; font-size: 10px; }
        .bold { font-weight: 700; }
        .muted { color: #bbb; }
        .itbis { color: #c05a0a; }

        .tf-sub td, .tf-itbis td { border-top: 1px solid #eee; padding: 4px 8px; font-size: 11px; }
        .tf-total td { border-top: 2px solid #000204; padding: 8px 8px; background: #f7f7f7; }
        .tf-lbl { text-align: right; font-size: 11px; color: #555; font-weight: 600; }
        .tf-lbl-total { text-align: right; font-size: 12px; font-weight: 900; }
        .bold-total { font-family: 'Courier New', monospace; font-size: 14px; font-weight: 900; text-align: right; padding: 8px; }

        /* ── FOOTER AREA — margin-top:auto empuja al fondo de la última página ── */
        .footer-area { margin-top: auto; }

        /* Firmas */
        .firmas {
          display: flex; gap: 32px;
          padding-top: 28px; margin-top: 20px;
          border-top: 1px solid #e5e5e5;
          margin-bottom: 14px;
        }
        .firma { flex: 1; }
        .firma-line { border-bottom: 1px solid #aaa; height: 44px; margin-bottom: 5px; }
        .firma-lbl { font-size: 10px; color: #888; text-align: center; }

        /* Footer text */
        .footer-line {
          font-size: 9.5px; color: #777; text-align: center;
          padding-top: 10px; border-top: 1px solid #e8e8e8;
        }

        /* ── PRINT ── */
        @media print {
          @page { size: letter; margin: 10mm 15mm; }
          body { background: white; }
          .no-print { display: none !important; }
          .wrap { max-width: 100%; padding: 0; }
          .doc {
            box-shadow: none; border-radius: 0; margin: 0; padding: 0;
            min-height: 259mm;
          }
          .th-l, .th-r, .th-c, .logo-area, .cli-box, .tf-total td, .tr-alt {
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
