import { notFound } from "next/navigation";
import { getReporteMovimientos } from "@/actions/reportes-caja";
import { PrintLogo } from "@/components/print/logo";
import { PrintCloseButtons } from "@/components/contabilidad/print-close-buttons";
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

const TITLE: React.CSSProperties = {
  fontSize: 9, fontWeight: 900, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "#f5821f",
  borderBottom: "1.5px solid #f5821f", paddingBottom: 3, marginBottom: 6,
};

function EmptyRow({ cols, msg }: { cols: number; msg: string }) {
  return (
    <tr>
      <td colSpan={cols} style={{ ...TD, textAlign: "center", fontStyle: "italic", color: "#9ca3af" }}>
        {msg}
      </td>
    </tr>
  );
}

export default async function MovimientosPrintPage({ searchParams }: Props) {
  const sp = await searchParams;
  if (!sp.desde || !sp.hasta) notFound();

  const desde = new Date(sp.desde);
  const hasta  = new Date(sp.hasta);
  const data   = await getReporteMovimientos(desde, hasta);

  const label = sp.label ?? `${fmtFecha(desde)} — ${fmtFecha(hasta)}`;

  const gastos    = (data.movimientos ?? []).filter(m => m.subTipo === "GASTO");
  const compras   = (data.movimientos ?? []).filter(m => m.subTipo === "COMPRA_MERCANCIA");
  const prestamos = (data.movimientos ?? []).filter(m => m.subTipo === "PRESTAMO");
  const cobros    = (data.movimientos ?? []).filter(m => m.subTipo === "COBRO_CXC");

  const totalMov = (arr: typeof gastos) => arr.reduce((s, m) => s + m.monto, 0);

  const wrapperStyle: React.CSSProperties = {
    fontFamily: "Arial, sans-serif",
    fontSize: 9,
    color: "#1f2937",
    background: "#fff",
    padding: "18mm 18mm 14mm",
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: 14,
    pageBreakInside: "auto",
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
      `}</style>

      <PrintCloseButtons />

      <div className="reporte-wrapper" style={wrapperStyle}>

        {/* Encabezado */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, borderBottom: "2px solid #000204", paddingBottom: 10 }}>
          <PrintLogo width={240} height={60} />
          <div style={{ textAlign: "right", fontSize: 8.5, color: "#374151" }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: "#000204" }}>REPORTE DE MOVIMIENTOS DE CAJA</div>
            <div style={{ marginTop: 4 }}>{EMPRESA.nombre} · RNC {EMPRESA.rnc}</div>
            <div>{EMPRESA.dir}</div>
            <div>{EMPRESA.tel}</div>
            <div style={{ marginTop: 4, fontWeight: 700, color: "#f5821f" }}>{label}</div>
            <div style={{ color: "#9ca3af", fontSize: 7.5 }}>Generado: {fmtFecha(new Date())} {fmtHora(new Date())}</div>
          </div>
        </div>

        {/* Resumen general */}
        {data.resumen && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Total Gastos",   val: data.resumen.totalGastos,   color: "#ef4444" },
              { label: "Total Compras",  val: data.resumen.totalCompras,  color: "#f59e0b" },
              { label: "Total Préstamos",val: data.resumen.totalPrests,   color: "#8b5cf6" },
              { label: "Cobros CxC",     val: data.resumen.totalCobros,   color: "#22c55e" },
            ].map(k => (
              <div key={k.label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "7px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.04em" }}>{k.label}</div>
                <div style={{ fontSize: 11, fontWeight: 900, color: k.color, marginTop: 3 }}>{fmt(k.val)}</div>
              </div>
            ))}
          </div>
        )}

        {/* SECCIÓN: Gastos */}
        <div className="seccion" style={{ marginBottom: 18 }}>
          <div style={TITLE}>Gastos ({gastos.length})</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={TH}>Fecha</th>
                <th style={TH}>Cajero / Turno</th>
                <th style={TH}>Concepto</th>
                <th style={TH}>Notas</th>
                <th style={THR}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {gastos.length === 0
                ? <EmptyRow cols={5} msg="Sin gastos en este período" />
                : gastos.map(m => (
                    <tr key={m.id}>
                      <td style={TDC}>{fmtFecha(m.fecha)}</td>
                      <td style={TD}>{m.cajero} · #{m.turnoNumero}</td>
                      <td style={TD}>{m.concepto}</td>
                      <td style={TD}>{m.notas ?? "—"}</td>
                      <td style={TDR}>{fmt(m.monto)}</td>
                    </tr>
                  ))
              }
            </tbody>
            {gastos.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4} style={TF}>Total Gastos</td>
                  <td style={TFR}>{fmt(totalMov(gastos))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* SECCIÓN: Compras de Mercancía */}
        <div className="seccion" style={{ marginBottom: 18 }}>
          <div style={TITLE}>Compras de Mercancía ({compras.length})</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={TH}>Fecha</th>
                <th style={TH}>Cajero / Turno</th>
                <th style={TH}>Concepto</th>
                <th style={TH}>Notas</th>
                <th style={THR}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {compras.length === 0
                ? <EmptyRow cols={5} msg="Sin compras de mercancía en este período" />
                : compras.map(m => (
                    <tr key={m.id}>
                      <td style={TDC}>{fmtFecha(m.fecha)}</td>
                      <td style={TD}>{m.cajero} · #{m.turnoNumero}</td>
                      <td style={TD}>{m.concepto}</td>
                      <td style={TD}>{m.notas ?? "—"}</td>
                      <td style={TDR}>{fmt(m.monto)}</td>
                    </tr>
                  ))
              }
            </tbody>
            {compras.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4} style={TF}>Total Compras</td>
                  <td style={TFR}>{fmt(totalMov(compras))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* SECCIÓN: Préstamos */}
        <div className="seccion" style={{ marginBottom: 18 }}>
          <div style={TITLE}>Préstamos ({prestamos.length})</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={TH}>Fecha</th>
                <th style={TH}>Cajero / Turno</th>
                <th style={TH}>Empleado</th>
                <th style={TH}>Concepto</th>
                <th style={TH}>Notas</th>
                <th style={THR}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {prestamos.length === 0
                ? <EmptyRow cols={6} msg="Sin préstamos en este período" />
                : prestamos.map(m => (
                    <tr key={m.id}>
                      <td style={TDC}>{fmtFecha(m.fecha)}</td>
                      <td style={TD}>{m.cajero} · #{m.turnoNumero}</td>
                      <td style={TD}>{m.empleado ?? "—"}</td>
                      <td style={TD}>{m.concepto}</td>
                      <td style={TD}>{m.notas ?? "—"}</td>
                      <td style={TDR}>{fmt(m.monto)}</td>
                    </tr>
                  ))
              }
            </tbody>
            {prestamos.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} style={TF}>Total Préstamos</td>
                  <td style={TFR}>{fmt(totalMov(prestamos))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* SECCIÓN: Cobros CxC */}
        <div className="seccion" style={{ marginBottom: 18 }}>
          <div style={TITLE}>Cobros de Cuentas por Cobrar ({cobros.length})</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={TH}>Fecha</th>
                <th style={TH}>Cajero / Turno</th>
                <th style={TH}>Factura</th>
                <th style={TH}>Cliente</th>
                <th style={TH}>Concepto</th>
                <th style={THR}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {cobros.length === 0
                ? <EmptyRow cols={6} msg="Sin cobros de CxC en este período" />
                : cobros.map(m => (
                    <tr key={m.id}>
                      <td style={TDC}>{fmtFecha(m.fecha)}</td>
                      <td style={TD}>{m.cajero} · #{m.turnoNumero}</td>
                      <td style={TDC}>{m.cxcInfo?.factura ?? "—"}</td>
                      <td style={TD}>{m.cxcInfo?.cliente ?? "—"}</td>
                      <td style={TD}>{m.concepto}</td>
                      <td style={TDR}>{fmt(m.monto)}</td>
                    </tr>
                  ))
              }
            </tbody>
            {cobros.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} style={TF}>Total Cobros CxC</td>
                  <td style={TFR}>{fmt(totalMov(cobros))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pie */}
        <div style={{ borderTop: "1px solid #d1d5db", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 7.5, color: "#9ca3af" }}>
          <span>{EMPRESA.nombre} · RNC {EMPRESA.rnc}</span>
          <span>Reporte de Movimientos de Caja · {label}</span>
          <span>{fmtFecha(new Date())}</span>
        </div>
      </div>
    </>
  );
}
