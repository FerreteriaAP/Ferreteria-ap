import { notFound } from "next/navigation";
import { getEstadoCuenta } from "@/actions/contabilidad";
import { PrintLogo } from "@/components/print/logo";
import { PrintCloseButtons } from "@/components/contabilidad/print-close-buttons";
import { EMPRESA } from "@/lib/empresa";

interface Props {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ todas?: string }>;
}

const fmt = (n: number) =>
  `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (d: Date | string) =>
  new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });

const CREDITO_LABELS: Record<string, string> = {
  CONTADO: "Contado", DIAS_10: "10 días", DIAS_15: "15 días",
  DIAS_30: "30 días", DIAS_45: "45 días", DIAS_60: "60 días", DIAS_90: "90 días",
};

const BUCKETS = ["0-30", "30-60", "60-90", "90+"] as const;
type Bucket = typeof BUCKETS[number];

/* ─── Estilos de tabla — padding idéntico horizontal en TH y TD ────────────── */
const COL_PAD = "5px 8px";

const TH: React.CSSProperties = {
  padding: COL_PAD,
  fontSize: 8,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#fff",
  background: "#000204",
  whiteSpace: "nowrap",
  textAlign: "left",
};
const TH_R: React.CSSProperties = { ...TH, textAlign: "right" };
const TH_C: React.CSSProperties = { ...TH, textAlign: "center" };

const TD: React.CSSProperties = {
  padding: COL_PAD,
  borderBottom: "1px solid #e5e7eb",
  fontSize: 9.5,
  verticalAlign: "middle",
};
const TD_R: React.CSSProperties = { ...TD, textAlign: "right" };
const TD_C: React.CSSProperties = { ...TD, textAlign: "center" };

const TF: React.CSSProperties = {
  padding: COL_PAD,
  fontSize: 10,
  borderTop: "2px solid #d1d5db",
  background: "#f3f4f6",
};
const TF_R: React.CSSProperties = { ...TF, textAlign: "right" };

/* ─── Componente ────────────────────────────────────────────────────────────── */
export default async function ImprimirEstadoCuentaPage({ params, searchParams }: Props) {
  const { clienteId } = await params;
  const sp = await searchParams;
  const incluirPagadas = sp.todas === "1";

  const data = await getEstadoCuenta(clienteId, incluirPagadas);
  if (!data) notFound();

  const { cliente, facturas, totales, generadoEn } = data;
  const totalMonto   = facturas.reduce((s, f) => s + f.monto, 0);
  const totalCredito = facturas.reduce((s, f) => s + f.credito, 0);

  return (
    <>
      <PrintCloseButtons />
      <p className="no-print" style={{ textAlign: "center", fontSize: 12, color: "#888", paddingTop: 60, paddingBottom: 6 }}>
        Presiona <strong>Ctrl+P</strong> (Windows) · <strong>⌘P</strong> (Mac) · o el botón de arriba → <strong>Guardar como PDF</strong>
      </p>

      {/* ── Hoja letter ── */}
      <div style={{
        width: "8.5in", minHeight: "11in", margin: "16px auto 40px",
        background: "#fff", padding: "0.45in 0.5in 0.45in",
        boxShadow: "0 2px 24px rgba(0,0,0,.14)",
        fontFamily: "'Helvetica Neue', Arial, Helvetica, sans-serif",
        fontSize: 10, color: "#111", lineHeight: 1.45,
        boxSizing: "border-box",
      }}>

        {/* ── Encabezado: logo izquierda, título derecha, alineados al centro ── */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",          /* centra verticalmente logo vs título */
          borderBottom: "3.5px solid #f5821f",
          paddingBottom: 12,
          marginBottom: 14,
        }}>
          {/* El SVG de PrintLogo tiene su propio viewBox; forzamos que no recorte */}
          <div style={{ lineHeight: 0 }}>
            <PrintLogo width={230} height={60} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#f5821f", letterSpacing: "-0.5px" }}>
              ESTADO DE CUENTA
            </div>
            <div style={{ fontSize: 8.5, color: "#777", marginTop: 3 }}>
              Generado: {fmtFecha(generadoEn)}
            </div>
            <div style={{ fontSize: 8, color: "#999", marginTop: 1 }}>
              RNC: {EMPRESA.rnc} · {EMPRESA.tel} · {EMPRESA.email}
            </div>
          </div>
        </div>

        {/* ── Datos del cliente ── */}
        <div style={{
          background: "#f8f8f8",
          borderLeft: "4px solid #f5821f",
          padding: "9px 13px",
          marginBottom: 14,
          borderRadius: "0 4px 4px 0",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1.4fr", gap: 14 }}>
            {/* Col 1: nombre + email */}
            <div>
              <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", color: "#999", letterSpacing: "0.06em" }}>Cliente</div>
              <div style={{ fontSize: 13, fontWeight: 900, marginTop: 2 }}>{cliente.nombre}</div>
              {cliente.nombreLegal && cliente.nombreLegal !== cliente.nombre && (
                <div style={{ fontSize: 9.5, color: "#555", marginTop: 1 }}>{cliente.nombreLegal}</div>
              )}
              {cliente.email && (
                <div style={{ fontSize: 9, color: "#777", marginTop: 3 }}>{cliente.email}</div>
              )}
            </div>
            {/* Col 2: RNC + teléfonos */}
            <div>
              {cliente.rnc && (
                <>
                  <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", color: "#999", letterSpacing: "0.06em" }}>RNC / Cédula</div>
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>{cliente.rnc}</div>
                </>
              )}
              {cliente.telefono && (
                <>
                  <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", color: "#999", letterSpacing: "0.06em", marginTop: 6 }}>Teléfono</div>
                  <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>{cliente.telefono}</div>
                </>
              )}
              {(cliente as { telefonoAlt?: string | null }).telefonoAlt && (
                <div style={{ fontSize: 9.5, color: "#555", marginTop: 1 }}>
                  Alt: {(cliente as { telefonoAlt?: string | null }).telefonoAlt}
                </div>
              )}
            </div>
            {/* Col 3: crédito + límite */}
            <div>
              <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", color: "#999", letterSpacing: "0.06em" }}>Condición crédito</div>
              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>{CREDITO_LABELS[cliente.credito] ?? cliente.credito}</div>
              {cliente.limiteCredito && (
                <>
                  <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", color: "#999", letterSpacing: "0.06em", marginTop: 6 }}>Límite de crédito</div>
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>{fmt(Number(cliente.limiteCredito))}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Cards de aging: sin color + card Total rojo solo con vencidas ── */}
        <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
          {BUCKETS.map((b: Bucket) => {
            const monto = totales[b] ?? 0;
            return (
              <div key={b} style={{
                flex: 1,
                border: "1px solid #d1d5db",
                borderRadius: 5,
                padding: "8px 10px",
                textAlign: "center",
                background: "#fafafa",
              }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888" }}>
                  {b} días
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 800, fontFamily: "monospace", marginTop: 4, color: monto > 0 ? "#111" : "#bbb" }}>
                  {monto > 0 ? fmt(monto) : "—"}
                </div>
              </div>
            );
          })}

          {/* Card "Total vencidas" — siempre rojo */}
          <div style={{
            flex: 1,
            border: "2px solid #fca5a5",
            borderRadius: 5,
            padding: "8px 10px",
            textAlign: "center",
            background: "#fef2f2",
          }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#991b1b" }}>
              VENCIDO
            </div>
            <div style={{ fontSize: 12, fontWeight: 900, fontFamily: "monospace", marginTop: 4, color: "#991b1b" }}>
              {totales.vencido > 0 ? fmt(totales.vencido) : "—"}
            </div>
          </div>
        </div>

        {/* ── Tabla ── */}
        {facturas.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 28, background: "#f9fafb",
            border: "1px solid #e5e7eb", borderRadius: 6, color: "#555", fontWeight: 700,
          }}>
            Sin cuentas pendientes — este cliente está al día
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 9.5, marginBottom: 16 }}>
            <colgroup>
              <col style={{ width: "10%" }} /> {/* Fecha */}
              <col style={{ width: "14%" }} /> {/* No. Factura */}
              <col style={{ width: "14%" }} /> {/* NCF */}
              <col style={{ width: "13%" }} /> {/* Monto */}
              <col style={{ width: "13%" }} /> {/* Crédito */}
              <col style={{ width: "8%" }}  /> {/* Días */}
              <col style={{ width: "13%" }} /> {/* Saldo */}
              <col style={{ width: "15%" }} /> {/* Estado */}
            </colgroup>
            <thead>
              <tr>
                <th style={TH}>Fecha</th>
                <th style={TH}>No. Factura</th>
                <th style={TH}>NCF</th>
                <th style={TH_R}>Monto</th>
                <th style={TH_R}>Crédito</th>
                <th style={TH_C}>Días</th>
                <th style={TH_R}>Saldo</th>
                <th style={TH}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f, idx) => {
                const rowBg      = idx % 2 === 1 ? "#fafafa" : "#ffffff";
                const vencidaBg  = f.vencida ? "#fff5f5" : rowBg;
                const saldoColor = f.vencida ? "#991b1b" : "#111";
                const estadoBg   = f.vencida ? "#fee2e2" : "#f0fdf4";
                const estadoColor = f.vencida ? "#991b1b" : "#15803d";

                const diasColor =
                  f.diasTranscurridos <= 30 ? "#374151"
                  : f.diasTranscurridos <= 60 ? "#92400e"
                  : f.diasTranscurridos <= 90 ? "#9a3412"
                  : "#991b1b";
                const diasBg =
                  f.diasTranscurridos <= 30 ? "#f3f4f6"
                  : f.diasTranscurridos <= 60 ? "#fef3c7"
                  : f.diasTranscurridos <= 90 ? "#ffedd5"
                  : "#fee2e2";

                return (
                  <tr key={f.id} style={{ background: vencidaBg }}>
                    <td style={{ ...TD, color: "#555", fontSize: 9 }}>
                      {fmtFecha(f.fechaFactura)}
                    </td>
                    <td style={{ ...TD, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1a56db" }}>{f.numero}</span>
                    </td>
                    <td style={{ ...TD, fontSize: 8.5, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.ncf
                        ? <>{f.tipoNcf ? <span style={{ color: "#bbb", marginRight: 2 }}>{f.tipoNcf}</span> : null}{f.ncf}</>
                        : <span style={{ color: "#d0d0d0" }}>—</span>
                      }
                    </td>
                    <td style={{ ...TD_R, fontFamily: "monospace" }}>
                      {fmt(f.monto)}
                    </td>
                    <td style={{ ...TD_R, fontFamily: "monospace", fontWeight: f.credito > 0 ? 700 : 400 }}>
                      {f.credito > 0
                        ? <span style={{ color: "#7c3aed" }}>−{fmt(f.credito)}</span>
                        : <span style={{ color: "#d0d0d0" }}>—</span>
                      }
                    </td>
                    <td style={TD_C}>
                      <span style={{
                        display: "inline-block", background: diasBg, color: diasColor,
                        fontSize: 8, fontWeight: 700, fontFamily: "monospace",
                        padding: "2px 5px", borderRadius: 20,
                      }}>
                        {f.diasTranscurridos}d
                      </span>
                    </td>
                    <td style={{ ...TD_R, fontFamily: "monospace", fontWeight: 800, color: saldoColor }}>
                      {fmt(f.saldo)}
                    </td>
                    <td style={TD}>
                      <span style={{
                        display: "inline-block", background: estadoBg, color: estadoColor,
                        fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                      }}>
                        {f.vencida ? "Vencida" : "Vigente"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ ...TF, fontWeight: 700 }}>
                  Totales{" "}
                  <span style={{ fontWeight: 400, fontSize: 8.5, color: "#888" }}>
                    ({facturas.length} factura{facturas.length !== 1 ? "s" : ""})
                  </span>
                </td>
                <td style={{ ...TF_R, fontFamily: "monospace", fontWeight: 700 }}>
                  {fmt(totalMonto)}
                </td>
                <td style={{ ...TF_R, fontFamily: "monospace", fontWeight: 700, color: "#7c3aed" }}>
                  {totalCredito > 0 ? `−${fmt(totalCredito)}` : "—"}
                </td>
                <td style={TF} />
                <td style={{ ...TF_R, fontFamily: "monospace", fontSize: 11, fontWeight: 900, color: totales.vencido > 0 ? "#991b1b" : "#f5821f" }}>
                  {fmt(totales.total)}
                </td>
                <td style={{ ...TF, fontSize: 8.5 }}>
                  {totales.vencido > 0
                    ? <span style={{ color: "#991b1b", fontWeight: 700 }}>Vencido: {fmt(totales.vencido)}</span>
                    : <span style={{ color: "#15803d", fontWeight: 700 }}>Al día ✓</span>
                  }
                </td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* ── Pie ── */}
        <div style={{ borderTop: "1px solid #ebebeb", paddingTop: 8, marginTop: 6, fontSize: 8, color: "#bbb", textAlign: "center", lineHeight: 1.7 }}>
          <p>Estado de cuenta generado el {fmtFecha(generadoEn)} · {EMPRESA.nombre} · {EMPRESA.email}</p>
          <p>Documento informativo. Para consultas comuníquese con nuestro departamento de crédito y cobros.</p>
        </div>
      </div>

      <style>{`
        body { background: #e8e8e8; margin: 0; padding: 0; }

        @media print {
          @page { size: letter; margin: 8mm 14mm 12mm; }

          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print { display: none !important; }

          div[style*="8.5in"] {
            width: 100% !important;
            margin: 0 !important;
            padding: 0.35in 0.45in !important;
            box-shadow: none !important;
            min-height: unset !important;
          }

          tr { page-break-inside: avoid; break-inside: avoid; }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}
