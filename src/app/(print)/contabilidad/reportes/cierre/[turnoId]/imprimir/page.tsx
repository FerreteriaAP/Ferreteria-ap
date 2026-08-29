import { notFound } from "next/navigation";
import { getReporteCierrePrint } from "@/actions/reportes-caja";
import { PrintLogo } from "@/components/print/logo";
import { PrintCloseButtons } from "@/components/contabilidad/print-close-buttons";
import { EMPRESA } from "@/lib/empresa";

interface Props {
  params: Promise<{ turnoId: string }>;
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

/* ── Estilos ────────────────────────────────────────────────────────────────── */
const COL_PAD = "4px 7px";

const TH: React.CSSProperties = {
  padding: COL_PAD, fontSize: 8, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.04em",
  color: "#fff", background: "#000204", whiteSpace: "nowrap",
};
const TH_R: React.CSSProperties = { ...TH, textAlign: "right" };

const TD: React.CSSProperties = {
  padding: COL_PAD, borderBottom: "1px solid #e5e7eb",
  fontSize: 9, verticalAlign: "middle",
};
const TD_R: React.CSSProperties = { ...TD, textAlign: "right" };

const TF: React.CSSProperties = {
  padding: COL_PAD, fontSize: 9.5, fontWeight: 700,
  borderTop: "2px solid #d1d5db", background: "#f3f4f6",
};
const TF_R: React.CSSProperties = { ...TF, textAlign: "right" };

const SECTION: React.CSSProperties = {
  marginBottom: 16,
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 9, fontWeight: 900, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "#f5821f",
  borderBottom: "1.5px solid #f5821f", paddingBottom: 3,
  marginBottom: 7,
};

const KPI_GRID: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
  gap: 6, marginBottom: 14,
};

function KpiBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      border: "1px solid #e5e7eb", borderRadius: 5,
      padding: "6px 8px", background: "#fafafa",
      borderLeft: accent ? "3px solid #f5821f" : undefined,
    }}>
      <div style={{ fontSize: 7.5, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 900, marginTop: 2, color: accent ? "#f5821f" : "#111" }}>{value}</div>
    </div>
  );
}

