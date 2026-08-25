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

  // Marcar como enviada en background — no await para evitar revalidatePath durante SSR
  marcarOrdenEnviadaAlImprimir(id).catch(() => {});

  const fecha = fmtDate(oc.fechaEmision ?? oc.createdAt);
  const subtotal = Number(oc.subtotal);
  const itbisTotal = Number(oc.itbis);
  const total = Number(oc.total);

  const detallesConITBIS = oc.detalles.map((d) => {
    const cant = Number(d.cantidad);
    const costo = Number(d.costo);
    const sub = cant * costo;
    const itbisLin = total > subtotal && subtotal > 0 ? sub * (itbisTotal / subtotal) : 0;
    return { ...d, cantN: cant, costoN: costo, subN: sub, itbisN: itbisLin };
  });

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
              <div className="emp-nombre">{EMPRESA.nombre}</div>
              <div className="emp-det">RNC: {EMPRESA.rnc}</div>
              <div className="emp-det">Tel.: {EMPRESA.tel} (WhatsApp)</div>
              <div className="emp-det">{EMPRESA.dir}</div>
              <div className="emp-det">{EMPRESA.ciudad}</div>
              <div className="emp-det emp-fecha"><strong>Fecha:</strong> {fecha}</div>
              {oc.fechaEntrega && (
                <div className="emp-det"><strong>Entrega esperada:</strong> {fmtDate(oc.fechaEntrega)}</div>
              )}
            </div>
            <div className="tipo-box">
              <div className="tipo-titulo">ORDEN DE COMPRA</div>
              <div className="tipo-det"><strong>No.:</strong> {oc.numero}</div>
              <div className="tipo-det"><strong>Estado:</strong> {oc.estado}</div>
              {oc.usuario && (
                <div className="tipo-det"><strong>Solicitado por:</strong> {oc.usuario.nombre}</div>
              )}
            </div>
          </div>

          {/* SUPLIDOR */}
          <div className="cli-box">
            <div className="cli-grid">
              <div>
                <div className="cli-row"><span className="cli-lbl">Suplidor:</span> <strong>{oc.suplidor.nombre}</strong></div>
                {oc.suplidor.rnc && <div className="cli-row"><span className="cli-lbl">RNC:</span> {oc.suplidor.rnc}</div>}
                {oc.suplidor.telefono && <div className="cli-row"><span className="cli-lbl">Tel.:</span> {oc.suplidor.telefono}</div>}
                {oc.suplidor.email && <div className="cli-row"><span className="cli-lbl">Email:</span> {oc.suplidor.email}</div>}
              </div>
              <div>
                {oc.notas && (
                  <>
                    <div className="cli-row" style={{ marginBottom: 4 }}><span className="cli-lbl">Instrucciones:</span></div>
                    <div className="cli-row">{oc.notas}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* TABLA */}
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

          {/* FIRMAS */}
          <div className="firmas">
            <div className="firma">
              <div className="firma-line" />
              <div className="firma-lbl">
                Solicitado por{oc.usuario && <><br /><strong>{oc.usuario.nombre}</strong></>}
              </div>
            </div>
            <div className="firma">
              <div className="firma-line" />
              <div className="firma-lbl">Aprobado por</div>
            </div>
            <div className="firma">
              <div className="firma-line" />
              <div className="firma-lbl">Recibido por (Suplidor)</div>
            </div>
          </div>

          <div className="footer-line">
            {oc.numero} · Generada el {fecha} · {EMPRESA.nombre} · RNC {EMPRESA.rnc}
          </div>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #ebebeb; }
        .wrap { max-width: 860px; margin: 0 auto; padding: 0 16px 40px; }
        .doc { background: #fff; padding: 32px 40px 28px; margin-top: 10px; border-radius: 6px; box-shadow: 0 2px 12px rgba(0,0,0,.12); }

        .logo-area { padding-bottom: 18px; margin-bottom: 18px; border-bottom: 3.5px solid #f5821f; }

        .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 18px; align-items: start; }
        .emp-nombre { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
        .emp-det { font-size: 11px; color: #333; line-height: 1.7; }
        .emp-fecha { margin-top: 6px; }

        .tipo-box { text-align: right; }
        .tipo-titulo { font-size: 20px; font-weight: 700; color: #f5821f; line-height: 1.2; margin-bottom: 10px; }
        .tipo-det { font-size: 11.5px; color: #333; line-height: 1.9; }

        .cli-box { background: #f7f7f7; border-left: 4px solid #f5821f; border-radius: 0 4px 4px 0; padding: 11px 16px; margin-bottom: 18px; }
        .cli-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cli-row { font-size: 11.5px; line-height: 1.9; }
        .cli-lbl { color: #666; font-weight: 600; margin-right: 4px; }

        .tbl { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
        .th-l, .th-r, .th-c { padding: 7px 8px; background: #000204; color: #fff; font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
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

        .firmas { display: flex; gap: 32px; padding-top: 28px; border-top: 1px solid #e5e5e5; margin-top: 8px; margin-bottom: 14px; }
        .firma { flex: 1; }
        .firma-line { border-bottom: 1px solid #aaa; height: 44px; margin-bottom: 5px; }
        .firma-lbl { font-size: 10px; color: #888; text-align: center; }

        .footer-line { font-size: 10px; color: #777; text-align: center; padding-top: 14px; border-top: 1px solid #e8e8e8; }

        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .wrap { max-width: 100%; padding: 0; }
          .doc { box-shadow: none; border-radius: 0; margin: 0; padding: 18px 22px; }
          .th-l, .th-r, .th-c, .logo-area, .cli-box, .tf-total td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}
