/**
 * Recibo de venta PDV — impresora thermal 80mm
 * Optimizado para impresión térmica: negro puro, columnas calibradas, sin grises
 */
import { notFound } from "next/navigation";
import { getVenta } from "@/actions/ventas";
import { EMPRESA, CREDITO_LABEL, NCF_LABEL } from "@/lib/empresa";
import { AutoPrint } from "@/components/caja/auto-print";

interface PageProps { params: Promise<{ id: string }> }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtN = (n: any) => {
  const [ent, dec] = Number(n).toFixed(2).split(".");
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

const METODO_LABEL: Record<string, string> = {
  EFECTIVO:      "Efectivo",
  TARJETA:       "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  CHEQUE:        "Cheque",
};

export default async function ReciboVentaPDV({ params }: PageProps) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (await getVenta(id)) as any;
  if (!v || v.tipo !== "FACTURADA") notFound();

  const fecha = new Date(v.fechaEmision ?? new Date()).toLocaleString("es-DO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const vendedorNombre = v.vendedor
    ? `${v.vendedor.nombre} ${v.vendedor.apellido}`.trim()
    : "No asignado";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pagos: { metodo: string; monto: number; referencia: string | null }[] = (v.pagosRecibidos ?? []).map((p: any) => ({
    metodo: p.metodo,
    monto: Number(p.monto),
    referencia: p.referencia ?? null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detalles = v.detalles.map((d: any) => {
    const subtotal  = Number(d.subtotal);
    const itbisItem = d.exentoItbis ? 0 : subtotal * 0.18;
    const valorItem = subtotal + itbisItem;
    return { ...d, subtotal, itbisItem, valorItem };
  });

  const totalItbis = detalles.reduce((s: number, d: { itbisItem: number }) => s + d.itbisItem, 0);
  const totalValor = detalles.reduce((s: number, d: { valorItem: number }) => s + d.valorItem, 0);
  const tieneDesc  = detalles.some((d: { descuento: number }) => Number(d.descuento) > 0);
  const totalDesc  = detalles.reduce((s: number, d: { descuento: number }) => s + Number(d.descuento ?? 0), 0);

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
          <div className="doc-tipo">{v.tipoNcf ? (NCF_LABEL[v.tipoNcf] ?? "FACTURA DE VENTA") : "FACTURA DE VENTA"}</div>
          <div className="doc-num"># {v.numero}</div>
          <div className="doc-sub">{fecha}</div>
          {v.ncf && <div className="doc-sub">NCF: {v.ncf}</div>}
        </div>

        <div className="guion"></div>

        {/* CLIENTE */}
        {v.cliente.rnc && <div className="campo"><span>RNC:</span><span>{v.cliente.rnc}</span></div>}
        <div className="cli-nom">{v.cliente.nombre}</div>
        {v.cliente.telefono && <div className="campo"><span>Tel:</span><span>{v.cliente.telefono}</span></div>}
        <div className="campo"><span>Condicion:</span><span>{CREDITO_LABEL[v.credito] ?? v.credito}</span></div>

        <div className="guion"></div>

        {/* CABECERA TABLA */}
        <div className="tbl-hdr">
          <span className="cd">DESCRIPCION</span>
          <span className="ci">ITBIS</span>
          <span className="cv">VALOR</span>
        </div>
        <div className="linea"></div>

        {/* PRODUCTOS */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {detalles.map((d: any, i: number) => {
          const nombre = (d.descripcion ?? d.producto.nombre) as string;
          const codigo = d.producto?.codigo as string | null ?? null;
          const unidad = (d.unidad ?? d.producto.unidadMedida) as string;
          const cant   = Number(d.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 });
          return (
            <div key={d.id} className={i % 2 === 1 ? "item sombreado" : "item"}>
              <div className="item-nom">{nombre}</div>
              {codigo && <div className="item-cod">{codigo}</div>}
              <div className="tbl-hdr" style={{ marginTop: 1 }}>
                <span className="cd item-det">{cant} {unidad} x {fmtN(d.precio)}</span>
                <span className="ci item-num">{d.exentoItbis ? "  -" : fmtN(d.itbisItem)}</span>
                <span className="cv item-num">{fmtN(d.valorItem)}</span>
              </div>
              {Number(d.descuento ?? 0) > 0 && <div className="item-desc">Desc: -{fmtN(d.descuento)}</div>}
              {d.exentoItbis && <div className="item-tag">Exento ITBIS</div>}
            </div>
          );
        })}

        <div className="linea"></div>

        {/* SUBTOTALES */}
        {tieneDesc && (
          <div className="tbl-hdr sub">
            <span className="cd">Descuento</span>
            <span className="ci"></span>
            <span className="cv">-{fmtN(totalDesc)}</span>
          </div>
        )}
        <div className="tbl-hdr sub">
          <span className="cd">SUBTOTAL</span>
          <span className="ci">{fmtN(totalItbis)}</span>
          <span className="cv">{fmtN(totalValor)}</span>
        </div>

        <div className="guion"></div>

        {/* TOTAL A PAGAR — 3 filas separadas, sin colisiones */}
        <div className="campo bold"><span>ITBIS</span><span>{fmtN(totalItbis)}</span></div>
        <div className="campo total-final"><span>TOTAL A PAGAR</span><span>{fmtN(totalValor)}</span></div>

        <div className="guion"></div>

        {/* PAGOS */}
        {pagos.map((p, i) => (
          <div key={i} className="campo bold">
            <span>{METODO_LABEL[p.metodo] ?? p.metodo}{p.referencia ? ` (${p.referencia})` : ""}</span>
            <span>{fmtN(p.monto)}</span>
          </div>
        ))}

        <div className="guion"></div>

        {/* CAJERO / TICKET */}
        <div className="campo"><span>Cajero:</span><span>{vendedorNombre}</span></div>
        <div className="campo"><span>Ticket:</span><span>{v.numero}</span></div>

        <div className="dbl"></div>

        {/* FOOTER */}
        <div className="centro">
          <div className="gracias">Gracias por su compra!</div>
          <div className="wa-txt">WhatsApp: {EMPRESA.tel}</div>
        </div>

        <div className="guion"></div>

        {/* POLITICA */}
        <div className="pol-titulo">POLITICA DE DEVOLUCIONES</div>
        <div className="pol">- Devoluciones hasta 30 dias con factura original.</div>
        <div className="pol">- Producto en estado original, sin uso ni danos.</div>
        <div className="pol">- No aplican devoluciones en efectivo; se emite nota de credito.</div>
        <div className="pol">- Revise sus productos antes de retirarse.</div>
        <div className="pol">- Danos por mal uso quedan fuera de garantia.</div>

        <div className="guion"></div>

        {/* PIE */}
        <div className="centro">
          <div className="pie">RNC: {EMPRESA.rnc}</div>
          <div className="pie">Documento generado electronicamente.</div>
          <div className="pie">Conserve esta factura para reclamaciones.</div>
        </div>

      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: Arial, 'Helvetica Neue', sans-serif;
          font-size: 12px;
          color: #000;
          background: #bbb;
        }

        #recibo {
          width: 76mm;
          margin: 8px auto;
          background: #fff;
          padding: 8px 6px 20px;
          border-radius: 3px;
          box-shadow: 0 2px 8px rgba(0,0,0,.25);
        }

        /* ── Separadores ── */
        .dbl   { border-top: 2px solid #000; margin: 6px 0; border-bottom: 1px solid #000; padding-bottom: 1px; }
        .guion { border-top: 1px dashed #000; margin: 5px 0; }
        .linea { border-top: 1px solid #000; margin: 3px 0; }

        /* ── Empresa ── */
        .centro    { text-align: center; }
        .centro svg { display: block; margin: 0 auto 3px; }
        .emp-nom   { font-size: 14px; font-weight: 900; letter-spacing: .03em; margin: 3px 0 2px; }
        .emp-lin   { font-size: 9.5px; line-height: 1.6; color: #222; }

        /* ── Documento ── */
        .doc-tipo  { font-size: 9.5px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 2px; }
        .doc-num   { font-size: 14px; font-weight: 900; font-family: 'Courier New', monospace; }
        .doc-sub   { font-size: 9.5px; color: #222; margin-top: 1px; }

        /* ── Cliente ── */
        .cli-nom   { font-size: 12px; font-weight: 700; margin: 2px 0; }
        .campo     { display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 2px; gap: 4px; }
        .campo span:first-child { color: #000; }
        .campo.bold { font-weight: 700; font-size: 11px; font-family: 'Courier New', monospace; }
        .total-final { font-size: 14px; font-weight: 900; margin-top: 2px; }

        /* ── Columnas ── */
        .tbl-hdr { display: flex; align-items: baseline; gap: 2px; }
        .cd { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ci { width: 46px; text-align: right; flex-shrink: 0; font-family: 'Courier New', monospace; white-space: nowrap; }
        .cv { width: 56px; text-align: right; flex-shrink: 0; font-family: 'Courier New', monospace; white-space: nowrap; }

        /* Cabecera tabla */
        .tbl-hdr.sub { font-size: 9.5px; margin-bottom: 2px; }

        /* ── Productos ── */
        .item       { margin-bottom: 5px; }
        .sombreado  { background: #e0e0e0; padding: 1px 2px; }
        .item-nom   { font-size: 10.5px; font-weight: 700; line-height: 1.3; white-space: normal; word-break: break-word; }
        .item-cod   { font-size: 8.5px; color: #333; }
        .item-det   { font-size: 9px; color: #222; }
        .item-num   { font-size: 9.5px; font-weight: 700; }
        .item-desc  { font-size: 8.5px; color: #333; }
        .item-tag   { font-size: 8.5px; font-style: italic; color: #333; }

        /* Cabecera de tabla */
        .tbl-hdr:first-of-type {
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .04em;
          padding-bottom: 2px;
        }

        /* ── Total ── */
        .total-lbl      { font-size: 13px; font-weight: 900; margin-bottom: 2px; }
        .total-itbis-lbl { font-size: 8.5px; }
        .total-itbis    { font-size: 9.5px; font-weight: 700; }
        .total-val      { font-size: 14px; font-weight: 900; }

        /* ── Footer ── */
        .gracias   { font-size: 12px; font-weight: 900; margin-bottom: 2px; }
        .wa-txt    { font-size: 9.5px; color: #222; }

        /* ── Política ── */
        .pol-titulo { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; text-align: center; margin: 3px 0; }
        .pol        { font-size: 8.5px; color: #222; line-height: 1.6; margin-bottom: 2px; }

        /* ── Pie ── */
        .pie { font-size: 8.5px; color: #333; line-height: 1.6; }

        /* ══ IMPRESIÓN THERMAL ══ */
        @media print {
          @page {
            size: 80mm auto;
            margin: 3mm 0mm;
          }
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          #recibo {
            width: 100%;
            max-width: 100%;
            margin: 0;
            /* 6mm laterales compensan márgenes hardware del driver Epson */
            padding: 2mm 6mm 8mm;
            border-radius: 0;
            box-shadow: none;
          }
          /* Negro puro en toda la impresión */
          * { color: #000 !important; background: white !important; }
          .sombreado { background: #ddd !important; }
        }
      `}</style>
    </>
  );
}
