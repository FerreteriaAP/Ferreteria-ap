import { notFound } from "next/navigation";
import { getReportePeriodoPrint } from "@/actions/reportes-caja";
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

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia",
  CHEQUE: "Cheque", CREDITO: "Crédito",
};

const COL_PAD = "4px 7px";
const TH: React.CSSProperties = {
  padding: COL_PAD, fontSize: 8, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.04em",
  color: "#fff", background: "#000204", whiteSpace: "nowrap",
};
const TH_R: React.CSSProperties = { ...TH, textAlign: "right" };
const TD: React.CSSProperties = {
  padding: COL_PAD, borderBottom: "1px solid #e5e7eb",
  fontSize: 8.5, verticalAlign: "middle",
};
const TD_R: React.CSSProperties = { ...TD, textAlign: "right" };
const TF: React.CSSProperties = {
  padding: COL_PAD, fontSize: 9, fontWeight: 700,
  borderTop: "2px solid #d1d5db", background: "#f3f4f6",
};
const TF_R: React.CSSProperties = { ...TF, textAlign: "right" };
const SECTION_TITLE: React.CSSProperties = {
  fontSize: 9, fontWeight: 900, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "#f5821f",
  borderBottom: "1.5px solid #f5821f", paddingBottom: 3, marginBottom: 7,
};

