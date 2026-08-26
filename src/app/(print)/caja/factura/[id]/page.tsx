/**
 * Recibo de venta PDV — impresora thermal 80mm
 * Ruta: /caja/factura/[ventaId]
 * Diseño fusionado: logo/estética propia + estructura fiscal dominicana
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

  // ITBIS e total por ítem
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
      {/* Auto-imprime al cargar — sin intervención de la cajera */}
      <AutoPrint />

      <div id="recibo">

        {/* ══ LOGO + EMPRESA ══ */}
        <div className="hdr">
          <svg width="44" height="44" viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg">
            <polygon points="21,2 49,2 67,20 67,50 49,68 21,68 3,50 3,20" fill="white" stroke="#111" strokeWidth="2.5"/>
            <polygon points="22,7 48,7 63,22 63,48 48,63 22,63 7,48 7,22" fill="none" stroke="#111" strokeWidth="1"/>
            <text x="35" y="35" dominantBaseline="central" textAnchor="middle"
              fontFamily="'Arial Black', Impact, sans-serif" fontSize="27" fontWeight="900" fill="#f5821f">AP</text>
          </svg>
          <div className="emp-nombre"><span className="naranja">F</span>ERRETERÍA AP</div>
          <div className="emp-sub">{EMPRESA.dir}</div>
          <div className="emp-sub">{EMPRESA.ciudad}</div>
          <div className="emp-sub">RNC: {EMPRESA.rnc}</div>
          <div className="emp-sub">Tel.: {EMPRESA.tel}</div>
        </div>

        <div className="dbl"></div>

        {/* ══ DOCUMENTO ══ */}
        <div className="doc-center">
          <div className="doc-tipo">{v.tipoNcf ? (NCF_LABEL[v.tipoNcf] ?? "FACTURA DE VENTA") : "FACTURA DE VENTA"}</div>
          <div className="doc-num"># {v.numero}</div>
          <div className="doc-fecha">{fecha}</div>
          {v.ncf && <div className="doc-ncf">NCF: {v.ncf}</div>}
        </div>

        <div className="dash"></div>

        {/* ══ CLIENTE ══ */}
        {v.cliente.rnc && <div className="cli-rnc">RNC: {v.cliente.rnc}</div>}
        <div className="cli-nom">{v.cliente.nombre}</div>
        {v.cliente.telefono && <div className="cli-sub">Tel: {v.cliente.telefono}</div>}
        <div className="cli-sub">Condición: {CREDITO_LABEL[v.credito] ?? v.credito}</div>

        <div className="dash"></div>

        {/* ══ TABLA PRODUCTOS ══ */}
        <div className="row tbl-hdr">
          <span className="c-desc">DESCRIPCIÓN</span>
          <span className="c-itbis">ITBIS</span>
          <span className="c-valor">VALOR</span>
        </div>
        <div className="solid"></div>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {detalles.map((d: any, i: number) => {
          const nombre = d.descripcion ?? d.producto.nombre;
          const codigo = d.producto?.codigo ?? null;
          const unidad = d.unidad ?? d.producto.unidadMedida;
          const cant   = Number(d.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 });
          return (
            <div key={d.id} className={i % 2 === 1 ? "item item-alt" : "item"}>
              <div className="item-nom">{nombre}</div>
              {codigo && <div className="item-cod">{codigo}</div>}
              <div className="row">
                <span className="c-desc item-qty">{cant} {unidad} × {fmtN(d.precio)}</span>
                <span className="c-itbis item-num">{d.exentoItbis ? "—" : fmtN(d.itbisItem)}</span>
                <span className="c-valor item-num">{fmtN(d.valorItem)}</span>
              </div>
              {Number(d.descuento ?? 0) > 0 && <div className="item-desc-txt">Desc: -{fmtN(d.descuento)}</div>}
              {d.exentoItbis && <div className="item-tag">Exento ITBIS</div>}
            </div>
          );
        })}

        <div className="solid"></div>

        {/* ══ SUBTOTALES ══ */}
        {tieneDesc && (
          <div className="row sub-row">
            <span className="c-desc">Descuento</span>
            <span className="c-itbis"></span>
            <span className="c-valor">-{fmtN(totalDesc)}</span>
          </div>
        )}
        <div className="row sub-row">
          <span className="c-desc">SUBTOTAL</span>
          <span className="c-itbis">{fmtN(totalItbis)}</span>
          <span className="c-valor">{fmtN(totalValor)}</span>
        </div>

        <div className="dash"></div>

        {/* ══ TOTAL A PAGAR ══ */}
        <div className="row total-row">
          <span className="c-desc total-lbl">TOTAL A PAGAR</span>
          <span className="c-itbis total-itbis">{fmtN(totalItbis)}</span>
          <span className="c-valor total-val">{fmtN(totalValor)}</span>
        </div>

        <div className="dash"></div>

        {/* ══ PAGOS ══ */}
        {pagos.map((p, i) => (
          <div key={i} className="row pago-row">
            <span>{METODO_LABEL[p.metodo] ?? p.metodo}{p.referencia ? ` (${p.referencia})` : ""}</span>
            <span>{fmtN(p.monto)}</span>
          </div>
        ))}

        <div className="dash"></div>

        {/* ══ CAJERO / TICKET ══ */}
        <div className="row staff-row"><span>Cajero:</span><span>{vendedorNombre}</span></div>
        <div className="row staff-row"><span>Ticket:</span><span>{v.numero}</span></div>

        <div className="dbl"></div>

        {/* ══ FOOTER ══ */}
        <div className="footer-grc">¡Gracias por su compra!</div>
        <div className="footer-wa">WhatsApp: {EMPRESA.tel}</div>

        <div className="dash"></div>

        {/* ══ POLÍTICA ══ */}
        <div className="pol-titulo">POLÍTICA DE DEVOLUCIONES</div>
        <div className="pol-item">✓ Devoluciones e intercambios hasta <b>30 días</b> después de la compra.</div>
        <div className="pol-item">✓ Se requiere presentar esta <b>factura original</b>. Sin factura no se procesará ninguna devolución.</div>
        <div className="pol-item">✓ El producto debe estar en su <b>estado original</b>, sin uso, sin daños y en su empaque original.</div>
        <div className="pol-item">✓ No aplican devoluciones en <b>efectivo</b>; al momento de la devolución se emitirá una <b>nota de crédito</b> por el valor devuelto.</div>
        <div className="pol-item">✓ <b>Revise sus productos</b> antes de retirarse. No se aceptarán reclamaciones por daños visibles una vez retirado el artículo.</div>
        <div className="pol-item">✓ Productos con daños por mal uso quedan excluidos de la garantía.</div>

        <div className="dash"></div>

        {/* ══ PIE LEGAL ══ */}
        <div className="pie">RNC: {EMPRESA.rnc}</div>
        <div className="pie">Documento generado electrónicamente.</div>
        <div className="pie">Conserve esta factura para cualquier reclamación.</div>

      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-size: 11px;
          color: #111;
          background: #ccc;
        }

        #recibo {
          width: 72mm;
          margin: 8px auto;
          background: #fff;
          padding: 10px 8px 16px;
          border-radius: 3px;
          box-shadow: 0 2px 10px rgba(0,0,0,.2);
        }

        /* ── Columnas ── */
        .row     { display: flex; align-items: baseline; }
        .c-desc  { flex: 1 1 auto; min-width: 0; text-align: left; }
        .c-itbis { width: 48px; text-align: right; flex-shrink: 0; font-family: 'Courier New', monospace; white-space: nowrap; }
        .c-valor { width: 58px; text-align: right; flex-shrink: 0; font-family: 'Courier New', monospace; white-space: nowrap; }

        /* ── Separadores ── */
        .dbl   { border-top: 3px double #111; margin: 6px 0; }
        .dash  { border-top: 1px dashed #bbb; margin: 5px 0; }
        .solid { border-top: 1px solid #888; margin: 4px 0; }

        /* ── Empresa ── */
        .hdr       { text-align: center; margin-bottom: 5px; }
        .hdr svg   { display: block; margin: 0 auto 3px; }
        .naranja   { color: #f5821f; }
        .emp-nombre { font-size: 14px; font-weight: 900; font-family: 'Arial Black', Impact, sans-serif; letter-spacing: .02em; margin-bottom: 2px; }
        .emp-sub   { font-size: 8.5px; color: #555; line-height: 1.6; }

        /* ── Documento ── */
        .doc-center { text-align: center; }
        .doc-tipo   { font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; color: #888; margin-bottom: 2px; }
        .doc-num    { font-size: 14px; font-weight: 900; font-family: 'Courier New', monospace; }
        .doc-fecha  { font-size: 8.5px; color: #666; margin-top: 1px; }
        .doc-ncf    { font-size: 8.5px; color: #444; font-family: monospace; margin-top: 2px; }

        /* ── Cliente ── */
        .cli-rnc  { font-size: 8.5px; color: #555; }
        .cli-nom  { font-size: 12px; font-weight: 700; margin: 1px 0; }
        .cli-sub  { font-size: 8.5px; color: #666; line-height: 1.6; }

        /* ── Tabla header ── */
        .tbl-hdr { font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; color: #999; padding-bottom: 2px; }

        /* ── Items ── */
        .item       { margin-bottom: 5px; }
        .item-alt   { background: #f5f5f5; padding: 2px 3px; border-radius: 2px; }
        .item-nom   { font-size: 10px; font-weight: 600; line-height: 1.3; word-break: break-word; }
        .item-cod   { font-size: 8px; color: #888; }
        .item-qty   { font-size: 8.5px; color: #555; }
        .item-num   { font-size: 9px; font-weight: 600; }
        .item-desc-txt { font-size: 8px; color: #e07020; }
        .item-tag   { font-size: 7.5px; color: #aaa; font-style: italic; }

        /* ── Subtotales ── */
        .sub-row { font-size: 9px; margin-bottom: 2px; }

        /* ── Total a pagar ── */
        .total-row  { padding: 2px 0; }
        .total-lbl  { font-size: 12px; font-weight: 900; }
        .total-itbis { font-size: 10px; font-weight: 700; width: 48px; }
        .total-val  { font-size: 14px; font-weight: 900; width: 58px; }

        /* ── Pagos ── */
        .pago-row { justify-content: space-between; font-size: 9.5px; margin-bottom: 2px; font-family: 'Courier New', monospace; }

        /* ── Staff ── */
        .staff-row { justify-content: space-between; font-size: 8.5px; color: #555; margin-bottom: 1px; }

        /* ── Footer ── */
        .footer-grc { text-align: center; font-size: 11px; font-weight: 700; margin-bottom: 2px; }
        .footer-wa  { text-align: center; font-size: 8.5px; color: #777; }

        /* ── Política ── */
        .pol-titulo { font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; color: #888; text-align: center; margin: 4px 0; }
        .pol-item   { font-size: 8px; color: #555; line-height: 1.6; margin-bottom: 2px; }
        .pol-item b { color: #333; }

        /* ── Pie ── */
        .pie { text-align: center; font-size: 7.5px; color: #aaa; line-height: 1.7; }

        /* ══ IMPRESIÓN ══ */
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          #recibo {
            width: 100%;
            margin: 0;
            padding: 4mm 3mm 8mm;
            border-radius: 0;
            box-shadow: none;
          }
        }
      `}</style>
    </>
  );
}