export default async function ImprimirCierrePage({ params }: Props) {
  const { turnoId } = await params;
  const data = await getReporteCierrePrint(turnoId);
  if (!data) notFound();

  const { turno, ventas, gastos, compras, prestamos, cobros, ncsEmitidas, totales } = data;
  const difColor = turno.diferencia < 0 ? "#dc2626" : turno.diferencia > 0 ? "#16a34a" : "#888";

  return (
    <>
      <PrintCloseButtons />
      <p className="no-print" style={{ textAlign: "center", fontSize: 12, color: "#888", paddingTop: 60, paddingBottom: 6 }}>
        Presiona <strong>Ctrl+P</strong> (Windows) · <strong>⌘P</strong> (Mac) → <strong>Guardar como PDF</strong>
      </p>

      <div className="reporte-wrapper" style={{
        width: "8.5in", minHeight: "11in", margin: "16px auto 40px",
        background: "#fff", padding: "0.45in 0.5in",
        boxShadow: "0 2px 24px rgba(0,0,0,.14)",
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
              CIERRE DE CAJA
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#111", marginTop: 2 }}>
              Turno #{turno.numero}
            </div>
            <div style={{ fontSize: 8.5, color: "#777", marginTop: 2 }}>
              Generado: {fmtFecha(new Date())} {fmtHora(new Date())}
            </div>
          </div>
        </div>

        {/* ── Info empresa + turno ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1px 1fr",
          marginBottom: 14, border: "1px solid #e5e7eb",
          borderRadius: 5, overflow: "hidden", fontSize: 9,
        }}>
          <div style={{ padding: "9px 13px", background: "#fafafa" }}>
            <div style={{ fontSize: 10.5, fontWeight: 900, color: "#000204" }}>{EMPRESA.nombre}</div>
            <div style={{ color: "#555", marginTop: 3 }}>RNC: <strong>{EMPRESA.rnc}</strong></div>
            <div style={{ color: "#555", marginTop: 1 }}>{EMPRESA.tel}</div>
            <div style={{ color: "#777", marginTop: 1, fontSize: 8.5 }}>{EMPRESA.dir}, {EMPRESA.ciudad}</div>
          </div>
          <div style={{ background: "#e5e7eb" }} />
          <div style={{ padding: "9px 13px", background: "#fff", borderLeft: "3px solid #f5821f" }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", color: "#f5821f", letterSpacing: "0.06em", marginBottom: 4 }}>
              Datos del Turno
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 900, color: "#000204" }}>
              {turno.cajero}
            </div>
            <div style={{ color: "#555", marginTop: 3 }}>
              <strong>Apertura:</strong> {fmtFecha(turno.fechaApertura)} {fmtHora(turno.fechaApertura)}
            </div>
            <div style={{ color: "#555", marginTop: 1 }}>
              <strong>Cierre:</strong> {fmtFecha(turno.fechaCierre)} {fmtHora(turno.fechaCierre)}
            </div>
          </div>
        </div>

        {/* ── KPIs del turno ── */}
        <div style={KPI_GRID}>
          <KpiBox label="Apertura" value={fmt(turno.montoApertura)} />
          <KpiBox label="Esperado" value={fmt(turno.montoEsperado)} />
          <KpiBox label="Conteo físico" value={fmt(turno.montoCierre)} />
          <KpiBox
            label={turno.diferencia >= 0 ? "Sobrante" : "Faltante"}
            value={`${turno.diferencia >= 0 ? "+" : ""}${fmt(turno.diferencia)}`}
          />
          <KpiBox label="Total ventas" value={fmt(ventas.total)} accent />
        </div>

        {/* ── Desglose de ventas por método ── */}
        <div className="seccion" style={SECTION}>
          <div style={SECTION_TITLE}>Ventas — {ventas.cantidad} factura{ventas.cantidad !== 1 ? "s" : ""}</div>
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
                  <td key={m} style={{ ...TD_R, fontWeight: ventas.porMetodo[m] > 0 ? 700 : 400, color: ventas.porMetodo[m] > 0 ? "#111" : "#bbb" }}>
                    {ventas.porMetodo[m] > 0 ? fmt(ventas.porMetodo[m]) : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Gastos ── */}
        {gastos.length > 0 && (
          <div className="seccion" style={SECTION}>
            <div style={SECTION_TITLE}>Gastos</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: "60%" }}>Concepto</th>
                  <th style={{ ...TH, width: "25%" }}>Notas</th>
                  <th style={TH_R}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((g, i) => (
                  <tr key={i}>
                    <td style={TD}>{g.concepto}</td>
                    <td style={{ ...TD, color: "#666" }}>{g.notas ?? "—"}</td>
                    <td style={{ ...TD_R, color: "#dc2626", fontWeight: 700 }}>{fmt(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={TF}>Total gastos</td>
                  <td style={{ ...TF_R, color: "#dc2626" }}>{fmt(totales.gastos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Compras de mercancía ── */}
        {compras.length > 0 && (
          <div className="seccion" style={SECTION}>
            <div style={SECTION_TITLE}>Compras de Mercancía</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: "60%" }}>Concepto</th>
                  <th style={{ ...TH, width: "25%" }}>Notas</th>
                  <th style={TH_R}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {compras.map((c, i) => (
                  <tr key={i}>
                    <td style={TD}>{c.concepto}</td>
                    <td style={{ ...TD, color: "#666" }}>{c.notas ?? "—"}</td>
                    <td style={{ ...TD_R, color: "#ea580c", fontWeight: 700 }}>{fmt(c.monto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={TF}>Total compras</td>
                  <td style={{ ...TF_R, color: "#ea580c" }}>{fmt(totales.compras)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Préstamos a empleados ── */}
        {prestamos.length > 0 && (
          <div className="seccion" style={SECTION}>
            <div style={SECTION_TITLE}>Préstamos a Empleados</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: "30%" }}>Empleado</th>
                  <th style={{ ...TH, width: "40%" }}>Concepto</th>
                  <th style={{ ...TH, width: "15%" }}>Notas</th>
                  <th style={TH_R}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {prestamos.map((p, i) => (
                  <tr key={i}>
                    <td style={{ ...TD, fontWeight: 700 }}>{p.empleado ?? "—"}</td>
                    <td style={TD}>{p.concepto}</td>
                    <td style={{ ...TD, color: "#666" }}>{p.notas ?? "—"}</td>
                    <td style={{ ...TD_R, fontWeight: 700 }}>{fmt(p.monto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={TF}>Total préstamos</td>
                  <td style={TF_R}>{fmt(totales.prestamos)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Cobros CxC ── */}
        {cobros.length > 0 && (
          <div className="seccion" style={SECTION}>
            <div style={SECTION_TITLE}>Cobros de Cuentas por Cobrar</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: "20%" }}>Factura</th>
                  <th style={{ ...TH, width: "32%" }}>Cliente</th>
                  <th style={{ ...TH, width: "13%" }}>Método</th>
                  <th style={{ ...TH, width: "13%" }}>Estado</th>
                  <th style={TH_R}>Monto cobrado</th>
                </tr>
              </thead>
              <tbody>
                {cobros.map((c, i) => (
                  <>
                    <tr key={`c-${i}`}>
                      <td style={{ ...TD, fontWeight: 700, color: "#f5821f" }}>{c.factura}</td>
                      <td style={TD}>{c.cliente}</td>
                      <td style={TD}>{c.metodo ? METODO_LABEL[c.metodo] ?? c.metodo : "—"}</td>
                      <td style={TD}>
                        <span style={{
                          fontSize: 8, fontWeight: 700, color: c.confirmado ? "#16a34a" : "#d97706",
                        }}>
                          {c.confirmado ? "✓ Confirmado" : "Pendiente"}
                        </span>
                      </td>
                      <td style={{ ...TD_R, fontWeight: 700, color: "#16a34a" }}>{fmt(c.monto)}</td>
                    </tr>
                    {c.ncsAplicadas.map((nc, j) => (
                      <tr key={`nc-${i}-${j}`} style={{ background: "#fef9f0" }}>
                        <td colSpan={3} style={{ ...TD, color: "#92400e", fontSize: 8, paddingLeft: 14 }}>
                          ↳ Nota de crédito aplicada: <strong>{nc.numero}</strong>
                        </td>
                        <td style={{ ...TD, fontSize: 8 }}></td>
                        <td style={{ ...TD_R, color: "#92400e", fontSize: 8, fontWeight: 700 }}>
                          -{fmt(nc.monto)}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={TF}>Total cobrado</td>
                  <td style={{ ...TF_R, color: "#16a34a" }}>{fmt(totales.cobros)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── NC emitidas ── */}
        {ncsEmitidas.length > 0 && (
          <div className="seccion" style={SECTION}>
            <div style={SECTION_TITLE}>Notas de Crédito Emitidas</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: "18%" }}>Número NC</th>
                  <th style={{ ...TH, width: "18%" }}>Factura origen</th>
                  <th style={{ ...TH, width: "32%" }}>Cliente</th>
                  <th style={{ ...TH, width: "20%" }}>Motivo</th>
                  <th style={TH_R}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {ncsEmitidas.map((nc, i) => (
                  <tr key={i}>
                    <td style={{ ...TD, fontWeight: 700, color: "#7c3aed" }}>{nc.numero}</td>
                    <td style={{ ...TD, color: "#f5821f", fontWeight: 600 }}>{nc.facturaOriginal}</td>
                    <td style={TD}>{nc.cliente}</td>
                    <td style={{ ...TD, color: "#666" }}>{nc.motivo || "—"}</td>
                    <td style={{ ...TD_R, fontWeight: 700, color: "#7c3aed" }}>{fmt(nc.monto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={TF}>Total NC emitidas</td>
                  <td style={{ ...TF_R, color: "#7c3aed" }}>{fmt(totales.ncs)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Resumen de movimientos ── */}
        <div style={{
          marginTop: 16, padding: "10px 14px", background: "#f9fafb",
          border: "1px solid #e5e7eb", borderRadius: 5,
        }}>
          <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", color: "#555", marginBottom: 8 }}>
            Resumen de Movimientos del Turno
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Total gastos",     value: totales.gastos,    color: "#dc2626" },
              { label: "Compras mercancía", value: totales.compras,   color: "#ea580c" },
              { label: "Préstamos",         value: totales.prestamos, color: "#2563eb" },
              { label: "Cobros CxC",        value: totales.cobros,    color: "#16a34a" },
            ].map(r => (
              <div key={r.label}>
                <div style={{ fontSize: 8, color: "#888" }}>{r.label}</div>
                <div style={{ fontSize: 12, fontWeight: 900, color: r.color }}>{fmt(r.value)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Conteo físico vs esperado ── */}
        <div style={{
          marginTop: 10, padding: "10px 14px",
          border: `1px solid ${difColor}40`, borderRadius: 5,
          background: `${difColor}08`,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            <div>
              <div style={{ fontSize: 8, color: "#888" }}>Monto apertura</div>
              <div style={{ fontSize: 12, fontWeight: 900 }}>{fmt(turno.montoApertura)}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, color: "#888" }}>Monto esperado</div>
              <div style={{ fontSize: 12, fontWeight: 900 }}>{fmt(turno.montoEsperado)}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, color: "#888" }}>Conteo físico</div>
              <div style={{ fontSize: 12, fontWeight: 900 }}>{fmt(turno.montoCierre)}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, color: "#888" }}>{turno.diferencia >= 0 ? "Sobrante" : "Faltante"}</div>
              <div style={{ fontSize: 12, fontWeight: 900, color: difColor }}>
                {turno.diferencia >= 0 ? "+" : ""}{fmt(turno.diferencia)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Firmas ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 30, marginTop: 32, paddingTop: 20,
        }}>
          {["Cajero / Responsable", "Revisado por", "Autorizado por"].map(label => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #999", paddingTop: 4, fontSize: 8, color: "#666" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Pie de página ── */}
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 8, color: "#aaa", borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
          {EMPRESA.nombre} · {EMPRESA.dir}, {EMPRESA.ciudad} · {EMPRESA.tel}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #fff; }
          .reporte-wrapper {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            padding: 0.4in 0.45in !important;
          }
          tr { break-inside: avoid; page-break-inside: avoid; }
          .seccion { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>
    </>
  );
}