export default async function ImprimirPeriodoPage({ searchParams }: Props) {
  const sp = await searchParams;
  if (!sp.desde || !sp.hasta) notFound();

  const desde = new Date(sp.desde);
  const hasta  = new Date(sp.hasta);
  const data   = await getReportePeriodoPrint(desde, hasta);
  if (!data) notFound();

  const { filas, consolidado } = data;
  const label = sp.label ?? `${fmtFecha(desde)} — ${fmtFecha(hasta)}`;

  return (
    <>
      <PrintCloseButtons />
      <p className="no-print" style={{ textAlign: "center", fontSize: 12, color: "#888", paddingTop: 60, paddingBottom: 6 }}>
        Presiona <strong>Ctrl+P</strong> (Windows) · <strong>⌘P</strong> (Mac) → <strong>Guardar como PDF</strong>
      </p>

      <div className="reporte-wrapper" style={{
        width: "8.5in", minHeight: "11in", margin: "16px auto 40px",
        background: "#fff", padding: "0.45in 0.5in",
        boxShadow: "0 2px 24px rgba(0,0,0,.14)", height: "auto",
        fontFamily: "'Helvetica Neue', Arial, Helvetica, sans-serif",
        fontSize: 9.5, color: "#111", lineHeight: 1.45,
        boxSizing: "border-box",
      }}>

        {/* ── Encabezado ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          borderBottom: "3.5px solid #f5821f", paddingBottom: 10, marginBottom: 14,
        }}>
          <div style={{ lineHeight: 0 }}>
            <PrintLogo width={210} height={47} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#f5821f", letterSpacing: "-0.5px" }}>
              REPORTE DE CAJA
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#111", marginTop: 2 }}>
              {label}
            </div>
            <div style={{ fontSize: 8.5, color: "#777", marginTop: 2 }}>
              Generado: {fmtFecha(new Date())} {fmtHora(new Date())}
            </div>
          </div>
        </div>

        {/* ── Info empresa ── */}
        <div style={{
          padding: "8px 13px", background: "#fafafa",
          border: "1px solid #e5e7eb", borderRadius: 5,
          fontSize: 9, marginBottom: 14,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <span style={{ fontWeight: 900, fontSize: 10.5 }}>{EMPRESA.nombre}</span>
            <span style={{ color: "#555", marginLeft: 10 }}>RNC: {EMPRESA.rnc}</span>
            <span style={{ color: "#555", marginLeft: 10 }}>{EMPRESA.tel}</span>
          </div>
          <div style={{ fontSize: 8.5, color: "#777" }}>{EMPRESA.dir}, {EMPRESA.ciudad}</div>
        </div>

        {/* ── KPIs consolidados ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14,
        }}>
          {[
            { label: "Turnos cerrados",   value: String(consolidado.turnos),         accent: false },
            { label: "Facturas emitidas", value: String(consolidado.cantidadFacturas), accent: false },
            { label: "Total ventas",      value: fmt(consolidado.totalVentas),        accent: true  },
            { label: "Cobros CxC",        value: fmt(consolidado.totalCobros),        accent: false },
          ].map(k => (
            <div key={k.label} style={{
              border: "1px solid #e5e7eb", borderRadius: 5, padding: "7px 10px", background: "#fafafa",
              borderLeft: k.accent ? "3px solid #f5821f" : undefined,
            }}>
              <div style={{ fontSize: 7.5, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
              <div style={{ fontSize: 13, fontWeight: 900, marginTop: 2, color: k.accent ? "#f5821f" : "#111" }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* ── Ventas por método consolidado ── */}
        <div style={{ marginBottom: 14 }}>
          <div style={SECTION_TITLE}>Ventas por Método de Pago — Consolidado</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {(["EFECTIVO","TARJETA","TRANSFERENCIA","CHEQUE","CREDITO"] as const).map(m => (
                  <th key={m} style={{ ...TH_R, width: "20%" }}>{METODO_LABEL[m]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {(["EFECTIVO","TARJETA","TRANSFERENCIA","CHEQUE","CREDITO"] as const).map(m => (
                  <td key={m} style={{ ...TD_R, fontWeight: consolidado.porMetodo[m] > 0 ? 700 : 400, color: consolidado.porMetodo[m] > 0 ? "#111" : "#bbb" }}>
                    {consolidado.porMetodo[m] > 0 ? fmt(consolidado.porMetodo[m]) : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Resumen por turno ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={SECTION_TITLE}>Detalle por Turno</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: "7%" }}>Turno</th>
                <th style={{ ...TH, width: "16%" }}>Cajero</th>
                <th style={{ ...TH, width: "11%" }}>Apertura</th>
                <th style={{ ...TH, width: "11%" }}>Cierre</th>
                <th style={TH_R}>Ventas</th>
                <th style={TH_R}>Efectivo</th>
                <th style={TH_R}>Tarjeta</th>
                <th style={TH_R}>Transf.</th>
                <th style={TH_R}>Esperado</th>
                <th style={TH_R}>Conteo</th>
                <th style={TH_R}>Dif.</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => {
                const difColor = f.turno.diferencia < 0 ? "#dc2626" : f.turno.diferencia > 0 ? "#16a34a" : "#888";
                return (
                  <tr key={f.turno.id}>
                    <td style={{ ...TD, fontWeight: 700, color: "#f5821f" }}>#{f.turno.numero}</td>
                    <td style={{ ...TD, fontSize: 8 }}>{f.turno.cajero}</td>
                    <td style={{ ...TD, fontSize: 8 }}>
                      {fmtFecha(f.turno.fechaApertura)}<br />
                      <span style={{ color: "#888" }}>{fmtHora(f.turno.fechaApertura)}</span>
                    </td>
                    <td style={{ ...TD, fontSize: 8 }}>
                      {fmtFecha(f.turno.fechaCierre)}<br />
                      <span style={{ color: "#888" }}>{fmtHora(f.turno.fechaCierre)}</span>
                    </td>
                    <td style={{ ...TD_R, fontWeight: 700 }}>{fmt(f.ventas.total)}</td>
                    <td style={{ ...TD_R, color: f.ventas.porMetodo.EFECTIVO > 0 ? "#111" : "#ccc" }}>
                      {f.ventas.porMetodo.EFECTIVO > 0 ? fmt(f.ventas.porMetodo.EFECTIVO) : "—"}
                    </td>
                    <td style={{ ...TD_R, color: f.ventas.porMetodo.TARJETA > 0 ? "#111" : "#ccc" }}>
                      {f.ventas.porMetodo.TARJETA > 0 ? fmt(f.ventas.porMetodo.TARJETA) : "—"}
                    </td>
                    <td style={{ ...TD_R, color: f.ventas.porMetodo.TRANSFERENCIA > 0 ? "#111" : "#ccc" }}>
                      {f.ventas.porMetodo.TRANSFERENCIA > 0 ? fmt(f.ventas.porMetodo.TRANSFERENCIA) : "—"}
                    </td>
                    <td style={TD_R}>{fmt(f.turno.montoEsperado)}</td>
                    <td style={TD_R}>{fmt(f.turno.montoCierre)}</td>
                    <td style={{ ...TD_R, fontWeight: 700, color: difColor }}>
                      {f.turno.diferencia >= 0 ? "+" : ""}{fmt(f.turno.diferencia)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={TF}>TOTALES</td>
                <td style={{ ...TF_R, color: "#f5821f" }}>{fmt(consolidado.totalVentas)}</td>
                <td style={TF_R}>{fmt(consolidado.porMetodo.EFECTIVO)}</td>
                <td style={TF_R}>{fmt(consolidado.porMetodo.TARJETA)}</td>
                <td style={TF_R}>{fmt(consolidado.porMetodo.TRANSFERENCIA)}</td>
                <td colSpan={3} style={TF}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Movimientos consolidados del período ── */}
        {(consolidado.totalGastos > 0 || consolidado.totalCompras > 0 || consolidado.totalPrestamos > 0 || consolidado.totalCobros > 0 || consolidado.totalNCs > 0) && (
          <div className="resumen-movimientos" style={{ marginBottom: 14 }}>
            <div style={SECTION_TITLE}>Resumen de Movimientos — Período Completo</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: "40%" }}>Concepto</th>
                  <th style={TH_R}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {consolidado.totalGastos > 0 && (
                  <tr>
                    <td style={TD}>Gastos de operación</td>
                    <td style={{ ...TD_R, color: "#dc2626", fontWeight: 700 }}>{fmt(consolidado.totalGastos)}</td>
                  </tr>
                )}
                {consolidado.totalCompras > 0 && (
                  <tr>
                    <td style={TD}>Compras de mercancía</td>
                    <td style={{ ...TD_R, color: "#ea580c", fontWeight: 700 }}>{fmt(consolidado.totalCompras)}</td>
                  </tr>
                )}
                {consolidado.totalPrestamos > 0 && (
                  <tr>
                    <td style={TD}>Préstamos a empleados</td>
                    <td style={{ ...TD_R, fontWeight: 700 }}>{fmt(consolidado.totalPrestamos)}</td>
                  </tr>
                )}
                {consolidado.totalCobros > 0 && (
                  <tr>
                    <td style={TD}>Cobros CxC recibidos</td>
                    <td style={{ ...TD_R, color: "#16a34a", fontWeight: 700 }}>{fmt(consolidado.totalCobros)}</td>
                  </tr>
                )}
                {consolidado.totalNCs > 0 && (
                  <tr>
                    <td style={TD}>Notas de crédito emitidas</td>
                    <td style={{ ...TD_R, color: "#7c3aed", fontWeight: 700 }}>{fmt(consolidado.totalNCs)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td style={TF}>Salidas netas (gastos + compras + préstamos)</td>
                  <td style={{ ...TF_R, color: "#dc2626" }}>
                    {fmt(consolidado.totalGastos + consolidado.totalCompras + consolidado.totalPrestamos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Detalle por turno: movimientos y NC ── */}
        {filas.map(f => {
          const hayDetalle =
            f.gastos.length > 0 || f.compras.length > 0 ||
            f.prestamos.length > 0 || f.cobros.length > 0 || f.ncsEmitidas.length > 0;
          if (!hayDetalle) return null;

          return (
            <div key={f.turno.id} className="turno-bloque" style={{
              marginBottom: 14, paddingTop: 10,
              borderTop: "1px dashed #d1d5db",
            }}>
              <div style={{
                fontSize: 9, fontWeight: 900, color: "#555",
                marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em",
              }}>
                Turno #{f.turno.numero} — {f.turno.cajero} — {fmtFecha(f.turno.fechaApertura)}
              </div>

              {/* Gastos del turno */}
              {f.gastos.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: "#dc2626", marginBottom: 3, textTransform: "uppercase" }}>
                    Gastos
                  </div>
                  {f.gastos.map((g, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, padding: "2px 0", borderBottom: "1px dotted #e5e7eb" }}>
                      <span>{g.concepto}{g.notas ? ` — ${g.notas}` : ""}</span>
                      <span style={{ fontWeight: 700, color: "#dc2626" }}>{fmt(g.monto)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Compras del turno */}
              {f.compras.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: "#ea580c", marginBottom: 3, textTransform: "uppercase" }}>
                    Compras de mercancía
                  </div>
                  {f.compras.map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, padding: "2px 0", borderBottom: "1px dotted #e5e7eb" }}>
                      <span>{c.concepto}{c.notas ? ` — ${c.notas}` : ""}</span>
                      <span style={{ fontWeight: 700, color: "#ea580c" }}>{fmt(c.monto)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Préstamos del turno */}
              {f.prestamos.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: "#2563eb", marginBottom: 3, textTransform: "uppercase" }}>
                    Préstamos
                  </div>
                  {f.prestamos.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, padding: "2px 0", borderBottom: "1px dotted #e5e7eb" }}>
                      <span>{p.empleado ?? "—"} — {p.concepto}</span>
                      <span style={{ fontWeight: 700 }}>{fmt(p.monto)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Cobros del turno */}
              {f.cobros.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: "#16a34a", marginBottom: 3, textTransform: "uppercase" }}>
                    Cobros CxC
                  </div>
                  {f.cobros.map((c, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, padding: "2px 0", borderBottom: "1px dotted #e5e7eb" }}>
                        <span>
                          <strong style={{ color: "#f5821f" }}>{c.factura}</strong>
                          {" · "}{c.cliente}
                          {c.metodo ? ` · ${METODO_LABEL[c.metodo] ?? c.metodo}` : ""}
                        </span>
                        <span style={{ fontWeight: 700, color: "#16a34a" }}>{fmt(c.monto)}</span>
                      </div>
                      {c.ncsAplicadas.map((nc, j) => (
                        <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: 8, padding: "1px 0 1px 14px", color: "#92400e" }}>
                          <span>↳ NC aplicada: {nc.numero}</span>
                          <span>-{fmt(nc.monto)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* NC emitidas del turno */}
              {f.ncsEmitidas.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: "#7c3aed", marginBottom: 3, textTransform: "uppercase" }}>
                    Notas de crédito emitidas
                  </div>
                  {f.ncsEmitidas.map((nc, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, padding: "2px 0", borderBottom: "1px dotted #e5e7eb" }}>
                      <span>
                        <strong style={{ color: "#7c3aed" }}>{nc.numero}</strong>
                        {" · "}{nc.facturaOriginal}
                        {" · "}{nc.cliente}
                        {nc.motivo ? ` — ${nc.motivo}` : ""}
                      </span>
                      <span style={{ fontWeight: 700, color: "#7c3aed" }}>{fmt(nc.monto)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Pie de página ── */}
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 8, color: "#aaa", borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
          {EMPRESA.nombre} · {EMPRESA.dir}, {EMPRESA.ciudad} · {EMPRESA.tel}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #fff; }
          /* Liberar el contenedor para que fluya en múltiples páginas */
          .reporte-wrapper {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            padding: 0.4in 0.45in !important;
          }
          /* Evitar cortes dentro de secciones y filas de tabla */
          tr { break-inside: avoid; page-break-inside: avoid; }
          .turno-bloque { break-inside: avoid; page-break-inside: avoid; }
          .resumen-movimientos { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>
    </>
  );
}
