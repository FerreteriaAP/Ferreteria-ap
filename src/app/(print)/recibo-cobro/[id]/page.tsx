/**
 * Recibo de Ingreso — Cobro CxC — impresora thermal 80mm
 * Carga datos de movimientoCaja por ID — mismo diseño que factura PDV
 */
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EMPRESA } from "@/lib/empresa";
import { PrintBtn } from "@/components/caja/print-btn";

interface PageProps { params: Promise<{ id: string }> }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtN = (n: any) => {
  const [ent, dec] = Number(n).toFixed(2).split(".");
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo", TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia", CHEQUE: "Cheque",
};

export default async function ReciboCobro({ params }: PageProps) {
  const { id } = await params;

  const mov = await prisma.movimientoCaja.findUnique({
    where: { id },
    include: {
      turno: { include: { usuario: { select: { nombre: true, apellido: true } } } },
    },
  });
  if (!mov || mov.subTipo !== "COBRO_CXC") notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cxc: any = null;
  if (mov.cxcId) {
    cxc = await prisma.cuentaPorCobrar.findUnique({
      where: { id: mov.cxcId },
      include: {
        venta:   { select: { numero: true } },
        cliente: { select: { nombre: true, rnc: true, telefono: true } },
      },
    });
  }

  const fecha = new Date(mov.fecha).toLocaleString("es-DO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const hoy = new Date().toLocaleString("es-DO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const cajeroNombre = `${mov.turno.usuario.nombre} ${mov.turno.usuario.apellido}`.trim();
  const metodoLabel = METODO_LABEL[mov.metodo ?? ""] ?? mov.metodo ?? "—";

  // Número de recibo secuencial: RCB/YYYY/NNNN
  const year = new Date(mov.fecha).getFullYear();
  const seq = await prisma.movimientoCaja.count({
    where: { subTipo: "COBRO_CXC", fecha: { lte: mov.fecha } },
  });
  const reciboNo = `RCB/${year}/${String(seq).padStart(4, "0")}`;

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
          <div className="doc-sub">Pago del: {fecha}</div>
        </div>

        <div className="guion"></div>

        {/* CLIENTE */}
        <div className="cli-nom">{cxc?.cliente?.nombre ?? "—"}</div>
        {cxc?.cliente?.rnc && (
          <div className="campo"><span>RNC:</span><span>{cxc.cliente.rnc}</span></div>
        )}
        {cxc?.cliente?.telefono && (
          <div className="campo"><span>Tel:</span><span>{cxc.cliente.telefono}</span></div>
        )}

        <div className="guion"></div>

        {/* DETALLE DEL PAGO */}
        <div className="sec-titulo">DETALLE DEL PAGO</div>

        {cxc?.venta?.numero && (
          <div className="campo">
            <span>Factura:</span>
            <span className="bold-mono">{cxc.venta.numero}</span>
          </div>
        )}
        <div className="campo">
          <span>Forma de pago:</span>
          <span>{metodoLabel}</span>
        </div>
        {mov.notas && (
          <div className="campo notas-campo">
            <span>Notas:</span>
            <span>{mov.notas}</span>
          </div>
        )}

        <div className="guion"></div>

        {/* MONTO GRANDE */}
        <div className="recibido-lbl">MONTO RECIBIDO</div>
        <div className="recibido-val">RD$ {fmtN(mov.monto)}</div>

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

        <div className="guion"></div>

        {/* CAJERO */}
        <div className="campo"><span>Cajero:</span><span>{cajeroNombre}</span></div>
        <div className="campo"><span>Ref. pago:</span><span>{reciboNo}</span></div>

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
        html, body {
          background: #bbbbbb !important;
          color: #000 !important;
          font-family: Arial, 'Helvetica Neue', sans-serif !important;
          font-size: 12px !important;
        }
        #recibo {
          width: 76mm; margin: 8px auto; background: #ffffff !important;
          padding: 8px 6px 20px; border-radius: 3px;
          box-shadow: 0 2px 8px rgba(0,0,0,.25);
        }

        /* ── Separadores ── */
        .dbl   { border-top: 2px solid #000; margin: 6px 0; border-bottom: 1px solid #000; padding-bottom: 1px; }
        .guion { border-top: 1px dashed #000; margin: 5px 0; }

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
        .cli-nom  { font-size: 12px; font-weight: 700; margin: 2px 0; }
        .campo    { display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 2px; gap: 4px; }
        .campo span:first-child { color: #000; }
        .bold-mono  { font-weight: 900; font-family: 'Courier New', monospace; }
        .notas-campo { font-style: italic; }

        /* ── Sección ── */
        .sec-titulo { font-size: 8px; font-weight: 900; text-transform: uppercase;
                      letter-spacing: .06em; margin: 0 0 5px; color: #000; }

        /* ── Monto grande ── */
        .recibido-lbl { font-size: 9px; font-weight: 900; text-transform: uppercase;
                        letter-spacing: .08em; margin-top: 4px; margin-bottom: 1px; }
        .recibido-val { font-size: 22px; font-weight: 900; font-family: 'Courier New', monospace;
                        margin-bottom: 8px; }

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
        }
      `}</style>
    </>
  );
}
