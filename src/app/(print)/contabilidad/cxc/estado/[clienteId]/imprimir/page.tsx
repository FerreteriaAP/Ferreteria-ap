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

        {/* ── Encabezado: logo izquierda, título derecha ── */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderBottom: "3.5px solid #f5821f",
          paddingBottom: 10,
          marginBottom: 14,
        }}>
          {/* viewBox 320×72 → aspect ratio 4.444 → height = 210/4.444 = 47px */}
          <div style={{ lineHeight: 0 }}>
            <PrintLogo width={210} height={47} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#f5821f", letterSpacing: "-0.5px" }}>
              ESTADO DE CUENTA
            </div>
            <div style={{ fontSize: 8.5, color: "#777", marginTop: 3 }}>
              Generado: {fmtFecha(generadoEn)}
            </div>
          </div>
        </div>

        {/* ── Caja de información: empresa (izq) + cliente (der) ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1px 1fr",
          gap: 0, marginBottom: 14, border: "1px solid #e5e7eb",
          borderRadius: 5, overflow: "hidden", fontSize: 9,
        }}>
          {/* Columna empresa */}
          <div style={{ padding: "9px 13px", background: "#fafafa" }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", color: "#f5821f", letterSpacing: "0.06em", marginBottom: 4 }}>
              Emisor
            </div>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#000204" }}>{EMPRESA.nombre}</div>
            <div style={{ color: "#555", marginTop: 3 }}>RNC: <strong>{EMPRESA.rnc}</strong></div>
            <div style={{ color: "#555", marginTop: 1 }}>{EMPRESA.tel}</div>
            <div style={{ color: "#555", marginTop: 1 }}>{EMPRESA.email}</div>
            <div style={{ color: "#777", marginTop: 1, fontSize: 8.5 }}>{EMPRESA.dir}, {EMPRESA.ciudad}</div>
          </div>
          {/* Separador vertical */}
          <div style={{ background: "#e5e7eb" }} />
          {/* Columna cliente */}
          <div style={{ padding: "9px 13px", background: "#fff", borderLeft: "3px solid #f5821f" }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", color: "#f5821f", letterSpacing: "0.06em", marginBottom: 4 }}>
              Cliente
            </div>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#000204" }}>{cliente.nombre}</div>
            {cliente.nombreLegal && cliente.nombreLegal !== cliente.nombre && (
              <div style={{ color: "#555", marginTop: 1 }}>{cliente.nombreLegal}</div>
            )}
            {cliente.rnc && (
              <div style={{ color: "#555", marginTop: 3 }}>RNC/Céd: <strong>{cliente.rnc}</strong></div>
            )}
            {cliente.telefono && (
              <div style={{ color: "#555", marginTop: 1 }}>
                {cliente.telefono}
                {(cliente as { telefonoAlt?: string | null }).telefonoAlt && (
                  <span style={{ marginLeft: 6, color: "#888" }}>· {(cliente as { telefonoAlt?: string | null }).telefonoAlt}</span>
                )}
              </div>
            )}
            {cliente.email && <div style={{ color: "#777", marginTop: 1, fontSize: 8.5 }}>{cliente.email}</div>}
            <div style={{ marginTop: 4, display: "flex", gap: 10 }}>
              <span style={{ fontSize: 8, color: "#888" }}>
                Crédito: <strong style={{ color: "#111" }}>{CREDITO_LABELS[cliente.credito] ?? cliente.credito}</strong>
              </span>
              {cliente.limiteCredito && (
                <span style={{ fontSize: 8, color: "#888" }}>
                  Límite: <strong style={{ color: "#111" }}>{fmt(Number(cliente.limiteCredito))}</strong>
                </span>
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

          {/* Card "Vencido" — rojo solo si hay monto vencido */}
          <div style={{
            flex: 1,
            border: totales.vencido > 0 ? "2px solid #fca5a5" : "1px solid #d1d5db",
            borderRadius: 5,
            padding: "8px 10px",
            textAlign: "center",
            background: totales.vencido > 0 ? "#fef2f2" : "#fafafa",
          }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: totales.vencido > 0 ? "#991b1b" : "#888" }}>
              VENCIDO
            </div>
            <div style={{ fontSize: 12, fontWeight: 900, fontFamily: "monospace", marginTop: 4, color: totales.vencido > 0 ? "#991b1b" : "#bbb" }}>
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
                        fontSize: 8, fontWeight: 700,
                        padding: "2px 5px", borderRadius: 20,
                      }}>
                        {f.diasTranscurridos} Días
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
                  {totales.vencido > 0 && (
                    <span style={{ color: "#991b1b", fontWeight: 700 }}>Vencido: {fmt(totales.vencido)}</span>
                  )}
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
