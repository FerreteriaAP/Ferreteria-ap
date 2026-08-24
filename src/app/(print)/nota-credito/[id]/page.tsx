/**
 * Nota de Crédito — impresora thermal 80mm
 * Ruta: /nota-credito/[ncId]
 */
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButtons } from "@/components/nominas/print-buttons";
import { EMPRESA } from "@/lib/empresa";

interface PageProps { params: Promise<{ id: string }> }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtN = (n: any) => {
  const [ent, dec] = Number(n).toFixed(2).split(".");
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

interface NCDetalle {
  productoId: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export default async function ImprimirNotaCredito({ params }: PageProps) {
  const { id } = await params;

  const nc = await prisma.notaCredito.findUnique({
    where: { id },
    include: {
      cliente: { select: { nombre: true, rnc: true } },
      venta:   { select: { numero: true } },
    },
  });
  if (!nc) notFound();

  const fecha = new Date(nc.createdAt).toLocaleString("es-DO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const detalles = (nc.detalles as unknown as NCDetalle[]) ?? [];

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
            <div className="empresa-sub">Tel: {EMPRESA.tel}</div>
          </div>

          <div className="sep-double"></div>

          {/* ── TÍTULO ── */}
          <div className="doc-info">
            <div className="doc-tipo">NOTA DE CRÉDITO</div>
            <div className="doc-num">{nc.numero}</div>
            <div className="doc-fecha">{fecha}</div>
          </div>

          <div className="sep-dashed"></div>

          {/* ── CLIENTE ── */}
          <div className="cliente-info">
            <div className="cli-lbl">CLIENTE</div>
            <div className="cli-nombre">{nc.cliente.nombre}</div>
            {nc.cliente.rnc && <div className="cli-sub">RNC: {nc.cliente.rnc}</div>}
          </div>
          {nc.venta?.numero && (
            <div className="ref-line">Factura referencia: <strong>{nc.venta.numero}</strong></div>
          )}

          <div className="sep-dashed"></div>

          {/* ── MOTIVO ── */}
          <div className="motivo-box">
            <div className="motivo-lbl">MOTIVO</div>
            <div className="motivo-txt">{nc.motivo}</div>
          </div>

          <div className="sep-dashed"></div>

          {/* ── ARTÍCULOS ── */}
          {detalles.length > 0 && (
            <>
              <div className="items-hdr">
                <span>ARTÍCULO</span>
                <span>CRÉDITO</span>
              </div>
              {detalles.map((d, i) => (
                <div key={d.productoId} className={`item ${i % 2 === 1 ? "item-alt" : ""}`}>
                  <div className="item-nombre">{d.nombre}</div>
                  <div className="item-detalle">
                    <span>{d.cantidad} {d.unidad} @ RD$ {fmtN(d.precioUnitario)}</span>
                    <span className="item-total">RD$ {fmtN(d.subtotal)}</span>
                  </div>
                </div>
              ))}
              <div className="sep-dashed"></div>
            </>
          )}

          {/* ── MONTOS ── */}
          <div className="total-row">
            <span>Total nota de crédito</span>
            <span>RD$ {fmtN(nc.monto)}</span>
          </div>
          <div className="total-row muted">
            <span>Saldo restante</span>
            <span>RD$ {fmtN(nc.montoRestante)}</span>
          </div>

          <div className="sep-dashed"></div>

          <div className="total-final">
            <span>CRÉDITO TOTAL</span>
            <span>RD$ {fmtN(nc.monto)}</span>
          </div>

          {/* ── ESTADO ── */}
          <div className={`estado-nc ${nc.estado === "PENDIENTE" ? "pendiente" : "aplicado"}`}>
            {nc.estado === "PENDIENTE" ? "📋 Pendiente de aplicación" : "✓ Crédito aplicado"}
          </div>

          <div className="sep-double"></div>

          {/* ── FOOTER ── */}
          <div className="footer">
            <div className="footer-txt">
              Esta nota de crédito acredita un saldo a favor del cliente.
              Presentar al momento de aplicar en próxima factura.
            </div>
            <div className="footer-sub">
              {EMPRESA.nombre} · {EMPRESA.tel}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #111; background: #ddd; }

        .wrap { max-width: 320px; margin: 0 auto; padding: 0 8px 24px; }
        .recibo { background: #fff; padding: 14px 14px 12px; margin-top: 8px; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,.15); }

        .hdr { text-align: center; margin-bottom: 10px; }
        .empresa-ap { display: flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 3px; }
        .ap-box { border: 2px solid #000; padding: 0 3px; font-size: 15px; font-weight: 900; font-family: 'Arial Black', sans-serif; }
        .empresa-nombre { font-size: 14px; font-weight: 900; font-family: 'Arial Black', sans-serif; }
        .empresa-sub { font-size: 9px; color: #555; line-height: 1.5; }

        .sep-double { border-top: 3px double #000; margin: 8px 0; }
        .sep-dashed { border-top: 1px dashed #ccc; margin: 6px 0; }

        .doc-info { text-align: center; }
        .doc-tipo { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #888; }
        .doc-num { font-size: 14px; font-weight: 900; font-family: 'Courier New', monospace; }
        .doc-fecha { font-size: 9px; color: #666; }

        .cliente-info { margin-bottom: 3px; }
        .cli-lbl { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #aaa; }
        .cli-nombre { font-size: 12px; font-weight: 700; }
        .cli-sub { font-size: 9px; color: #666; }
        .ref-line { font-size: 9px; color: #555; }

        .motivo-box { margin-bottom: 3px; }
        .motivo-lbl { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #aaa; margin-bottom: 2px; }
        .motivo-txt { font-size: 11px; font-style: italic; color: #333; }

        .items-hdr { display: flex; justify-content: space-between; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; color: #aaa; margin-bottom: 4px; }
        .item { margin-bottom: 5px; }
        .item-alt { background: #f9f9f9; padding: 1px 3px; }
        .item-nombre { font-size: 10.5px; font-weight: 600; }
        .item-detalle { display: flex; justify-content: space-between; font-size: 9.5px; color: #555; }
        .item-total { font-weight: 700; color: #111; font-family: 'Courier New', monospace; }

        .total-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; }
        .total-row.muted { color: #888; font-size: 9.5px; }
        .total-final { display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; }
        .total-final span:last-child { font-family: 'Courier New', monospace; }

        .estado-nc { text-align: center; font-size: 9.5px; font-weight: 600; padding: 5px; border-radius: 3px; margin: 6px 0; }
        .estado-nc.pendiente { color: #92400e; background: #fffbeb; border: 1px dashed #fde68a; }
        .estado-nc.aplicado { color: #166534; background: #f0fdf4; border: 1px dashed #bbf7d0; }

        .footer { text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; }
        .footer-txt { font-size: 8.5px; color: #666; line-height: 1.5; margin-bottom: 5px; }
        .footer-sub { font-size: 8.5px; color: #aaa; }

        @media print {
          @page { size: 80mm auto; margin: 4mm 3mm; }
          body { background: white; }
          .no-print { display: none !important; }
          .wrap { max-width: 100%; margin: 0; padding: 0; }
          .recibo { border-radius: 0; box-shadow: none; padding: 0; }
          .estado-nc { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}
