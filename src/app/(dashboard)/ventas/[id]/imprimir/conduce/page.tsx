import { notFound } from "next/navigation";
import { getVenta } from "@/actions/ventas";
import { PrintButtons } from "@/components/nominas/print-buttons";
import { EMPRESA } from "@/lib/empresa";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conduce = conduceId
    ? (v.conduces ?? []).find((c: any) => c.id === conduceId) ?? v.conduces?.[0]
    : v.conduces?.[0];

  const fecha = new Date(v.fechaEmision ?? new Date()).toLocaleDateString("es-DO", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = conduce?.detallesRecepcion?.length
    ? conduce.detallesRecepcion
    : v.detalles;

  const docNumero = conduce?.numero ?? v.numero;

  return (
    <>
      <PrintButtons />
      <p className="no-print" style={{ textAlign: "center", fontSize: 12, color: "#888", padding: "16px 0 6px" }}>
        Papel: <strong>8&quot; × 5.5&quot;</strong> · Presiona <strong>Ctrl+P</strong> / <strong>⌘+P</strong> para imprimir
      </p>

      <div className="wrap">
        <div className="doc">

          {/* ── ENCABEZADO ── */}
          <div className="hdr">
            <div className="hdr-empresa">
              {/* Logo textual — sin fondos de color para matricial */}
              <div className="logo-text">
                <span className="logo-ap">AP</span>
                <span className="logo-ferreteria"> FERRETERÍA AP</span>
              </div>
              <div className="emp-info">{EMPRESA.dir} · {EMPRESA.ciudad}</div>
              <div className="emp-info">Tel: {EMPRESA.tel} · RNC: {EMPRESA.rnc}</div>
            </div>
            <div className="hdr-doc">
              <div className="doc-tipo">CONDUCE DE ENTREGA</div>
              <div className="doc-num">{docNumero}</div>
              <div className="doc-fecha">{fecha}</div>
            </div>
          </div>

          {/* ── INFO CLIENTE / ENTREGA ── */}
          <div className="info-grid">
            <div className="info-block">
              <div className="info-lbl">ENTREGAR A</div>
              <div className="info-val-lg">{v.cliente.nombre}</div>
              {v.cliente.rnc && <div className="info-val">RNC: {v.cliente.rnc}</div>}
              {v.direccion && (
                <div className="info-val">
                  {v.direccion.etiqueta}: {v.direccion.direccion}
                  {v.direccion.sector ? `, ${v.direccion.sector}` : ""}
                  {v.direccion.ciudad ? ` – ${v.direccion.ciudad}` : ""}
                </div>
              )}
              {v.direccion?.referencia && (
                <div className="info-val">Ref: {v.direccion.referencia}</div>
              )}
            </div>
            <div className="info-block">
              <div className="info-lbl">REF. ORDEN DE VENTA</div>
              <div className="info-val-lg">{v.numero}</div>
              {conduce?.firmaEntregado && (
                <><div className="info-lbl" style={{ marginTop: 5 }}>ENTREGADO POR</div>
                  <div className="info-val">{conduce.firmaEntregado}</div></>
              )}
              {conduce?.firmaChofer && (
                <><div className="info-lbl" style={{ marginTop: 5 }}>CHOFER</div>
                  <div className="info-val">{conduce.firmaChofer}</div></>
              )}
              {(conduce?.observaciones || v.notas) && (
                <><div className="info-lbl" style={{ marginTop: 5 }}>OBSERVACIONES</div>
                  <div className="info-val">{conduce?.observaciones ?? v.notas}</div></>
              )}
            </div>
          </div>

          {/* ── TABLA DE PRODUCTOS ── */}
          <table className="tbl">
            <thead>
              <tr>
                <th className="th-n">#</th>
                <th className="th-cod">Código</th>
                <th className="th-desc">Descripción</th>
                <th className="th-qty">Cantidad</th>
                <th className="th-uni">Unidad</th>
                <th className="th-chk">✓</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {items.map((item: any, i: number) => (
                <tr key={item.id ?? item.productoId} className={i % 2 === 0 ? "tr-alt" : ""}>
                  <td className="td-n">{i + 1}</td>
                  <td className="td-cod">{item.producto?.codigo ?? "—"}</td>
                  <td className="td-desc">{item.descripcion ?? item.nombre ?? item.producto?.nombre}</td>
                  <td className="td-qty">
                    {Number(item.cantEnviada ?? item.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 })}
                  </td>
                  <td className="td-uni">{item.unidad ?? item.producto?.unidadMedida}</td>
                  <td className="td-chk"></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="tf-lines">
                  Total líneas: <strong>{items.length}</strong>
                  {conduce?.detallesRecepcion?.length ? " · Envío parcial" : ""}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>

          {/* ── FIRMAS ── */}
          <div className="firmas">
            <div className="firma">
              <div className="firma-line"></div>
              <div className="firma-lbl">
                Entregado por
                {conduce?.firmaEntregado && <><br /><strong>{conduce.firmaEntregado}</strong></>}
              </div>
            </div>
            <div className="firma">
              <div className="firma-line"></div>
              <div className="firma-lbl">
                Recibido por (cliente)
                {conduce?.firmaRecibido && <><br /><strong>{conduce.firmaRecibido}</strong></>}
              </div>
            </div>
            <div className="firma">
              <div className="firma-line"></div>
              <div className="firma-lbl">
                Chofer
                {conduce?.firmaChofer && <><br /><strong>{conduce.firmaChofer}</strong></>}
              </div>
            </div>
          </div>

          <div className="footer">
            Al firmar este conduce el cliente confirma haber recibido los productos en perfectas condiciones ·{" "}
            {docNumero} · {fecha}
          </div>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; color: #000; background: #e8e8e8; }

        .wrap { max-width: 680px; margin: 0 auto; padding: 0 12px 24px; }
        .doc {
          background: #fff;
          border: 1px solid #999;
          padding: 14px 18px 12px;
          margin-top: 10px;
        }

        /* ── ENCABEZADO ── */
        .hdr {
          display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 2px solid #000;
          padding-bottom: 8px; margin-bottom: 8px;
        }
        .logo-text { display: flex; align-items: baseline; gap: 0; margin-bottom: 3px; }
        .logo-ap {
          font-size: 15px; font-weight: 900; font-family: 'Arial Black', Impact, sans-serif;
          border: 2px solid #000; padding: 0 4px; letter-spacing: -0.5px;
        }
        .logo-ferreteria {
          font-size: 13px; font-weight: 900; font-family: 'Arial Black', Impact, sans-serif;
          letter-spacing: 0.02em; margin-left: 4px;
        }
        .emp-info { font-size: 8px; color: #333; line-height: 1.5; }
        .hdr-doc { text-align: right; }
        .doc-tipo { font-size: 7.5px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #555; }
        .doc-num { font-size: 14px; font-weight: 900; line-height: 1.1; }
        .doc-fecha { font-size: 9px; color: #444; margin-top: 1px; }

        /* ── INFO CLIENTE ── */
        .info-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
          margin-bottom: 8px;
          border: 1px solid #000; padding: 7px 9px;
        }
        .info-block + .info-block { border-left: 1px solid #bbb; padding-left: 9px; }
        .info-lbl { font-size: 7px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #777; margin-bottom: 2px; }
        .info-val-lg { font-size: 11px; font-weight: 700; line-height: 1.3; }
        .info-val { font-size: 8.5px; color: #333; line-height: 1.5; }

        /* ── TABLA ── */
        .tbl { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9px; }
        .th-n, .th-cod, .th-desc, .th-qty, .th-uni, .th-chk {
          padding: 4px 5px;
          border: 1px solid #000;
          font-weight: 900; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.04em;
          background: #eee;
          text-align: left;
        }
        .th-qty, .th-n { text-align: right; }
        .th-chk { width: 22px; text-align: center; }
        .th-n { width: 18px; }
        .th-cod { width: 70px; }
        .th-uni { width: 52px; }
        .tr-alt { background: #f5f5f5; }
        .td-n, .td-cod, .td-desc, .td-qty, .td-uni, .td-chk {
          padding: 4px 5px; border: 1px solid #ccc; vertical-align: middle;
        }
        .td-n { text-align: center; color: #666; font-size: 8px; }
        .td-cod { font-family: 'Courier New', monospace; font-size: 8.5px; }
        .td-qty { text-align: right; font-weight: 700; }
        .td-chk { border: 1px solid #000; }
        .tf-lines { padding: 4px 5px; font-size: 8px; color: #555; border-top: 1px solid #000; }

        /* ── FIRMAS ── */
        .firmas { display: flex; gap: 16px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #000; }
        .firma { flex: 1; }
        .firma-line { border-bottom: 1px solid #000; height: 28px; margin-bottom: 3px; }
        .firma-lbl { font-size: 8px; text-align: center; color: #444; }

        /* ── FOOTER ── */
        .footer { font-size: 7.5px; color: #999; text-align: center; margin-top: 6px; padding-top: 5px; border-top: 1px solid #ddd; }

        /* ── PRINT ── */
        @media print {
          @page { size: 8in 5.5in; margin: 0.28in 0.32in; }
          body { background: white; }
          .no-print { display: none !important; }
          .wrap { max-width: 100%; margin: 0; padding: 0; }
          .doc { border: none; padding: 0; margin: 0; }
          .th-n, .th-cod, .th-desc, .th-qty, .th-uni, .th-chk {
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
