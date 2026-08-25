import { notFound } from "next/navigation";
import { getVenta } from "@/actions/ventas";
import { PrintButtons } from "@/components/nominas/print-buttons";
import { PrintLogo } from "@/components/print/logo";
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

  // Máximo 8 artículos por conduce
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allItems: any[] = conduce?.detallesRecepcion?.length
    ? conduce.detallesRecepcion
    : v.detalles;
  const items = allItems.slice(0, 8);

  // detallesRecepcion es un JSON blob sin producto.codigo — construir mapa desde v.detalles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const codigoMap: Record<string, string> = Object.fromEntries(
    (v.detalles ?? []).map((d: any) => [d.productoId, d.producto?.codigo ?? ""])
  );

  const docNumero = conduce?.numero ?? v.numero;

  return (
    <>
      <PrintButtons />
      <p className="no-print" style={{ textAlign: "center", fontSize: 12, color: "#888", padding: "16px 0 6px" }}>
        Papel: <strong>8½&quot; × 5½&quot;</strong> · Presiona <strong>Ctrl+P</strong> / <strong>⌘+P</strong> para imprimir
      </p>

      <div className="wrap">
        <div className="doc">

          {/* ── ENCABEZADO ── */}
          <div className="hdr">
            <div className="hdr-logo">
              <PrintLogo width={260} height={66} />
              <div className="emp-sub">{EMPRESA.tel} · {EMPRESA.dir}, {EMPRESA.ciudad}</div>
            </div>
            <div className="hdr-doc">
              <div className="doc-tipo">CONDUCE DE ENTREGA</div>
              <div className="doc-num">{docNumero}</div>
              <div className="doc-fecha">{fecha}</div>
            </div>
          </div>

          {/* ── INFO CLIENTE / ENTREGA ── */}
          <div className="info-grid">
            {/* IZQUIERDA (2/3): Entregar A — nombre + tel en misma fila, dirección abajo */}
            <div className="info-block">
              <div className="info-lbl">ENTREGAR A</div>
              <div className="info-row-top">
                <span className="info-val-lg">{v.cliente.nombre}</span>
                {conduce?.telefonoRecibido && (
                  <span className="info-tel">📞 {conduce.telefonoRecibido}</span>
                )}
              </div>
              {v.cliente.rnc && <div className="info-val">RNC: {v.cliente.rnc}</div>}
              {v.direccion && (
                <div className="info-val">
                  {v.direccion.etiqueta}: {v.direccion.direccion}
                  {v.direccion.sector ? `, ${v.direccion.sector}` : ""}
                  {v.direccion.ciudad ? ` – ${v.direccion.ciudad}` : ""}
                </div>
              )}
              {v.direccion?.referencia && (
                <div className="info-val" style={{ fontStyle: "italic" }}>Ref: {v.direccion.referencia}</div>
              )}
            </div>

            {/* DERECHA (1/3): solo Ref. Orden + Observaciones (despacho/chofer van en firmas) */}
            <div className="info-block">
              <div className="info-lbl">REF. ORDEN DE VENTA</div>
              <div className="info-val-lg">{v.numero}</div>
              {(conduce?.observaciones || v.notas) && (
                <><div className="info-lbl" style={{ marginTop: 4 }}>OBSERVACIONES</div>
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
                  <td className="td-cod">{item.producto?.codigo || codigoMap[item.productoId] || "—"}</td>
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
                  {allItems.length > 8 ? ` de ${allItems.length} · Ver conduces adicionales` : ""}
                  {conduce?.detallesRecepcion?.length ? " · Envío parcial" : ""}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>

          {/* ── FIRMAS (margin-top:auto las empuja al fondo cuando hay espacio) ── */}
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


        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; color: #000; background: #e8e8e8; }

        .wrap { max-width: 760px; margin: 0 auto; padding: 0 12px 24px; }
        .doc {
          background: #fff;
          border: 1px solid #999;
          padding: 14px 18px 10px;
          margin-top: 10px;
          display: flex;
          flex-direction: column;
        }

        /* ── ENCABEZADO ── */
        .hdr {
          display: flex; justify-content: space-between; align-items: center;
          border-bottom: 2.5px solid #000;
          padding-bottom: 7px; margin-bottom: 7px;
        }
        .hdr-logo { display: flex; flex-direction: column; gap: 0; }
        .emp-sub { font-size: 7.5px; color: #444; margin-top: 2px; }
        .hdr-doc { text-align: right; }
        .doc-tipo { font-size: 7.5px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #555; }
        .doc-num { font-size: 17px; font-weight: 900; line-height: 1.1; }
        .doc-fecha { font-size: 9px; color: #444; margin-top: 2px; }

        /* ── INFO CLIENTE ── */
        .info-grid {
          display: grid; grid-template-columns: 2fr 1fr; gap: 0;
          margin-bottom: 6px;
          border: 1px solid #000;
        }
        .info-block { padding: 5px 9px; }
        .info-block + .info-block { border-left: 1px solid #bbb; }
        .info-lbl { font-size: 7px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #777; margin-bottom: 2px; }
        /* nombre + teléfono en la misma fila */
        .info-row-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
        .info-val-lg { font-size: 11px; font-weight: 700; line-height: 1.3; }
        .info-val { font-size: 8px; color: #333; line-height: 1.5; }
        .info-tel { font-size: 9.5px; font-weight: 700; color: #000; white-space: nowrap; }

        /* ── TABLA ── */
        .tbl { width: 100%; border-collapse: collapse; margin-bottom: 3px; font-size: 9px; }
        .th-n, .th-cod, .th-desc, .th-qty, .th-uni, .th-chk {
          padding: 3px 5px;
          border: 1px solid #000;
          font-weight: 900; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.04em;
          background: #eee;
          text-align: left;
        }
        .th-qty, .th-n { text-align: right; }
        .th-chk { width: 20px; text-align: center; }
        .th-n { width: 18px; }
        .th-cod { width: 70px; }
        .th-uni { width: 52px; }
        .tr-alt { background: #f5f5f5; }
        .td-n, .td-cod, .td-desc, .td-qty, .td-uni, .td-chk {
          padding: 3px 5px; border: 1px solid #ccc; vertical-align: middle;
        }
        .td-n { text-align: center; color: #666; font-size: 8px; }
        .td-cod { font-family: 'Courier New', monospace; font-size: 8.5px; }
        .td-qty { text-align: right; font-weight: 700; }
        .td-chk { border: 1px solid #000; }
        .tf-lines { padding: 2px 5px; font-size: 7.5px; color: #555; border-top: 1px solid #000; }

        /* ── FIRMAS — margin-top:auto las empuja al fondo con espacio libre ── */
        .firmas {
          display: flex; gap: 14px;
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px solid #000;
        }
        .firma { flex: 1; }
        .firma-line { border-bottom: 1px solid #000; height: 30px; margin-bottom: 3px; }
        .firma-lbl { font-size: 8px; text-align: center; color: #444; }

        /* ── FOOTER ── */
        .footer { font-size: 7px; color: #999; text-align: center; margin-top: 5px; padding-top: 3px; border-top: 1px solid #ddd; }

        /* ── PRINT ── */
        /* Cuando Chrome usa "Ninguno" en márgenes, ignora @page { margin }.
           El padding en .doc es el único margen que Chrome NO sobrescribe. */
        @media print {
          @page { margin: 3mm 0; }
          html, body { width: 100%; margin: 0; padding: 0; }
          body { background: white; font-size: 10px; }
          .no-print { display: none !important; }
          .wrap { width: 100%; max-width: 100%; margin: 0; padding: 0; }
          .doc {
            box-sizing: border-box;
            width: 100%;
            border: none;
            /* padding lateral en el elemento — no se anula con "Ninguno" en Chrome */
            padding: 0 8mm;
            margin: 0;
            min-height: calc(5.5in - 6mm);
          }
          /* table-layout:fixed fuerza la tabla a respetar el ancho del contenedor */
          .tbl { table-layout: fixed; }
          /* Courier New se ve mal a 120×72 dpi — usar Arial */
          .td-cod { font-family: Arial, sans-serif; font-size: 9px; letter-spacing: 0; }
          /* Firmas más legibles */
          .firma-lbl { font-size: 9px; }
          .firma-lbl strong { font-size: 10.5px; }
          /* Fuentes un poco más grandes */
          .doc-num { font-size: 19px; }
          .info-val-lg { font-size: 12px; }
          .info-tel { font-size: 10.5px; }
          .td-desc { font-size: 9.5px; }
          .th-n, .th-cod, .th-desc, .th-qty, .th-uni, .th-chk, .tr-alt {
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
