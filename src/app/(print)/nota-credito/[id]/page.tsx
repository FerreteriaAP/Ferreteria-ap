/**
 * Recibo Nota de Crédito — impresora thermal 80mm
 * Mismo sistema de diseño que la factura de venta PDV
 */
import { notFound } from "next/navigation";
import { getNotaCredito } from "@/actions/nota-credito";
import { EMPRESA } from "@/lib/empresa";
import { AutoPrint } from "@/components/caja/auto-print";

interface PageProps { params: Promise<{ id: string }> }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtN = (n: any) => {
  const [ent, dec] = Number(n).toFixed(2).split(".");
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

interface NCDetalle {
  productoId?: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export default async function ImprimirNotaCredito({ params }: PageProps) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nc = (await getNotaCredito(id)) as any;
  if (!nc) notFound();

  const fecha = new Date(nc.createdAt).toLocaleString("es-DO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const cajeroNombre = nc.turno?.usuario
    ? `${nc.turno.usuario.nombre} ${nc.turno.usuario.apellido}`.trim()
    : nc.usuario
      ? `${nc.usuario.nombre} ${nc.usuario.apellido}`.trim()
      : "No asignado";

  const detalles: NCDetalle[] = Array.isArray(nc.detalles) ? nc.detalles : [];

  return (
    <>
      <AutoPrint />

      <div id="recibo">

        {/* LOGO + EMPRESA */}
        <div className="centro">
          <svg width="42" height="42" viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg">
            <polygon points="21,2 49,2 67,20 67,50 49,68 21,68 3,50 3,20" fill="white" stroke="#000" strokeWidth="3"/>
            <polygon points="22,7 48,7 63,22 63,48 48,63 22,63 7,48 7,22" fill="none" stroke="#000" strokeWidth="1.5"/>
            <text x="35" y="35" dominantBaseline="central" textAnchor="middle"
              fontFamily="'Arial Black', Impact, sans-serif" fontSize="26" fontWeight="900" fill="#000">AP</text>
          </svg>
          <div className="emp-nom">FERRETERIA AP</div>
          <div className="emp-lin">{EMPRESA.dir}</div>
          <div className="emp-lin">{EMPRESA.ciudad}</div>
          <div className="emp-lin">RNC: {EMPRESA.rnc}</div>
          <div className="emp-lin">Tel.: {EMPRESA.tel}</div>
        </div>

        <div className="dbl"></div>

        {/* DOCUMENTO */}
        <div className="centro">
          <div className="doc-tipo">NOTA DE CRÉDITO</div>
        </div>
        <div>
          <div className="doc-num">Nota No. {nc.numero}</div>
          <div className="doc-sub">{fecha}</div>
          {nc.venta?.numero && (
            <div className="doc-ref">Factura original: {nc.venta.numero}</div>
          )}
          {nc.venta?.ncf && (
            <div className="doc-ref">NCF: {nc.venta.ncf}</div>
          )}
        </div>

        <div className="guion"></div>

        {/* CLIENTE */}
        {nc.cliente?.rnc && (
          <div className="campo"><span>RNC:</span><span>{nc.cliente.rnc}</span></div>
        )}
        <div className="cli-nom">{nc.cliente?.nombre ?? "—"}</div>
        {nc.cliente?.telefono && (
          <div className="campo"><span>Tel:</span><span>{nc.cliente.telefono}</span></div>
        )}

        {/* MOTIVO */}
        <div className="motivo-titulo">MOTIVO DE DEVOLUCIÓN</div>
        <div className="motivo-txt">{nc.motivo}</div>
        {nc.notas && <div className="motivo-txt notas-txt">{nc.notas}</div>}

        <div className="guion"></div>

        {/* ÍTEMS */}
        {detalles.length > 0 && (
          <>
            <div className="tbl-col-hdr tbl-hdr">
              <span className="cd">DESCRIPCION</span>
              <span className="ci">ITBIS</span>
              <span className="cv">VALOR</span>
            </div>
            <div className="linea"></div>

            {detalles.map((d, i) => {
              const subtotal  = Number(d.subtotal ?? 0);
              const itbisItem = subtotal * (18 / 118);
              const cant = Number(d.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 });
              return (
                <div key={i} className={i % 2 === 1 ? "item sombreado" : "item"}>
                  <div className="item-nom">{d.nombre}</div>
                  <div className="tbl-hdr" style={{ marginTop: 1 }}>
                    <span className="cd item-det">{cant} {d.unidad} x {fmtN(d.precioUnitario)}</span>
                    <span className="ci item-num">{fmtN(itbisItem)}</span>
                    <span className="cv item-num">{fmtN(subtotal)}</span>
                  </div>
                </div>
              );
            })}

            <div className="linea"></div>

            {/* subtotales con ITBIS */}
            <div className="tbl-hdr sub">
              <span className="cd">SUBTOTAL</span>
              <span className="ci">{fmtN(detalles.reduce((s, d) => s + Number(d.subtotal) * 18 / 118, 0))}</span>
              <span className="cv">{fmtN(nc.monto)}</span>
            </div>
            <div className="guion"></div>
          </>
        )}

        {/* TOTAL */}
        <div className="campo bold"><span>CRÉDITO EMITIDO</span><span>{fmtN(nc.monto)}</span></div>
        {Number(nc.montoRestante) < Number(nc.monto) && (
          <div className="campo"><span>Saldo disponible:</span><span>{fmtN(nc.montoRestante)}</span></div>
        )}

        {/* ESTADO */}
        <div className="estado-box">
          <span className="estado-val estado-borde">
            {nc.estado === "APLICADA" ? "CREDITO APLICADO" : "PENDIENTE DE APLICAR"}
          </span>
        </div>

        <div className="guion"></div>

        {/* CAJERO */}
        <div className="campo"><span>Cajero:</span><span>{cajeroNombre}</span></div>
        <div className="campo"><span>Ref. Nota:</span><span>{nc.numero}</span></div>

        <div className="dbl"></div>

        {/* FOOTER */}
        <div className="centro">
          <div className="gracias">Gracias por su preferencia!</div>
          <div className="wa-txt">WhatsApp: {EMPRESA.tel}</div>
        </div>

        <div className="guion"></div>

        <div className="pol-titulo">CONDICIONES DE LA NOTA DE CRÉDITO</div>
        <div className="pol">- Válida únicamente en Ferretería AP.</div>
        <div className="pol">- Válida por 90 días a partir de la fecha de emisión.</div>
        <div className="pol">- No canjeable por efectivo.</div>
        <div className="pol">- Presente este recibo al momento de utilizar el crédito.</div>
        <div className="pol">- Conserve este documento para sus registros.</div>

        <div className="guion"></div>

        <div className="centro">
          <div className="pie">RNC: {EMPRESA.rnc}</div>
          <div className="pie">Documento generado electrónicamente.</div>
        </div>

      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: Arial, 'Helvetica Neue', sans-serif;
          font-size: 12px; color: #000; background: #bbb;
        }
        #recibo {
          width: 76mm; margin: 8px auto; background: #fff;
          padding: 8px 6px 20px; border-radius: 3px;
          box-shadow: 0 2px 8px rgba(0,0,0,.25);
        }

