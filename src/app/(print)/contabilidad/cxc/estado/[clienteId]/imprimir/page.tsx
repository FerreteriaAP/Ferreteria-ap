import { notFound } from "next/navigation";
import { getEstadoCuenta } from "@/actions/contabilidad";
import { PrintCloseButtons } from "@/components/contabilidad/print-close-buttons";
import { EMPRESA } from "@/lib/empresa";

interface Props {
 params: Promise<{ clienteId: string }>;
 searchParams: Promise<{ todas?: string }>;
}

const fmt = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (d: Date | string) => new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });

const CREDITO_LABELS: Record<string, string> = {
 CONTADO: "Contado", DIAS_10: "10 días", DIAS_15: "15 días",
 DIAS_30: "30 días", DIAS_45: "45 días", DIAS_60: "60 días", DIAS_90: "90 días",
};

const BUCKETS = ["0-30", "30-60", "60-90", "90+"] as const;
type Bucket = typeof BUCKETS[number];

// Paleta de color por tramo de aging
const PAL: Record<Bucket, { fill: string; bg: string; border: string }> = {
 "0-30": { fill: "#166534", bg: "#dcfce7", border: "#86efac" },
 "30-60": { fill: "#92400e", bg: "#fef3c7", border: "#fcd34d" },
 "60-90": { fill: "#9a3412", bg: "#ffedd5", border: "#fdba74" },
 "90+": { fill: "#991b1b", bg: "#fee2e2", border: "#fca5a5" },
};

