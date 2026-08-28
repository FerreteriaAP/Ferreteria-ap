import { notFound } from "next/navigation";
import { getReporteDineroRecibido } from "@/actions/reportes-caja";
import { PrintLogo } from "@/components/print/logo";
import { EMPRESA } from "@/lib/empresa";

interface Props {
  searchParams: Promise<{ desde?: string; hasta?: string; label?: string }>;
}

const fmt = (n: number) =>
  `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtN = (n: number | null) =>
  n === null ? "—" : `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (d: Date | string) =>
  new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });

const fmtHora = (d: Date | string) =>
  new Date(d).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });

const fmtDT = (d: Date | string) => `${fmtFecha(d)} ${fmtHora(d)}`;

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

export default async function DineroRecibidoPrintPage({ searchParams }: Props) {
  const sp = await searchParams;
  if (!sp.desde || !sp.hasta) notFound();

  const desde = new Date(sp.desde);
  const hasta  = new Date(sp.hasta);
  const data   = await getReporteDineroRecibido(desde, hasta);

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
            <div style={{ fontWeight: 700, fontSize: 11, color: "#000204" }}>REPORTE DE DINERO RECIBIDO</div>
            <div style={{ marginTop: 4 }}>{EMPRESA.nombre} · RNC {EMPRESA.rnc}</div>
            <div>{EMPRESA.dir}</div>
            <div>{EMPRESA.tel}</div>
            <div style={{ marginTop: 4, fontWeight: 700, color: "#f5821f" }}>{label}</div>
            <div style={{ color: "#9ca3af", fontSize: 7.5 }}>Generado: {fmtFecha(new Date())} {fmtHora(new Date())}</div>
          </div>
        </div>

        {/* KPI boxes */}
        {resumen && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Turnos cerrados",  val: resumen.totalTurnos,           color: "#000204", isNum: true  },
              { label: "Sin registro",     val: resumen.pendientes,            color: "#ef4444", isNum: true  },
              { label: "Efectivo esperado",val: fmt(resumen.totalEsperado),    color: "#374151", isNum: false },
              { label: "Total recibido",   val: fmt(resumen.totalRecibido),    color: "#22c55e", isNum: false },
            ].map(k => (
              <div key={k.label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "7px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.04em" }}>{k.label}</div>
                <div style={{ fontSize: 11, fontWeight: 900, color: k.color, marginTop: 3 }}>{k.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabla */}
        <div className="seccion">
          <div style={{
            fontSize: 9, fontWeight: 900, textTransform: "uppercase",
            letterSpacing: "0.06em", color: "#f5821f",
            borderBottom: "1.5px solid #f5821f", paddingBottom: 3, marginBottom: 6,
          }}>
            Detalle por Turno ({filas.length})
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={THC}>Turno</th>
                <th style={TH}>Cajero</th>
                <th style={THC}>Apertura</th>
                <th style={THC}>Cierre</th>
                <th style={THR}>Cierre de Caja</th>
                <th style={THR}>Ef. Esperado</th>
                <th style={THR}>Recibido</th>
                <th style={THR}>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...TD, textAlign: "center", fontStyle: "italic", color: "#9ca3af" }}>
                    Sin turnos cerrados en este período
                  </td>
                </tr>
              ) : filas.map(f => {
                const dif = f.diferencia;
                const difColor = dif === null ? "#9ca3af" : dif < 0 ? "#ef4444" : dif > 0 ? "#22c55e" : "#374151";
                return (
                  <tr key={f.turnoId}>
                    <td style={{ ...TDC, fontWeight: 700 }}>#{f.numero}</td>
                    <td style={TD}>{f.cajero}</td>
                    <td style={{ ...TDC, fontSize: 8 }}>{fmtDT(f.fechaApertura)}</td>
                    <td style={{ ...TDC, fontSize: 8 }}>{fmtDT(f.fechaCierre)}</td>
                    <td style={TDR}>{fmt(f.montoCierre)}</td>
                    <td style={TDR}>{fmt(f.efectivoEsperado)}</td>
                    <td style={{ ...TDR, fontWeight: f.montoRecibido !== null ? 700 : 400, color: f.montoRecibido === null ? "#9ca3af" : "#374151" }}>
                      {fmtN(f.montoRecibido)}
                    </td>
                    <td style={{ ...TDR, fontWeight: 700, color: difColor }}>
                      {dif === null ? "—" : (dif >= 0 ? "+" : "") + fmt(dif)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filas.length > 0 && resumen && (
              <tfoot>
                <tr>
                  <td colSpan={4} style={TF}>TOTALES ({resumen.totalTurnos} turnos)</td>
                  <td style={TFR}>—</td>
                  <td style={TFR}>{fmt(resumen.totalEsperado)}</td>
                  <td style={TFR}>{fmt(resumen.totalRecibido)}</td>
                  <td style={{
                    ...TFR,
                    color: resumen.diferenciaNeta < 0 ? "#ef4444" : resumen.diferenciaNeta > 0 ? "#22c55e" : "#374151",
                  }}>
                    {resumen.diferenciaNeta >= 0 ? "+" : ""}{fmt(resumen.diferenciaNeta)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Nota sobre sin registro */}
        {resumen && resumen.pendientes > 0 && (
          <div style={{ marginTop: 10, padding: "6px 10px", background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 6, fontSize: 8, color: "#92400e" }}>
            ⚠ {resumen.pendientes} turno(s) cerrado(s) sin registro de dinero recibido — se muestran como «—» en las columnas Recibido y Diferencia.
          </div>
        )}

        {/* Pie */}
        <div style={{ borderTop: "1px solid #d1d5db", marginTop: 14, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 7.5, color: "#9ca3af" }}>
          <span>{EMPRESA.nombre} · RNC {EMPRESA.rnc}</span>
          <span>Reporte de Dinero Recibido · {label}</span>
          <span>{fmtFecha(new Date())}</span>
        </div>
      </div>
    </>
  );
}