        /* ── Separadores ── */
        .dbl   { border-top: 2px solid #000; margin: 6px 0; border-bottom: 1px solid #000; padding-bottom: 1px; }
        .guion { border-top: 1px dashed #000; margin: 5px 0; }
        .linea { border-top: 1px solid #000; margin: 3px 0; }

        /* ── Empresa ── */
        .centro     { text-align: center; }
        .centro svg { display: block; margin: 0 auto 3px; }
        .emp-nom    { font-size: 14px; font-weight: 900; letter-spacing: .03em; margin: 3px 0 2px; }
        .emp-lin    { font-size: 9.5px; line-height: 1.6; color: #222; }

        /* ── Documento ── */
        .doc-tipo { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
        .doc-num  { font-size: 12px; font-weight: 900; font-family: 'Courier New', monospace; }
        .doc-sub  { font-size: 9.5px; color: #222; margin-top: 1px; }
        .doc-ref  { font-size: 9px; color: #333; margin-top: 2px; }

        /* ── Cliente ── */
        .cli-nom { font-size: 12px; font-weight: 700; margin: 2px 0; }
        .campo   { display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 2px; gap: 4px; }
        .campo span:first-child { color: #000; }
        .campo.bold { font-weight: 700; font-size: 12px; font-family: 'Courier New', monospace; }

        /* ── Motivo ── */
        .motivo-titulo { font-size: 8px; font-weight: 900; text-transform: uppercase;
                         letter-spacing: .06em; margin: 5px 0 2px; color: #000; }
        .motivo-txt    { font-size: 9.5px; color: #000; line-height: 1.5; margin-bottom: 2px;
                         white-space: pre-wrap; word-break: break-word; }
        .notas-txt     { font-style: italic; color: #333; }

        /* ── Columnas tabla ── */
        .tbl-hdr { display: flex; align-items: baseline; gap: 2px; }
        .cd { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ci { width: 46px; text-align: right; flex-shrink: 0; font-family: 'Courier New', monospace; white-space: nowrap; }
        .cv { width: 56px; text-align: right; flex-shrink: 0; font-family: 'Courier New', monospace; white-space: nowrap; }

        .tbl-col-hdr { font-size: 8px; font-weight: 900; color: #000;
                       text-transform: uppercase; letter-spacing: .04em; padding-bottom: 2px; }
        .tbl-col-hdr span { color: #000; font-weight: 900; }

        .tbl-hdr.sub { font-size: 9.5px; margin-bottom: 2px; font-weight: 700; color: #000; }
        .tbl-hdr.sub span { color: #000; }

        /* ── Productos ── */
        .item      { margin-bottom: 5px; }
        .sombreado { background: #e0e0e0; padding: 1px 2px; }
        .item-nom  { font-size: 10.5px; font-weight: 700; line-height: 1.3; white-space: normal; word-break: break-word; }
        .item-det  { font-size: 9px; color: #222; }
        .item-num  { font-size: 9.5px; font-weight: 700; }

        /* ── Estado ── */
        .estado-box   { margin: 4px 0; }
        .estado-val   { display: block; font-size: 9px; font-weight: 900; text-align: center;
                        padding: 3px 0; border-radius: 2px; }
        .estado-borde { border: 1.5px solid #000; }

        /* ── Footer ── */
        .gracias    { font-size: 12px; font-weight: 900; margin-bottom: 2px; }
        .wa-txt     { font-size: 9.5px; color: #222; }
        .pol-titulo { font-size: 9px; font-weight: 900; text-transform: uppercase;
                      letter-spacing: .08em; text-align: center; margin: 3px 0; }
        .pol        { font-size: 8.5px; color: #222; line-height: 1.6; margin-bottom: 2px; }
        .pie        { font-size: 8.5px; color: #333; line-height: 1.6; }

        /* ══ IMPRESIÓN THERMAL ══ */
        @media print {
          @page { size: 80mm auto; margin: 3mm 0mm; }
          body  { background: white; margin: 0; padding: 0; }
          #recibo {
            width: 100%; max-width: 100%; margin: 0;
            padding: 2mm 6mm 8mm; border-radius: 0; box-shadow: none;
          }
          * { color: #000 !important; background: white !important; }
          .sombreado { background: #ddd !important; }
        }
      `}</style>
    </>
  );
}
