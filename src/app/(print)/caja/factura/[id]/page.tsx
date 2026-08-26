/**
 * Recibo de venta PDV — impresora thermal 80mm
 * Ruta: /caja/factura/[ventaId]
 * Accesible desde el módulo de caja después de procesar una venta.
 */
import { notFound } from "next/navigation";
import { getVenta } from "@/actions/ventas";
import { EMPRESA, CREDITO_LABEL, NCF_LABEL } from "@/lib/empresa";
import { QzPrintBtn } from "@/components/caja/qz-print-btn";

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

  // Vendedor o cajero
  const vendedorNombre = v.vendedor
    ? `${v.vendedor.nombre} ${v.vendedor.apellido}`.trim()
    : null;

  // Pagos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pagos: { metodo: string; monto: number; referencia: string | null }[] = (v.pagosRecibidos ?? []).map((p: any) => ({
    metodo: p.metodo,
    monto: Number(p.monto),
    referencia: p.referencia ?? null,
  }));
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const tieneDesc = v.detalles.some((d: any) => Number(d.descuento) > 0);

  return (
    <>
      {/* Botón QZ Tray — imprime directo a la thermal sin diálogo */}
      <div className="no-print" style={{ maxWidth: 320, margin: "12px auto 0" }}>
        <QzPrintBtn />
      </div>

      <div className="wrap">
        <div id="recibo" className="recibo">

          {/* ══ LOGO + EMPRESA ══ */}
          <div className="hdr">
            {/* Isotipo AP — octágono vectorial */}
            <div className="logo-wrap">
              <svg width="54" height="54" viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg">
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
            <div className="empresa-sub">Tel / WhatsApp: {EMPRESA.tel}</div>
            <div className="empresa-sub">{EMPRESA.email}</div>
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
          <div className="seccion-lbl">CLIENTE</div>
          <div className="cli-nombre">{v.cliente.nombre}</div>
          {v.cliente.rnc && <div className="cli-sub">RNC / Cédula: {v.cliente.rnc}</div>}
          {v.cliente.telefono && <div className="cli-sub">Tel: {v.cliente.telefono}</div>}
          <div className="cli-sub">Condición: {CREDITO_LABEL[v.credito] ?? v.credito}</div>

          <div className="sep-dashed"></div>

          {/* ══ PRODUCTOS ══ */}
          <div className="items-hdr">
            <span>DESCRIPCIÓN</span>
            <span>TOTAL</span>
          </div>

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {v.detalles.map((d: any, i: number) => {
            const nombre = d.descripcion ?? d.producto.nombre;
            const unidad = d.unidad ?? d.producto.unidadMedida;
            const cant = Number(d.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 });
            const precio = Number(d.precio);
            const subtotal = Number(d.subtotal);
            const desc = Number(d.descuento ?? 0);
            return (
              <div key={d.id} className={`item${i % 2 === 1 ? " item-alt" : ""}`}>
                <div className="item-nombre">{nombre}</div>
                <div className="item-detalle">
                  <span>{cant} {unidad} × RD$ {fmtN(precio)}</span>
                  <span className="item-total">RD$ {fmtN(subtotal)}</span>
                </div>
                {desc > 0 && (
                  <div className="item-desc">Desc: RD$ {fmtN(desc)}</div>
                )}
                {d.exentoItbis && <div className="item-tag">Exento ITBIS</div>}
              </div>
            );
          })}

          <div className="sep-dashed"></div>

          {/* ══ TOTALES ══ */}
          {tieneDesc && (
            <div className="total-row">
              <span>Descuento</span>
              <span>- RD$ {fmtN(v.detalles.reduce((s: number, d: any) => s + Number(d.descuento ?? 0), 0))}</span>
            </div>
          )}
          <div className="total-row">
            <span>Subtotal (s/ ITBIS)</span>
            <span>RD$ {fmtN(v.subtotal)}</span>
          </div>
          <div className="total-row">
            <span>ITBIS 18%</span>
            <span>RD$ {fmtN(v.itbis)}</span>
          </div>
          {Number(v.itbisExento ?? 0) > 0 && (
            <div className="total-row muted">
              <span>ITBIS exento</span>
              <span>RD$ {fmtN(v.itbisExento)}</span>
            </div>
          )}

          <div className="sep-dashed"></div>

          <div className="total-final">
            <span>TOTAL</span>
            <span>RD$ {fmtN(v.total)}</span>
          </div>

          {/* ══ FORMAS DE PAGO ══ */}
          {pagos.length > 0 && (
            <>
              <div className="sep-dashed"></div>
              <div className="seccion-lbl">FORMA DE PAGO</div>
              {pagos.map((p, i) => (
                <div key={i} className="total-row">
                  <span>{METODO_LABEL[p.metodo] ?? p.metodo}{p.referencia ? ` (${p.referencia})` : ""}</span>
                  <span>RD$ {fmtN(p.monto)}</span>
                </div>
              ))}
              {pagos.length > 1 && (
                <div className="total-row bold">
                  <span>Total pagado</span>
                  <span>RD$ {fmtN(totalPagado)}</span>
                </div>
              )}
            </>
          )}

          {/* ══ VENDEDOR / NOTAS ══ */}
          {(vendedorNombre || v.notas) && (
            <>
              <div className="sep-dashed"></div>
              {vendedorNombre && (
                <div className="total-row muted">
                  <span>Atendido por</span>
                  <span>{vendedorNombre}</span>
                </div>
              )}
              {v.notas && <div className="notas">{v.notas}</div>}
            </>
          )}

          <div className="sep-double"></div>

          {/* ══ FOOTER — AGRADECIMIENTO ══ */}
          <div className="footer-gracias">¡Gracias por su compra!</div>
          <div className="footer-contacto">WhatsApp: {EMPRESA.tel}</div>

          <div className="sep-dashed"></div>

          {/* ══ DISCLAIMER LEGAL ══ */}
          <div className="disclaimer">
            <div className="disclaimer-titulo">POLÍTICA DE DEVOLUCIONES</div>
            <div className="disclaimer-item">✓ Devoluciones e intercambios hasta <strong>30 días</strong> después de la compra.</div>
            <div className="disclaimer-item">✓ Se requiere presentar esta <strong>factura original</strong>. Sin factura no se procesará ninguna devolución.</div>
            <div className="disclaimer-item">✓ El producto debe estar en su <strong>estado original</strong>, sin uso, sin daños y en su empaque original.</div>
            <div className="disclaimer-item">✓ No aplican devoluciones en <strong>efectivo</strong> por compras realizadas con tarjeta.</div>
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
        .wrap  { max-width: 320px; margin: 0 auto; padding: 0 6px 32px; }
        .recibo { background: #fff; padding: 14px 13px 14px; margin-top: 8px; border-radius: 4px; box-shadow: 0 2px 12px rgba(0,0,0,.18); }

        /* ── Header / Logo ── */
        .hdr { text-align: center; margin-bottom: 6px; }
        .logo-wrap { display: flex; justify-content: center; margin-bottom: 4px; }
        .empresa-nombre { font-size: 15px; font-weight: 900; font-family: 'Arial Black', 'Franklin Gothic Heavy', Impact, sans-serif; letter-spacing: 0.02em; margin-bottom: 4px; }
        .empresa-sub { font-size: 9px; color: #555; line-height: 1.6; }

        /* ── Separadores ── */
        .sep-double { border-top: 3px double #000; margin: 8px 0; }
        .sep-dashed { border-top: 1px dashed #bbb; margin: 6px 0; }

        /* ── Documento ── */
        .doc-info { text-align: center; }
        .doc-tipo { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #888; margin-bottom: 2px; }
        .doc-num  { font-size: 15px; font-weight: 900; font-family: 'Courier New', monospace; }
        .doc-fecha { font-size: 9px; color: #666; margin-top: 1px; }
        .doc-ncf  { font-size: 9px; color: #444; font-family: monospace; margin-top: 2px; }

        /* ── Sección label ── */
        .seccion-lbl { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa; margin-bottom: 2px; }

        /* ── Cliente ── */
        .cli-nombre { font-size: 12px; font-weight: 700; margin-bottom: 1px; }
        .cli-sub    { font-size: 9px; color: #666; line-height: 1.6; }

        /* ── Productos ── */
        .items-hdr { display: flex; justify-content: space-between; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; color: #aaa; margin-bottom: 4px; }
        .item      { margin-bottom: 6px; }
        .item-alt  { background: #f8f8f8; padding: 2px 3px; border-radius: 2px; }
        .item-nombre  { font-size: 10.5px; font-weight: 600; line-height: 1.3; }
        .item-detalle { display: flex; justify-content: space-between; font-size: 9.5px; color: #555; margin-top: 1px; }
        .item-total   { font-weight: 700; color: #111; font-family: 'Courier New', monospace; white-space: nowrap; }
        .item-desc    { font-size: 8.5px; color: #e07020; }
        .item-tag     { font-size: 8px; color: #aaa; font-style: italic; }

        /* ── Totales ── */
        .total-row       { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; }
        .total-row.muted { color: #888; }
        .total-row.bold  { font-weight: 700; }
        .total-final     { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; padding: 3px 0; }
        .total-final span:last-child { font-family: 'Courier New', monospace; }

        /* ── Notas ── */
        .notas { font-size: 9px; color: #777; font-style: italic; margin-top: 4px; }

        /* ── Footer ── */
        .footer-gracias  { text-align: center; font-size: 12px; font-weight: 700; margin-bottom: 2px; }
        .footer-contacto { text-align: center; font-size: 9px; color: #777; }

        /* ── Disclaimer ── */
        .disclaimer        { margin-top: 2px; }
        .disclaimer-titulo { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #888; text-align: center; margin-bottom: 5px; }
        .disclaimer-item   { font-size: 8.5px; color: #555; line-height: 1.6; margin-bottom: 3px; text-align: left; }
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
