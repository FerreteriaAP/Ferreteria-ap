/**
 * Recibo de venta PDV — impresora thermal 80mm
 * Ruta: /caja/factura/[ventaId]
 * Accesible desde el módulo de caja después de procesar una venta.
 */
import { notFound } from "next/navigation";
import { getVenta } from "@/actions/ventas";
import { PrintButtons } from "@/components/nominas/print-buttons";
import { EMPRESA } from "@/lib/empresa";

interface PageProps { params: Promise<{ id: string }> }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtN = (n: any) => {
  const [ent, dec] = Number(n).toFixed(2).split(".");
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

const CRED_LABEL: Record<string, string> = {
  CONTADO: "Contado",
  DIAS_10: "10 días",
  DIAS_15: "15 días",
  DIAS_30: "30 días",
  DIAS_45: "45 días",
  DIAS_60: "60 días",
  DIAS_90: "90 días",
};

export default async function ReciboVentaPDV({ params }: PageProps) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (await getVenta(id)) as any;
  if (!v || v.tipo !== "FACTURADA") notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const turno = (v as any).turno as { usuario?: { nombre: string; apellido: string } } | null | undefined;
  const cajero = turno?.usuario
    ? `${turno.usuario.nombre} ${turno.usuario.apellido}`.trim()
    : null;