export default async function ImprimirEstadoCuentaPage({ params, searchParams }: Props) {
 const { clienteId } = await params;
 const sp = await searchParams;
 const incluirPagadas = sp.todas === "1";

 const data = await getEstadoCuenta(clienteId, incluirPagadas);
 if (!data) notFound();

 const { cliente, facturas, totales, generadoEn } = data;
 const totalMontoOrig = facturas.reduce((s, f) => s + f.monto, 0);

 return (
 <> {/* Botones — solo en pantalla, se ocultan al imprimir */}
 <PrintCloseButtons /> {/* Instrucción */}
 <p className="no-print" style={{ textAlign: "center", fontSize: 12, color: "#888", paddingTop: 60, paddingBottom: 6 }}> Presiona <strong>Ctrl+P</strong> (Windows) · <strong>+P</strong> (Mac) · o el botón de arriba  <strong>Guardar como PDF</strong> </p> {/* 
 CONTENIDO A IMPRIMIR
 Todo usa inline styles para que Safari no dependa de Tailwind
 */}
 <div style={{ width: "8.5in", minHeight: "11in", margin: "16px auto 40px", background: "#fff", padding: "0.5in 0.45in 0.45in", boxShadow: "0 2px 20px rgba(0,0,0,.12)", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 10, color: "#111", lineHeight: 1.4 }}> {/* Encabezado */}
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #f5821f", paddingBottom: 10, marginBottom: 12 }}> <div> <div style={{ fontSize: 18, fontWeight: 900 }}>
                    <span style={{ display: "inline-block", border: "2px solid #000204", padding: "0 3px", fontSize: 15, fontFamily: "'Arial Black', Impact, sans-serif", color: "#f5821f", marginRight: 5 }}>AP</span>
                    {EMPRESA.nombre}
                  </div>
                  <div style={{ fontSize: 9, color: "#777", marginTop: 3 }}>RNC: {EMPRESA.rnc} · {EMPRESA.tel} · {EMPRESA.email}</div>
                  <div style={{ fontSize: 9, color: "#999", marginTop: 1 }}>{EMPRESA.dir}, {EMPRESA.ciudad}</div> </div> <div style={{ textAlign: "right" }}> <div style={{ fontSize: 14, fontWeight: 900 }}>ESTADO DE CUENTA</div> <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>Generado: {fmtFecha(generadoEn)}</div> </div> </div> {/* Datos del cliente */}
 <div style={{ background: "#f5f5f5", borderLeft: "3px solid #f5821f", padding: "9px 12px", marginBottom: 12, borderRadius: "0 4px 4px 0" }}> <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr", gap: 16 }}> <div> <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#888" }}>Cliente</div> <div style={{ fontSize: 13, fontWeight: 900, marginTop: 2 }}>{cliente.nombre}</div> {cliente.nombreLegal && cliente.nombreLegal !== cliente.nombre &&
 <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{cliente.nombreLegal}</div>}
 </div> <div> {cliente.rnc && <> <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#888", marginTop: 4 }}>RNC / Cédula</div> <div style={{ fontSize: 10, fontWeight: 600 }}>{cliente.rnc}</div> </>}
 {cliente.telefono && <> <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#888", marginTop: 4 }}>Teléfono</div> <div style={{ fontSize: 10, fontWeight: 600 }}>{cliente.telefono}</div> </>}
 </div> <div> <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#888" }}>Condición crédito</div> <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>{CREDITO_LABELS[cliente.credito] ?? cliente.credito}</div> {cliente.limiteCredito && <> <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#888", marginTop: 4 }}>Límite</div> <div style={{ fontSize: 10, fontWeight: 600 }}>{fmt(Number(cliente.limiteCredito))}</div> </>}
 </div> </div> </div> {/* Cards de aging */}
 <div style={{ display: "flex", gap: 6, marginBottom: 14 }}> {BUCKETS.map((b: Bucket) => {
 const monto = totales[b] ?? 0;
 const p = PAL[b];
 return (
 <div key={b} style={{ flex: 1, border: `1px solid ${monto > 0 ? p.border : "#e0e0e0"}`, borderRadius: 4, padding: "7px 8px", textAlign: "center", background: monto > 0 ? p.bg : "#fafafa" }}> <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: monto > 0 ? p.fill : "#aaa" }}>{b} días</div> <div style={{ fontSize: 10, fontWeight: 800, fontFamily: "monospace", marginTop: 3, color: monto > 0 ? p.fill : "#aaa" }}> {monto > 0 ? fmt(monto) : "—"}
 </div> </div> );
 })}
 <div style={{ flex: 1, border: `2px solid ${totales.vencido > 0 ? "#fca5a5" : "#bfdbfe"}`, borderRadius: 4, padding: "7px 8px", textAlign: "center", background: totales.vencido > 0 ? "#fef2f2" : "#eff6ff" }}> <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#666" }}>TOTAL</div> <div style={{ fontSize: 12, fontWeight: 800, fontFamily: "monospace", marginTop: 3, color: totales.vencido > 0 ? "#991b1b" : "#1e40af" }}> {fmt(totales.total)}
 </div> {totales.vencido > 0 &&
 <div style={{ fontSize: 8, color: "#b91c1c", marginTop: 2 }}>Vencido: {fmt(totales.vencido)}</div>}
 </div> </div> {/* Tabla */}
 {facturas.length === 0 ? (
 <div style={{ textAlign: "center", padding: 28, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, color: "#15803d", fontWeight: 700 }}> Sin cuentas pendientes
 </div> ) : (
 <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5, marginBottom: 14 }}> <thead> <tr style={{ background: "#f3f4f6" }}> {/* Fecha — columna propia */}
 <th style={TH}>Fecha</th> {/* Factura — columna propia */}
 <th style={TH}>Factura / NCF</th> <th style={{ ...TH, textAlign: "right" }}>Monto</th> {BUCKETS.map((b: Bucket) => (
 <th key={b} style={{ ...TH, textAlign: "right" }}>{b} d.</th> ))}
 <th style={{ ...TH, textAlign: "right" }}>Saldo</th> <th style={TH}>Estado</th> </tr> </thead> <tbody> {facturas.map((f) => {
 const rowBg = f.vencida ? "#fff5f5" : "#ffffff";
 const saldoColor = f.vencida ? "#991b1b" : "#111";
 const estadoBg = f.vencida ? "#fee2e2" : "#dcfce7";
 const estadoColor = f.vencida ? "#991b1b" : "#15803d";

 return (
 <tr key={f.id} style={{ background: rowBg }}> {/* FECHA (celda propia) */}
 <td style={{ ...TD, color: "#555", whiteSpace: "nowrap" }}> {fmtFecha(f.fechaFactura)}
 </td> {/* FACTURA / NCF (celda propia) */}
 <td style={{ ...TD, whiteSpace: "nowrap" }}> <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1d4ed8" }}>{f.numero}</span> {f.ncf && (
 <span style={{ display: "block", fontSize: 8, color: "#aaa" }}> {f.tipoNcf ?? ""} {f.ncf}
 </span> )}
 </td> {/* MONTO */}
 <td style={{ ...TD, textAlign: "right", fontFamily: "monospace", whiteSpace: "nowrap" }}> {fmt(f.monto)}
 </td> {/* BUCKETS */}
 {BUCKETS.map((b: Bucket) => {
 if (f.bucket !== b) return (
 <td key={b} style={{ ...TD, textAlign: "right", color: "#ddd" }}>—</td> );
 return (
 <td key={b} style={{ ...TD, textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: f.vencida ? "#991b1b" : "#1d4ed8", whiteSpace: "nowrap" }}> {fmt(f.saldo)}
 </td> );
 })}

 {/* SALDO */}
 <td style={{ ...TD, textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: saldoColor, whiteSpace: "nowrap" }}> {fmt(f.saldo)}
 </td> {/* ESTADO — solo badge sin días */}
 <td style={TD}> <span style={{ display: "inline-block", background: estadoBg, color: estadoColor, fontSize: 8.5, fontWeight: 700, padding: "2px 6px", borderRadius: 20 }}> {f.vencida ? " Vencida" : " Vigente"}
 </span> </td> </tr> );
 })}
 </tbody> <tfoot> <tr> {/* colspan 2 = Fecha + Factura */}
 <td colSpan={2} style={{ ...TF, fontWeight: 700 }}> Totales <span style={{ fontWeight: 400, fontSize: 9, color: "#888" }}>({facturas.length} factura{facturas.length !== 1 ? "s" : ""})</span> </td> <td style={{ ...TF, textAlign: "right", fontFamily: "monospace", fontWeight: 700, whiteSpace: "nowrap" }}> {fmt(totalMontoOrig)}
 </td> {BUCKETS.map((b: Bucket) => {
 const t = totales[b] ?? 0;
 return (
 <td key={b} style={{ ...TF, textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: t > 0 ? "#991b1b" : "#aaa", whiteSpace: "nowrap" }}> {t > 0 ? fmt(t) : "—"}
 </td> );
 })}
 <td style={{ ...TF, textAlign: "right", fontFamily: "monospace", fontSize: 11, fontWeight: 800, color: totales.vencido > 0 ? "#991b1b" : "#111", whiteSpace: "nowrap" }}> {fmt(totales.total)}
 </td> <td style={{ ...TF, fontSize: 9, color: totales.vencido > 0 ? "#991b1b" : "#15803d" }}> {totales.vencido > 0 ? `Vencido: ${fmt(totales.vencido)}` : "Al día "}
 </td> </tr> </tfoot> </table> )}

 {/* Pie */}
 <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: 8, marginTop: 4, fontSize: 8, color: "#aaa", textAlign: "center", lineHeight: 1.6 }}> <p>Estado de cuenta generado el {fmtFecha(generadoEn)} · Ferretería AP · ventas@ferreteria-ap.com</p> <p>Este documento es informativo. Para consultas comuníquese con nuestro departamento de crédito y cobros.</p> </div> </div> {/* 
 CSS — mínimo y compatible con Safari/Chrome/Firefox
 El grupo (print) no tiene sidebar, así que no hay nada que
 ocultar — solo escondemos los botones .no-print.
 */}
 <style>{` body { background: #e8e8e8; margin: 0; padding: 0; }

 @media print {
 body {
 background: #ffffff !important;
 margin: 0 !important;
 padding: 0 !important;
 }

 /* Ocultar botones y la instrucción de pantalla */
 .no-print { display: none !important; }

 /* El contenedor de la página ocupa el ancho completo */
 div[style*="8.5in"] {
 width: 100% !important;
 margin: 0 !important;
 padding: 0.4in 0.45in !important;
 box-shadow: none !important;
 min-height: unset !important;
 }

 /* Evitar cortes en el medio de filas */
 tr { page-break-inside: avoid; break-inside: avoid; }

 /* Forzar impresión de colores de fondo (Safari + Chrome) */
 * {
 -webkit-print-color-adjust: exact !important;
 print-color-adjust: exact !important;
 color-adjust: exact !important;
 }
 }
 `}</style> </> );
}

// Estilos de tabla reutilizables 

const TH: React.CSSProperties = {
 textAlign: "left",
 padding: "5px 5px",
 fontSize: 8,
 fontWeight: 700,
 textTransform: "uppercase",
 letterSpacing: "0.05em",
 color: "#555",
 borderBottom: "1.5px solid #d1d5db",
 whiteSpace: "nowrap",
 background: "#f3f4f6",
};

const TD: React.CSSProperties = {
 padding: "4px 5px",
 borderBottom: "1px solid #e5e7eb",
 fontSize: 9.5,
 verticalAlign: "middle",
};

const TF: React.CSSProperties = {
 padding: "5px 5px",
 fontSize: 10,
 borderTop: "2px solid #d1d5db",
 background: "#f3f4f6",
};
