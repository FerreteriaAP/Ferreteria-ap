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

  // Calcular ITBIS e total por item
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detalles = v.detalles.map((d: any) => {
    const subtotal = Number(d.subtotal);           // pre-ITBIS
    const itbisItem = d.exentoItbis ? 0 : subtotal * 0.18;
    const valorItem = subtotal + itbisItem;        // con ITBIS
    return { ...d, subtotal, itbisItem, valorItem };
  });

  const totalItbisItems = detalles.reduce((s: number, d: { itbisItem: number }) => s + d.itbisItem, 0);
  const totalValorItems = detalles.reduce((s: number, d: { valorItem: number }) => s + d.valorItem, 0);
  const tieneDesc = detalles.some((d: { descuento: number }) => Number(d.descuento) > 0);
  const totalDesc  = detalles.reduce((s: number, d: { descuento: number }) => s + Number(d.descuento ?? 0), 0);

  return (
    <>
      {/* Auto-imprime al cargar */}
      <AutoPrint />

      <div className="wrap">
        <div id="recibo" className="recibo">

          {/* ══ LOGO + EMPRESA ══ */}
          <div className="hdr">
            <div className="logo-wrap">
              <svg width="48" height="48" viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg">
                <polygon points="21,2 49,2 67,20 67,50 49,68 21,68 3,50 3,20" fill="white" stroke="#000204" strokeWidth="2.5" />
                <polygon points="22,7 48,7 63,22 63,48 48,63 22,63 7,48 7,22" fill="none" stroke="#000204" strokeWidth="1" />
                <text x="35" y="35" dominantBaseline="central" textAnchor="middle"
                  fontFamily="'Arial Black', Impact, sans-serif" fontSize="27" fontWeight="900" fill="#f5821f">AP</text>
              </svg>
            </div>
            <div className="empresa-nombre">
              <span style={{ color: "#f5821f" }}>F</span>ERRETERÍA AP
            </div>
            <div className="empresa-sub">{EMPRESA.dir}</div>
            <div className="empresa-sub">{EMPRESA.ciudad}</div>
            <div className="empresa-sub">RNC: {EMPRESA.rnc}</div>
            <div className="empresa-sub">Tel.: {EMPRESA.tel}</div>
          </div>

          <div className="sep-double"></div>

          {/* ══ DOCUMENTO ══ */}
          <div className="doc-info">
            <div className="doc-tipo">
              {v.tipoNcf ? (NCF_LABEL[v.tipoNcf] ?? "FACTURA DE VENTA") : "FACTURA DE VENTA"}
            </div>
            <div className="doc-num"># {v.numero}</div>
            <div className="doc-fecha">{fecha}</div>
            {v.ncf && <div className="doc-ncf">NCF: {v.ncf}</div>}
          </div>

          <div className="sep-dashed"></div>

          {/* ══ CLIENTE ══ */}
          {v.cliente.rnc && <div className="cli-rnc">RNC: {v.cliente.rnc}</div>}
          <div className="cli-nombre">{v.cliente.nombre}</div>
          {v.cliente.telefono && <div className="cli-sub">Tel: {v.cliente.telefono}</div>}
          <div className="cli-sub">Condición: {CREDITO_LABEL[v.credito] ?? v.credito}</div>

          <div className="sep-dashed"></div>

          {/* ══ CABECERA TABLA ══ */}
          <div className="tbl-hdr">
            <span className="col-desc">DESCRIPCIÓN</span>
            <span className="col-itbis">ITBIS</span>
            <span className="col-valor">VALOR</span>
          </div>
          <div className="sep-solid"></div>

          {/* ══ PRODUCTOS ══ */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {detalles.map((d: any, i: number) => {
            const nombre  = d.descripcion ?? d.producto.nombre;
            const codigo  = d.producto?.codigo ?? null;
            const unidad  = d.unidad ?? d.producto.unidadMedida;
            const cant    = Number(d.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 });
            return (
              <div key={d.id} className={`item${i % 2 === 1 ? " item-alt" : ""}`}>
                <div className="item-nombre">{nombre}</div>
                {codigo && <div className="item-codigo">{codigo}</div>}
                <div className="item-row2">
                  <span className="col-desc item-qty">{cant} {unidad} × {fmtN(d.precio)}</span>
                  <span className="col-itbis item-num">{d.exentoItbis ? "—" : fmtN(d.itbisItem)}</span>
                  <span className="col-valor item-num">{fmtN(d.valorItem)}</span>
                </div>
                {Number(d.descuento ?? 0) > 0 && (
                  <div className="item-desc">Desc: -{fmtN(d.descuento)}</div>
                )}
                {d.exentoItbis && <div className="item-tag">Exento ITBIS</div>}
              </div>
            );
          })}

          <div className="sep-solid"></div>

          {/* ══ TOTALES ══ */}
          {tieneDesc && (
            <div className="total-row">
              <span className="col-desc">Descuento</span>
              <span className="col-itbis"></span>
              <span className="col-valor">-{fmtN(totalDesc)}</span>
            </div>
          )}
          <div className="total-row">
            <span className="col-desc">SUBTOTAL</span>
            <span className="col-itbis">{fmtN(totalItbisItems)}</span>
            <span className="col-valor">{fmtN(totalValorItems)}</span>
          </div>

          <div className="sep-dashed"></div>

          <div className="total-final">
            <span style={{ flex: 1 }}>TOTAL A PAGAR</span>
            <span style={{ width: 52, textAlign: "right", fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{fmtN(totalItbisItems)}</span>
            <span style={{ width: 64, textAlign: "right", fontFamily: "'Courier New', monospace", fontSize: 15, fontWeight: 900, flexShrink: 0 }}>{fmtN(totalValorItems)}</span>
          </div>

          <div className="sep-dashed"></div>

          {/* ══ FORMAS DE PAGO ══ */}
          {pagos.map((p, i) => (
            <div key={i} className="pago-row">
              <span>{METODO_LABEL[p.metodo] ?? p.metodo}{p.referencia ? ` (${p.referencia})` : ""}</span>
              <span>{fmtN(p.monto)}</span>
            </div>
          ))}

          <div className="sep-dashed"></div>

          {/* ══ CAJERO / VENDEDOR / TICKET ══ */}
          <div className="staff-row"><span>Cajero:</span><span>{vendedorNombre}</span></div>
          {v.vendedor && (
            <div className="staff-row"><span>Vendedor:</span><span>{vendedorNombre}</span></div>
          )}
          <div className="staff-row"><span>Ticket:</span><span>{v.numero}</span></div>

          <div className="sep-double"></div>

          {/* ══ FOOTER ══ */}
          <div className="footer-gracias">¡Gracias por su compra!</div>
          <div className="footer-contacto">WhatsApp: {EMPRESA.tel}</div>

          <div className="sep-dashed"></div>

          {/* ══ POLÍTICA DE DEVOLUCIONES ══ */}
          <div className="disclaimer">
            <div className="disclaimer-titulo">POLÍTICA DE DEVOLUCIONES</div>
            <div className="disclaimer-item">✓ Devoluciones e intercambios hasta <strong>30 días</strong> después de la compra.</div>
            <div className="disclaimer-item">✓ Se requiere presentar esta <strong>factura original</strong>. Sin factura no se procesará ninguna devolución.</div>
            <div className="disclaimer-item">✓ El producto debe estar en su <strong>estado original</strong>, sin uso, sin daños y en su empaque original.</div>
            <div className="disclaimer-item">✓ No aplican devoluciones en <strong>efectivo</strong>; al momento de la devolución se emitirá una <strong>nota de crédito</strong> por el valor devuelto.</div>
            <div className="disclaimer-item">✓ <strong>Revise sus productos</strong> antes de retirarse del establecimiento. No se aceptarán reclamaciones por daños visibles una vez retirado el artículo.</div>
            <div className="disclaimer-item">✓ Productos con daños por mal uso quedan excluidos de la garantía.</div>
          </div>

          <div className="sep-dashed"></div>

          {/* ══ PIE LEGAL ══ */}
          <div className="pie-legal">
            <div>RNC: {EMPRESA.rnc}</div>
            <div>Documento generado electrónicamente.</div>
            <div>Conserve esta factura para cualquier reclamación.</div>
          </div>

        </div>
      </div>

      <style id="recibo-style">{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #111; background: #ddd; }

        /* ── Layout ── */
        .wrap   { max-width: 320px; margin: 0 auto; padding: 0 6px 32px; }
        .recibo { background: #fff; padding: 14px 13px; margin-top: 8px; border-radius: 4px; box-shadow: 0 2px 12px rgba(0,0,0,.18); }

        /* ── Header ── */
        .hdr { text-align: center; margin-bottom: 6px; }
        .logo-wrap { display: flex; justify-content: center; margin-bottom: 4px; }
        .empresa-nombre { font-size: 15px; font-weight: 900; font-family: 'Arial Black', Impact, sans-serif; letter-spacing: 0.02em; margin-bottom: 3px; }
        .empresa-sub { font-size: 9px; color: #555; line-height: 1.6; }

        /* ── Separadores ── */
        .sep-double { border-top: 3px double #000; margin: 7px 0; }
        .sep-dashed { border-top: 1px dashed #bbb; margin: 5px 0; }
        .sep-solid  { border-top: 1px solid #999; margin: 4px 0; }

        /* ── Documento ── */
        .doc-info { text-align: center; }
        .doc-tipo { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 2px; }
        .doc-num  { font-size: 15px; font-weight: 900; font-family: 'Courier New', monospace; }
        .doc-fecha { font-size: 9px; color: #666; margin-top: 1px; }
        .doc-ncf   { font-size: 9px; color: #444; font-family: monospace; margin-top: 2px; }

        /* ── Cliente ── */
        .cli-rnc    { font-size: 9px; color: #555; }
        .cli-nombre { font-size: 12px; font-weight: 700; margin: 1px 0; }
        .cli-sub    { font-size: 9px; color: #666; line-height: 1.6; }

        /* ── Columnas ── */
        .col-desc  { flex: 1 1 auto; text-align: left; }
        .col-itbis { width: 52px; text-align: right; flex-shrink: 0; font-family: 'Courier New', monospace; }
        .col-valor { width: 60px; text-align: right; flex-shrink: 0; font-family: 'Courier New', monospace; }

        /* ── Cabecera tabla ── */
        .tbl-hdr { display: flex; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #999; padding-bottom: 2px; }

        /* ── Items ── */
        .item      { margin-bottom: 5px; }
        .item-alt  { background: #f8f8f8; padding: 2px 3px; border-radius: 2px; }
        .item-nombre { font-size: 10.5px; font-weight: 600; line-height: 1.3; }
        .item-codigo { font-size: 8.5px; color: #888; }
        .item-row2   { display: flex; align-items: baseline; margin-top: 1px; }
        .item-qty    { font-size: 9px; color: #555; }
        .item-num    { font-size: 9.5px; font-weight: 600; color: #111; }
        .item-desc   { font-size: 8.5px; color: #e07020; }
        .item-tag    { font-size: 8px; color: #aaa; font-style: italic; }

        /* ── Totales ── */
        .total-row  { display: flex; font-size: 9.5px; margin-bottom: 2px; }
        .total-final { display: flex; align-items: baseline; padding: 2px 0; font-size: 13px; font-weight: 900; }

        /* ── Pagos ── */
        .pago-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; font-family: 'Courier New', monospace; }

        /* ── Staff ── */
        .staff-row { display: flex; justify-content: space-between; font-size: 9px; color: #555; margin-bottom: 1px; }

        /* ── Footer ── */
        .footer-gracias  { text-align: center; font-size: 12px; font-weight: 700; margin-bottom: 2px; }
        .footer-contacto { text-align: center; font-size: 9px; color: #777; }

        /* ── Disclaimer ── */
        .disclaimer        { margin-top: 2px; }
        .disclaimer-titulo { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #888; text-align: center; margin-bottom: 4px; }
        .disclaimer-item   { font-size: 8.5px; color: #555; line-height: 1.6; margin-bottom: 2px; }
        .disclaimer-item strong { color: #333; }

        /* ── Pie legal ── */
        .pie-legal { text-align: center; font-size: 8px; color: #aaa; line-height: 1.7; margin-top: 4px; }

        /* ── Impresión ── */
        @media print {
          @page { size: 80mm auto; margin: 4mm 2mm; }
          body { background: white; }
          .no-print { display: none !important; }
          .wrap   { max-width: 100%; margin: 0; padding: 0; }
          .recibo { border-radius: 0; box-shadow: none; padding: 0; margin: 0; }
        }
      `}</style>
    </>
  );
}