  const fecha = new Date(v.fechaEmision ?? new Date()).toLocaleString("es-DO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <>
      <PrintButtons />
      <p className="no-print" style={{ textAlign: "center", fontSize: 11, color: "#888", padding: "12px 0 4px" }}>
        Papel: <strong>80mm</strong> · Presiona <strong>Ctrl+P</strong> para imprimir
      </p>

      <div className="wrap">
        <div className="recibo">
          {/* ── HEADER ── */}
          <div className="hdr">
            <div className="empresa-ap">
              <span className="ap-box">AP</span>
              <span className="empresa-nombre"> FERRETERÍA AP</span>
            </div>
            <div className="empresa-sub">{EMPRESA.dir}</div>
            <div className="empresa-sub">{EMPRESA.ciudad}</div>
            <div className="empresa-sub">RNC: {EMPRESA.rnc}</div>
            <div className="empresa-sub">Tel: {EMPRESA.tel} (WhatsApp)</div>
          </div>

          <div className="sep-double"></div>

          {/* ── DOCUMENTO ── */}
          <div className="doc-info">
            <div className="doc-tipo">FACTURA DE VENTA</div>
            <div className="doc-num">{v.numero}</div>
            <div className="doc-fecha">{fecha}</div>
            {v.ncf && <div className="doc-ncf">NCF: {v.ncf}</div>}
          </div>

          <div className="sep-dashed"></div>

          {/* ── CLIENTE ── */}
          <div className="cliente-info">
            <div className="cli-lbl">CLIENTE</div>
            <div className="cli-nombre">{v.cliente.nombre}</div>
            {v.cliente.rnc && <div className="cli-sub">RNC: {v.cliente.rnc}</div>}
          </div>
          <div className="cond-line">Condición: {CRED_LABEL[v.credito] ?? v.credito}</div>

          <div className="sep-dashed"></div>

          {/* ── PRODUCTOS ── */}
          <div className="items-hdr">
            <span>DESCRIPCIÓN</span>
            <span>TOTAL</span>
          </div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {v.detalles.map((d: any, i: number) => (
            <div key={d.id} className={`item ${i % 2 === 1 ? "item-alt" : ""}`}>
              <div className="item-nombre">{d.descripcion ?? d.producto.nombre}</div>
              <div className="item-detalle">
                <span>
                  {Number(d.cantidad).toLocaleString("es-DO", { maximumFractionDigits: 4 })}{" "}
                  {d.unidad ?? d.producto.unidadMedida}
                  {" @ "}
                  RD$ {fmtN(d.precio)}
                </span>
                <span className="item-total">RD$ {fmtN(d.subtotal)}</span>
              </div>
              {d.exentoItbis && <div className="item-sub">Exento de ITBIS</div>}
            </div>
          ))}

          <div className="sep-dashed"></div>

          {/* ── TOTALES ── */}
          <div className="total-row">
            <span>Subtotal (s/ITBIS)</span>
            <span>RD$ {fmtN(v.subtotal)}</span>
          </div>
          <div className="total-row">
            <span>ITBIS (18%)</span>
            <span>RD$ {fmtN(v.itbis)}</span>
          </div>

          <div className="sep-dashed"></div>

          <div className="total-final">
            <span>TOTAL</span>
            <span>RD$ {fmtN(v.total)}</span>
          </div>

          {/* ── PAGO / CAJERO ── */}
          {cajero && (
            <>
              <div className="sep-dashed"></div>
              <div className="total-row">
                <span>Cajero/a</span>
                <span>{cajero}</span>
              </div>
            </>
          )}

          <div className="sep-double"></div>

          {/* ── FOOTER ── */}
          <div className="footer">
            <div className="footer-gracias">¡Gracias por su compra!</div>
            <div className="footer-sub">WhatsApp: {EMPRESA.tel}</div>
            <div className="footer-sub">{EMPRESA.email}</div>
            {v.notas && <div className="footer-notas">{v.notas}</div>}
          </div>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #111; background: #ddd; }

        .wrap { max-width: 320px; margin: 0 auto; padding: 0 8px 24px; }
        .recibo { background: #fff; padding: 14px 14px 12px; margin-top: 8px; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,.15); }

        /* Header */
        .hdr { text-align: center; margin-bottom: 10px; }
        .empresa-ap { display: flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 3px; }
        .ap-box { border: 2px solid #000; padding: 0 3px; font-size: 15px; font-weight: 900; font-family: 'Arial Black', sans-serif; }
        .empresa-nombre { font-size: 14px; font-weight: 900; font-family: 'Arial Black', sans-serif; }
        .empresa-sub { font-size: 9px; color: #555; line-height: 1.5; }

        .sep-double { border-top: 3px double #000; margin: 8px 0; }
        .sep-dashed { border-top: 1px dashed #ccc; margin: 6px 0; }

        /* Doc info */
        .doc-info { text-align: center; }
        .doc-tipo { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #888; }
        .doc-num { font-size: 14px; font-weight: 900; font-family: 'Courier New', monospace; }
        .doc-fecha { font-size: 9px; color: #666; }
        .doc-ncf { font-size: 9px; color: #444; font-family: monospace; margin-top: 2px; }

        /* Cliente */
        .cliente-info { margin-bottom: 3px; }
        .cli-lbl { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #aaa; }
        .cli-nombre { font-size: 12px; font-weight: 700; }
        .cli-sub { font-size: 9px; color: #666; }
        .cond-line { font-size: 9px; color: #666; }

        /* Items */
        .items-hdr { display: flex; justify-content: space-between; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; color: #aaa; margin-bottom: 4px; }
        .item { margin-bottom: 5px; }
        .item-alt { background: #f9f9f9; padding: 1px 3px; border-radius: 2px; }
        .item-nombre { font-size: 10.5px; font-weight: 600; }
        .item-detalle { display: flex; justify-content: space-between; font-size: 9.5px; color: #555; }
        .item-total { font-weight: 700; color: #111; font-family: 'Courier New', monospace; }
        .item-sub { font-size: 8.5px; color: #aaa; }

        /* Totales */
        .total-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; }
        .total-final { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; }
        .total-final span:last-child { font-family: 'Courier New', monospace; }

        /* Footer */
        .footer { text-align: center; margin-top: 8px; }
        .footer-gracias { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
        .footer-sub { font-size: 9px; color: #777; line-height: 1.5; }
        .footer-notas { font-size: 9px; color: #999; margin-top: 6px; font-style: italic; padding-top: 6px; border-top: 1px solid #eee; }

        @media print {
          @page { size: 80mm auto; margin: 4mm 3mm; }
          body { background: white; }
          .no-print { display: none !important; }
          .wrap { max-width: 100%; margin: 0; padding: 0; }
          .recibo { border-radius: 0; box-shadow: none; padding: 0; }
        }
      `}</style>
    </>
  );
}
