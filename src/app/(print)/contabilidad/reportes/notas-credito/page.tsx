import { notFound } from "next/navigation";
import { getNotasCreditoPrint } from "@/actions/nota-credito";
import { PrintLogo } from "@/components/print/logo";
import { EMPRESA } from "@/lib/empresa";

interface Props {
  searchParams: Promise<{ desde?: string; hasta?: string; label?: string }>;
}

const fmt = (n: number) =>
  `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (d: Date | string) =>
  new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtHora = (d: Date | string) =>
  new Date(d).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });

const PAD = "4px 7px";
const TH: React.CSSProperties = {
  padding: PAD, fontSize: 8, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.04em",
  color: "#fff", background: "#000204", whiteSpace: "nowrap",
};
const THR: React.CSSProperties = { ...TH, textAlign: "right" };
const THC: React.CSSProperties = { ...TH, textAlign: "center" };
const TD: React.CSSProperties = {
  padding: PAD, borderBottom: "1px solid #e5e7eb",
  fontSize: 8.5, verticalAlign: "middle",
};
const TDR: React.CSSProperties = { ...TD, textAlign: "right" };
const TDC: React.CSSProperties = { ...TD, textAlign: "center" };
const TF: React.CSSProperties = {
  padding: PAD, fontSize: 9, fontWeight: 700,
  borderTop: "2px solid #d1d5db", background: "#f3f4f6",
};
const TFR: React.CSSProperties = { ...TF, textAlign: "right" };

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APLICADA:  "Aplicada",
  ANULADA:   "Anulada",
};

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: "#f59e0b",
  APLICADA:  "#22c55e",
  ANULADA:   "#ef4444",
};

export default async function NotasCreditoPrintPage({ searchParams }: Props) {
  const sp = await searchParams;
  if (!sp.desde || !sp.hasta) notFound();

  const desde = new Date(sp.desde);
  const hasta  = new Date(sp.hasta);
  const data   = await getNotasCreditoPrint(desde, hasta);

  const label = sp.label ?? `${fmtFecha(desde)} — ${fmtFecha(hasta)}`;
  const { filas, resumen } = data;

  const wrapperStyle: React.CSSProperties = {
    fontFamily: "Arial, sans-serif",
    fontSize: 9,
    color: "#1f2937",
    background: "#fff",
    padding: "18mm 18mm 14mm",
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  return (
    <>
      <style>{`
        @media print {
          @page { size: letter; margin: 0; }
          body { margin: 0; }
          .reporte-wrapper { box-shadow: none !important; margin: 0 !important; padding: 14mm 16mm 12mm !important; }
          tr { break-inside: avoid; }
          .seccion { break-inside: avoid; }
          thead { display: table-header-group; }
          .no-print { display: none !important; }
        }
        .no-print { text-align: center; margin: 16px 0; }
        .no-print button {
          padding: 8px 20px; background: #000204; color: #fff;
          border: none; border-radius: 6px; cursor: pointer; font-size: 14px;
        }
      `}</style>

      <div className="no-print">
        <button onClick={() => window.print()}>🖨️ Imprimir</button>
      </div>

      <div className="reporte-wrapper" style={wrapperStyle}>

        {/* Encabezado */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, borderBottom: "2px solid #000204", paddingBottom: 10 }}>
          <PrintLogo width={240} height={60} />
          <div style={{ textAlign: "right", fontSize: 8.5, color: "#374151" }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: "#000204" }}>REPORTE DE NOTAS DE CRÉDITO</div>
            <div style={{ marginTop: 4 }}>{EMPRESA.nombre} · RNC {EMPRESA.rnc}</div>
            <div>{EMPRESA.dir}</div>
            <div>{EMPRESA.tel}</div>
            <div style={{ marginTop: 4, fontWeight: 700, color: "#f5821f" }}>{label}</div>
            <div style={{ color: "#9ca3af", fontSize: 7.5 }}>Generado: {fmtFecha(new Date())} {fmtHora(new Date())}</div>
          </div>
        </div>

        {/* KPI boxes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Total NCs",      val: resumen.total,          isNum: false, color: "#000204" },
            { label: "Monto Total",    val: fmt(resumen.montoTotal), isNum: false, color: "#f5821f" },
            { label: "Pendientes",     val: resumen.pendientes,     isNum: false, color: "#f59e0b" },
            { label: "Saldo Pendiente",val: fmt(resumen.montoPendiente), isNum: false, color: "#f59e0b" },
          ].map(k => (
            <div key={k.label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "7px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.04em" }}>{k.label}</div>
              <div style={{ fontSize: 11, fontWeight: 900, color: k.color, marginTop: 3 }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Conteo por estado */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Aplicadas", count: resumen.aplicadas, color: "#22c55e" },
            { label: "Anuladas",  count: resumen.anuladas,  color: "#ef4444" },
          ].map(k => (
            <div key={k.label} style={{ background: "#f9fafb", border: `1px solid ${k.color}`, borderRadius: 6, padding: "5px 14px", display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: k.color }}>{k.label}</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: k.color }}>{k.count}</span>
            </div>
          ))}
        </div>

        {/* Tabla de NCs */}
        <div className="seccion">
          <div style={{
            fontSize: 9, fontWeight: 900, textTransform: "uppercase",
            letterSpacing: "0.06em", color: "#f5821f",
            borderBottom: "1.5px solid #f5821f", paddingBottom: 3, marginBottom: 6,
          }}>
            Detalle de Notas de Crédito ({filas.length})
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={THC}>#</th>
                <th style={TH}>Fecha</th>
                <th style={TH}>NC</th>
                <th style={TH}>Factura</th>
                <th style={TH}>Cliente</th>
                <th style={TH}>Emitida por</th>
                <th style={THR}>Monto</th>
                <th style={THR}>Saldo</th>
                <th style={THC}>Estado</th>
                <th style={TH}>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ ...TD, textAlign: "center", fontStyle: "italic", color: "#9ca3af" }}>
                    Sin notas de crédito en este período
                  </td>
                </tr>
              ) : filas.map((f, i) => (
                <tr key={f.id}>
                  <td style={TDC}>{i + 1}</td>
                  <td style={TDC}>{fmtFecha(f.fecha)}</td>
                  <td style={{ ...TD, fontWeight: 700 }}>{f.numero}</td>
                  <td style={TDC}>{f.factura}</td>
                  <td style={TD}>{f.cliente}</td>
                  <td style={TD}>{f.emitidaPor}</td>
                  <td style={TDR}>{fmt(f.monto)}</td>
                  <td style={TDR}>{fmt(f.montoRestante)}</td>
                  <td style={{ ...TDC, fontWeight: 700, color: ESTADO_COLOR[f.estado] ?? "#374151" }}>
                    {ESTADO_LABEL[f.estado] ?? f.estado}
                  </td>
                  <td style={{ ...TD, fontSize: 8, color: "#6b7280" }}>{f.motivo || "—"}</td>
                </tr>
              ))}
            </tbody>
            {filas.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={6} style={TF}>TOTAL ({filas.length} notas)</td>
                  <td style={TFR}>{fmt(resumen.montoTotal)}</td>
                  <td style={TFR}>{fmt(resumen.montoPendiente)}</td>
                  <td colSpan={2} style={TF} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pie */}
        <div style={{ borderTop: "1px solid #d1d5db", marginTop: 14, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 7.5, color: "#9ca3af" }}>
          <span>{EMPRESA.nombre} · RNC {EMPRESA.rnc}</span>
          <span>Reporte de Notas de Crédito · {label}</span>
          <span>{fmtFecha(new Date())}</span>
        </div>
      </div>
    </>
  );
}
