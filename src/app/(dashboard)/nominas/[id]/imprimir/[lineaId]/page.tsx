import { notFound } from "next/navigation";
import { getNomina } from "@/actions/nominas";
import { PrintButtons } from "@/components/nominas/print-buttons";
import { EMPRESA } from "@/lib/empresa";

interface PageProps {
 params: Promise<{ id: string; lineaId: string }>;
}

const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const PERIODO_LABEL: Record<string, string> = {
 PRIMERA_QUINCENA: "1ra Quincena (1–15)",
 SEGUNDA_QUINCENA: "2da Quincena (16–fin)",
};

const fmtNum = (n: number) => {
 const [ent, dec] = Number(n).toFixed(2).split(".");
 return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

export default async function ImprimirLineaPage({ params }: PageProps) {
 const { id, lineaId } = await params;
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const nomina = (await getNomina(id)) as any;
 if (!nomina) notFound();

 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const l = nomina.empleados.find((e: any) => e.id === lineaId);
 if (!l) notFound();

 const periodoLabel = PERIODO_LABEL[nomina.periodo] ?? nomina.periodo;
 const periodo = `${periodoLabel} — ${MESES[nomina.mes]} ${nomina.anio}`;

 const devengados = [
 { label: "Salario quincenal", val: Number(l.salarioBase) },
 Number(l.horasExtra) > 0 ? { label: `Horas extra (${Number(l.horasExtra)} hrs)`, val: Number(l.montoHorasExtra) } : null,
 Number(l.bono) > 0 ? { label: "Bono / Extra", val: Number(l.bono) } : null,
 ].filter(Boolean) as { label: string; val: number }[];

 const descuentos = [
 { label: "AFP (2.87%)", val: Number(l.afpEmpleado) },
 { label: "SFS (3.04%)", val: Number(l.sfsEmpleado) },
 Number(l.prestamos) > 0 ? { label: "Préstamos", val: Number(l.prestamos) } : null,
 Number(l.san) > 0 ? { label: "SAN", val: Number(l.san) } : null,
 Number(l.otrosDescuentos) > 0 ? { label: "Otros desc.", val: Number(l.otrosDescuentos) } : null,
 ].filter(Boolean) as { label: string; val: number }[];

 return (
 <> <PrintButtons /> <p className="no-print text-center text-sm text-gray-500 pt-6 pb-2"> Presiona <strong>Ctrl + P</strong> (Windows) o <strong> + P</strong> (Mac) para imprimir
 </p> <div className="volantes-container"> <div className="volante"> {/* Encabezado */}
 <div className="slip-header"> <div> <div className="company-name"><span className="ap-badge">AP</span> Ferretería AP</div> <div className="company-sub">RNC: {EMPRESA.rnc} · {EMPRESA.tel}</div> </div> <div className="slip-meta"> <div className="slip-numero">{nomina.numero}</div> <div className="slip-periodo">{periodo}</div> </div> </div> {/* Empleado */}
 <div className="emp-section"> <div className="emp-name">{l.empleado.nombre} {l.empleado.apellido}</div> <div className="emp-details"> <span>Cargo: <strong>{l.empleado.cargo}</strong></span> <span>Cédula: <strong>{l.empleado.cedula}</strong></span> </div> </div> {/* Tablas */}
 <div className="tables-grid"> <div className="tbl-block"> <div className="tbl-title plus">+ DEVENGADOS</div> <table> <tbody> {devengados.map((r) => (
 <tr key={r.label}> <td>{r.label}</td> <td className="num">{fmtNum(r.val)}</td> </tr> ))}
 </tbody> <tfoot> <tr className="sub-total"> <td>Total Bruto</td> <td className="num">{fmtNum(Number(l.totalBruto))}</td> </tr> </tfoot> </table> </div> <div className="tbl-block"> <div className="tbl-title minus">− DESCUENTOS</div> <table> <tbody> {descuentos.map((r) => (
 <tr key={r.label}> <td>{r.label}</td> <td className="num neg">({fmtNum(r.val)})</td> </tr> ))}
 </tbody> <tfoot> <tr className="sub-total"> <td>Total Descuentos</td> <td className="num neg">({fmtNum(Number(l.totalDescuentos))})</td> </tr> </tfoot> </table> </div> </div> {/* Neto */}
 <div className="neto-bar"> <span>NETO A COBRAR</span> <span className="neto-amount">RD$ {fmtNum(Number(l.totalNeto))}</span> </div> {/* Firmas */}
 <div className="firmas"> <div className="firma"> <div className="firma-line" /> <div className="firma-label">Firma del empleado</div> </div> <div className="firma"> <div className="firma-line" /> <div className="firma-label">Empleador / Autorizado por</div> </div> </div> </div> </div> <style>{` * { box-sizing: border-box; margin: 0; padding: 0; }
 body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #111; background: #f5f5f5; }
 .volantes-container { max-width: 680px; margin: 0 auto; padding: 0 16px 32px; }
 .volante {
 background: #fff; border: 1px solid #ddd; border-radius: 8px;
 padding: 24px 28px 20px; margin-top: 16px;
 box-shadow: 0 1px 8px rgba(0,0,0,0.08);
 }
 .slip-header {
 display: flex; justify-content: space-between; align-items: flex-start;
 border-bottom: 3px solid #f5821f; padding-bottom: 12px; margin-bottom: 14px;
 }
 .company-name { font-size: 17px; font-weight: 900; letter-spacing: -0.5px; line-height: 1; display: flex; align-items: center; gap: 6px; }
 .ap-badge { display: inline-block; border: 2px solid #000204; padding: 0 3px; font-size: 14px; font-family: 'Arial Black', Impact, sans-serif; color: #f5821f; }
 .company-sub { font-size: 10px; color: #888; margin-top: 4px; }
 .slip-meta { text-align: right; }
 .slip-numero { font-size: 14px; font-weight: 800; }
 .slip-periodo { font-size: 10px; color: #666; margin-top: 3px; }
 .emp-section {
 margin-bottom: 16px; padding: 10px 14px;
 background: #f8f8f8; border-radius: 5px; border-left: 3px solid #f5821f;
 }
 .emp-name { font-size: 16px; font-weight: 900; letter-spacing: -0.3px; }
 .emp-details { display: flex; gap: 24px; margin-top: 4px; font-size: 11px; color: #555; }
 .tables-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
 .tbl-title {
 font-size: 9px; font-weight: 900; letter-spacing: 0.1em;
 text-transform: uppercase; padding-bottom: 5px; margin-bottom: 6px;
 border-bottom: 1px solid #e0e0e0;
 }
 .tbl-title.plus { color: #0a7a0a; }
 .tbl-title.minus { color: #c00; }
 table { width: 100%; border-collapse: collapse; }
 td { padding: 3.5px 0; font-size: 11.5px; color: #222; }
 td.num { text-align: right; font-family: 'Courier New', monospace; font-size: 11.5px; }
 td.neg { color: #c00; }
 tfoot tr.sub-total td { font-weight: 700; font-size: 12px; border-top: 1px solid #ccc; padding-top: 6px; }
 .neto-bar {
 display: flex; justify-content: space-between; align-items: center;
 background: #f5821f; color: #fff; padding: 10px 16px;
 border-radius: 5px; margin-bottom: 16px;
 }
 .neto-bar span:first-child {
 font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
 }
 .neto-amount { font-size: 13px; font-weight: 900; font-family: 'Courier New', monospace; }
 .firmas { display: flex; gap: 40px; padding-top: 12px; border-top: 1px solid #e5e5e5; }
 .firma { flex: 1; }
 .firma-line { border-bottom: 1px solid #aaa; height: 28px; margin-bottom: 5px; }
 .firma-label { font-size: 10px; color: #888; text-align: center; }
 @media print {
 body { background: white; }
 .no-print { display: none !important; }
 .volantes-container { max-width: 100%; padding: 0; }
 .volante { border: 1px solid #bbb; border-radius: 0; box-shadow: none; margin: 0; padding: 18px 22px 16px; }
 .neto-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
 .emp-section { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
 }
 `}</style> </> );
}
