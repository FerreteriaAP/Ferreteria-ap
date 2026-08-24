/**
 * Comprobante de Cobro CxC — thermal 80mm
 * Los datos llegan por searchParams ya que el cobro CxC no usa movimientoCaja.
 *
 * Ruta: /comprobante-cxc?cliente=X&rnc=Y&monto=Z&metodo=A&fecha=B&ref=C&facturas=FAC/2026/0001:500.00,...&notas=D
 */
import { PrintButtons } from "@/components/nominas/print-buttons";
import { EMPRESA } from "@/lib/empresa";

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
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  CHEQUE: "Cheque",
};

const fmtN = (n: number) => {
  const [ent, dec] = n.toFixed(2).split(".");
  return "RD$ " + ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

export default async function ComprobanteCxC({ searchParams }: PageProps) {
  const sp = await searchParams;
  const cliente = sp.cliente ?? "—";
  const rnc = sp.rnc ?? null;
  const monto = parseFloat(sp.monto ?? "0") || 0;
  const metodo = sp.metodo ?? "";
  const fecha = sp.fecha
    ? new Date(sp.fecha).toLocaleString("es-DO", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : new Date().toLocaleDateString("es-DO");
  const ref = sp.ref ?? null;
  const notas = sp.notas ?? null;
  const noRecibo = Date.now().toString(36).toUpperCase().slice(-8);

  // Parsear facturas: "NUMERO:MONTO,NUMERO:MONTO"
  const facturas = (sp.facturas ?? "")
    .split(",")
    .filter(Boolean)
    .map(part => {
      const [numero, montoStr] = part.split(":");
      return { numero: numero ?? "", monto: parseFloat(montoStr ?? "0") || 0 };
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
            <div className="empresa-sub">RNC: {EMPRESA.rnc} · Tel: {EMPRESA.tel}</div>
          </div>

          <div className="sep-double"></div>

          {/* ── TÍTULO ── */}
          <div className="doc-info">
            <div className="doc-tipo">COMPROBANTE DE COBRO</div>
            <div className="doc-num">No. {noRecibo}</div>
            <div className="doc-fecha">{fecha}</div>
          </div>

          <div className="sep-dashed"></div>

          {/* ── CLIENTE ── */}
          <div className="cliente-info">
            <div className="cli-lbl">RECIBIDO DE</div>
            <div className="cli-nombre">{cliente}</div>
            {rnc && <div className="cli-sub">RNC: {rnc}</div>}
          </div>

          <div className="sep-dashed"></div>

          {/* ── FACTURAS ── */}
          {facturas.length > 0 && (
            <>
              <div className="items-hdr">
                <span>FACTURA</span>
                <span>MONTO</span>
              </div>
              {facturas.map((f, i) => (
                <div key={i} className={`item ${i % 2 === 1 ? "item-alt" : ""}`}>
                  <div className="item-row">
                    <span className="item-num">{f.numero}</span>
                    <span className="item-monto">{fmtN(f.monto)}</span>
                  </div>
                </div>
              ))}
              {facturas.length > 1 && (
                <div className="item-total-row">
                  <span>Total</span>
                  <span>{fmtN(monto)}</span>
                </div>
              )}
              <div className="sep-dashed"></div>
            </>
          )}

          {/* ── FORMA DE PAGO ── */}
          <div className="pago-row">
            <span className="pago-lbl">Forma de pago</span>
            <span className="pago-val">{METODO_LABEL[metodo] ?? (metodo || "—")}</span>
          </div>
          {ref && (
            <div className="pago-row">
              <span className="pago-lbl">Referencia</span>
              <span className="pago-val">{ref}</span>
            </div>
          )}

          <div className="sep-dashed"></div>

          {/* ── MONTO TOTAL ── */}
          <div className="monto-box">
            <div className="monto-lbl">MONTO PAGADO</div>
            <div className="monto-val">{fmtN(monto)}</div>
          </div>

          {notas && (
            <>
              <div className="sep-dashed"></div>
              <div className="notas-txt">{notas}</div>
            </>
          )}

          <div className="sep-double"></div>

          {/* ── FIRMA ── */}
          <div className="firmas">
            <div className="firma">
              <div className="firma-line"></div>
              <div className="firma-lbl">Recibido por</div>
            </div>
            <div className="firma">
              <div className="firma-line"></div>
              <div className="firma-lbl">Cliente</div>
            </div>
          </div>

          <div className="footer">
            Este comprobante acredita el pago de las facturas indicadas.
            Consérvelo como comprobante · {EMPRESA.tel}
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
        .sep-dashed { border-top: 1px dashed #ccc; margin: 7px 0; }

        .doc-info { text-align: center; }
        .doc-tipo { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #888; }
        .doc-num { font-size: 14px; font-weight: 900; font-family: 'Courier New', monospace; }
        .doc-fecha { font-size: 9px; color: #666; }

        .cliente-info { margin-bottom: 3px; }
        .cli-lbl { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #aaa; }
        .cli-nombre { font-size: 13px; font-weight: 700; }
        .cli-sub { font-size: 9px; color: #666; }

        .items-hdr { display: flex; justify-content: space-between; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; color: #aaa; margin-bottom: 3px; }
        .item { margin-bottom: 3px; }
        .item-alt { background: #f9f9f9; padding: 0 3px; }
        .item-row { display: flex; justify-content: space-between; font-size: 10px; }
        .item-num { font-family: 'Courier New', monospace; font-weight: 600; }
        .item-monto { font-family: 'Courier New', monospace; }
        .item-total-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; border-top: 1px solid #ddd; padding-top: 3px; margin-top: 3px; }

        .pago-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; }
        .pago-lbl { color: #888; font-weight: 600; }
        .pago-val { font-weight: 500; }

        .monto-box { text-align: center; padding: 10px 0; }
        .monto-lbl { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #999; margin-bottom: 4px; }
        .monto-val { font-size: 24px; font-weight: 900; font-family: 'Courier New', monospace; color: #000; }

        .notas-txt { font-size: 9px; color: #888; font-style: italic; text-align: center; }

        .firmas { display: flex; gap: 16px; }
        .firma { flex: 1; }
        .firma-line { border-bottom: 1px solid #aaa; height: 28px; margin-bottom: 4px; }
        .firma-lbl { font-size: 8.5px; color: #888; text-align: center; }

        .footer { font-size: 8px; color: #bbb; text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee; line-height: 1.5; }

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
