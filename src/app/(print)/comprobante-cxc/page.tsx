/**
 * Recibo de Ingreso — Cobro de CxC — impresora thermal 80mm
 * Mismo sistema de diseño que la factura de venta PDV
 *
 * Datos via searchParams: cliente, rnc, monto, metodo, fecha,
 *   ref, facturas (FAC/2026/0001:500.00,...), notas
 */
import { EMPRESA } from "@/lib/empresa";
import { PrintBtn } from "@/components/caja/print-btn";

interface PageProps {
  searchParams: Promise<{
    cliente?: string;
    rnc?: string;
    monto?: string;
    metodo?: string;
    fecha?: string;
    ref?: string;
    facturas?: string; // "NUMERO:MONTO,NUMERO:MONTO"
    notas?: string;
  }>;
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO:      "Efectivo",
  TARJETA:       "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  CHEQUE:        "Cheque",
};

const fmtN = (n: number) => {
  const [ent, dec] = n.toFixed(2).split(".");
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

export default async function ComprobanteCxC({ searchParams }: PageProps) {
  const sp = await searchParams;
  const cliente  = sp.cliente ?? "—";
  const rnc      = sp.rnc ?? null;
  const monto    = parseFloat(sp.monto ?? "0") || 0;
  const metodo   = sp.metodo ?? "";
  const ref      = sp.ref ?? null;
  const notas    = sp.notas ?? null;
  const reciboNo = Date.now().toString(36).toUpperCase().slice(-8);

  const fechaPago = sp.fecha
    ? new Date(sp.fecha).toLocaleString("es-DO", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : new Date().toLocaleDateString("es-DO");

  const hoy = new Date().toLocaleString("es-DO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const facturas = (sp.facturas ?? "")
    .split(",")
    .filter(Boolean)
    .map(part => {
      const [numero, montoStr] = part.split(":");
      return { numero: numero ?? "", monto: parseFloat(montoStr ?? "0") || 0 };
    });

  const metodoLabel = METODO_LABEL[metodo] ?? (metodo || "—");

  return (
    <>
      <PrintBtn />

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
          <div className="doc-tipo">RECIBO DE INGRESO</div>
        </div>
        <div>
          <div className="doc-num">Recibo No. {reciboNo}</div>
          <div className="doc-sub">Impreso: {hoy}</div>
          <div className="doc-sub">Pago del: {fechaPago}</div>
        </div>

        <div className="guion"></div>

        {/* CLIENTE */}
        {rnc && <div className="campo"><span>RNC:</span><span>{rnc}</span></div>}
        <div className="cli-nom">{cliente}</div>

        <div className="guion"></div>

        {/* DETALLE DE FACTURAS */}
        {facturas.length > 0 && (
          <>
            <div className="sec-titulo">FACTURAS PAGADAS</div>
            <div className="tbl-col-hdr tbl-hdr">
              <span className="cd">FACTURA</span>
              <span className="cv">MONTO</span>
            </div>
            <div className="linea"></div>

            {facturas.map((f, i) => (
              <div key={i} className={i % 2 === 1 ? "item sombreado" : "item"}>
                <div className="tbl-hdr">
                  <span className="cd item-fac">{f.numero}</span>
                  <span className="cv item-num">{fmtN(f.monto)}</span>
                </div>
              </div>
            ))}

            <div className="linea"></div>

            {facturas.length > 1 && (
              <div className="tbl-hdr sub">
                <span className="cd">SUBTOTAL</span>
                <span className="cv">{fmtN(monto)}</span>
              </div>
            )}

            <div className="guion"></div>
          </>
        )}

        {/* FORMA DE PAGO */}
        <div className="campo"><span>Forma de pago:</span><span>{metodoLabel}</span></div>
        {ref && <div className="campo"><span>Referencia:</span><span>{ref}</span></div>}
        {notas && <div className="campo notas-campo"><span>Notas:</span><span>{notas}</span></div>}

        <div className="guion"></div>

        {/* MONTO GRANDE */}
        <div className="recibido-lbl">MONTO RECIBIDO</div>
        <div className="recibido-val">RD$ {fmtN(monto)}</div>

        {/* FIRMAS */}
        <div className="firmas">
          <div className="firma">
            <div className="firma-linea"></div>
            <div className="firma-txt">Recibido por</div>
          </div>
          <div className="firma">
            <div className="firma-linea"></div>
            <div className="firma-txt">Firma del cliente</div>
          </div>
        </div>

        <div className="dbl"></div>

        {/* FOOTER */}
        <div className="centro">
          <div className="gracias">Gracias por su pago!</div>
          <div className="wa-txt">WhatsApp: {EMPRESA.tel}</div>
        </div>

        <div className="guion"></div>

        <div className="pol-titulo">INFORMACIÓN</div>
        <div className="pol">- Conserve este recibo como comprobante de pago.</div>
        <div className="pol">- Para consultas comuníquese al {EMPRESA.tel}.</div>

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

        /* ── Cliente ── */
        .cli-nom { font-size: 12px; font-weight: 700; margin: 2px 0; }
        .campo   { display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 2px; gap: 4px; }
        .campo span:first-child { color: #000; }
        .notas-campo { font-style: italic; }

        /* ── Sección ── */
        .sec-titulo { font-size: 8px; font-weight: 900; text-transform: uppercase;
                      letter-spacing: .06em; margin: 0 0 3px; color: #000; }

        /* ── Columnas tabla ── */
        .tbl-hdr { display: flex; align-items: baseline; gap: 2px; }
        .cd { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cv { width: 60px; text-align: right; flex-shrink: 0; font-family: 'Courier New', monospace; white-space: nowrap; }

        .tbl-col-hdr { font-size: 8px; font-weight: 900; color: #000;
                       text-transform: uppercase; letter-spacing: .04em; padding-bottom: 2px; }
        .tbl-col-hdr span { color: #000; font-weight: 900; }
        .tbl-hdr.sub { font-size: 9.5px; margin-bottom: 2px; font-weight: 700; color: #000; }
        .tbl-hdr.sub span { color: #000; }

        /* ── Ítems ── */
        .item      { margin-bottom: 3px; }
        .sombreado { background: #e0e0e0; padding: 1px 2px; }
        .item-fac  { font-size: 9.5px; font-weight: 700; font-family: 'Courier New', monospace; }
        .item-num  { font-size: 9.5px; font-weight: 700; }

        /* ── Monto grande ── */
        .recibido-lbl { font-size: 9px; font-weight: 900; text-transform: uppercase;
                        letter-spacing: .08em; margin-top: 4px; margin-bottom: 1px; }
        .recibido-val { font-size: 22px; font-weight: 900; font-family: 'Courier New', monospace;
                        letter-spacing: .02em; margin-bottom: 8px; }

        /* ── Firmas ── */
        .firmas     { display: flex; gap: 12px; margin: 6px 0 2px; }
        .firma      { flex: 1; }
        .firma-linea { border-bottom: 1px solid #000; height: 24px; margin-bottom: 3px; }
        .firma-txt  { font-size: 8px; text-align: center; color: #333; }

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
