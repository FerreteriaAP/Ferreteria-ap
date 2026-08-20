"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { actualizarLineaNomina } from "@/actions/nominas";
import { cn } from "@/lib/utils";
import { Save, CheckCircle2, Loader2, Printer } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmpleadoLinea {
  id: string;
  salarioBase: number;
  horasExtra: number;
  montoHorasExtra: number;
  bono: number;
  afpEmpleado: number;
  sfsEmpleado: number;
  afpEmpleador: number;
  sfsEmpleador: number;
  prestamos: number;
  san: number;
  otrosDescuentos: number;
  totalBruto: number;
  totalDescuentos: number;
  totalNeto: number;
  notas: string | null;
  empleado: {
    nombre: string;
    apellido: string;
    cargo: string;
    cedula: string;
    valorHoraExtra: number;
    descuentoSan: number;
    exentoAfp: boolean;
    exentoSfs: boolean;
  };
}

interface NominaTablaProps {
  nominaId: string;
  estado: string;
  numero: string;
  periodo: string;
  mes: number;
  anio: number;
  lineas: EmpleadoLinea[];
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const DK_HEADER  = "rgba(10, 15, 30, 0.97)";   // darkest — group labels row
const DK_SUB     = "rgba(20, 30, 50, 0.97)";   // column names row
const DK_ROW     = "rgba(15, 22, 40, 0.82)";   // data rows
const DK_ROW_ALT = "rgba(20, 32, 55, 0.76)";   // alternating row
const DK_SPOT    = "rgba(255,255,255,0.06)";    // bruto / neto column highlight
const ORANGE     = "var(--accent-hex)";
const W90        = "rgba(255,255,255,0.90)";     // primary text
const W55        = "rgba(255,255,255,0.55)";     // muted text
const W30        = "rgba(255,255,255,0.30)";     // very muted
const EMERALD    = "#34d399";
const ROSE       = "#f87171";
const BORDER     = "rgba(255,255,255,0.07)";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtNum = (n: number) => {
  const [ent, dec] = Number(n).toFixed(2).split(".");
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
};

// ── FilaState ─────────────────────────────────────────────────────────────────

type FilaState = {
  horasExtra: number;
  montoHorasExtra: number;
  bono: number;
  afpEmpleado: number;
  sfsEmpleado: number;
  prestamos: number;
  san: number;
  otrosDescuentos: number;
};

function calcTotales(s: FilaState, salario: number) {
  const bruto = salario + s.montoHorasExtra + s.bono;
  const desc  = s.afpEmpleado + s.sfsEmpleado + s.prestamos + s.san + s.otrosDescuentos;
  return { bruto, desc, neto: bruto - desc };
}

// ── NumericInput ──────────────────────────────────────────────────────────────

/** Focuses the input identified by [data-nr][data-nc], if it exists. */
function focusCell(row: number, col: number) {
  const el = document.querySelector<HTMLElement>(
    `[data-nr="${row}"][data-nc="${col}"]`
  );
  el?.focus();
}

function NumericInput({
  value,
  onChange,
  isDirty,
  isHrs,
  rowIdx,
  colIdx,
}: {
  value: number;
  onChange: (v: number) => void;
  isDirty: boolean;
  isHrs?: boolean;
  rowIdx: number;
  colIdx: number;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayVal = focused
    ? raw
    : value === 0
    ? ""
    : isHrs
    ? String(value)
    : fmtNum(value);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      // Shift+Enter → sube una fila, Enter → baja una fila
      focusCell(e.shiftKey ? rowIdx - 1 : rowIdx + 1, colIdx);
    }
    // Tab / Shift+Tab ya navega entre inputs en orden DOM
    // Solo bloqueamos que el foco caiga en el botón Guardar (tabIndex=-1 allá)
  }

  return (
    <input
      ref={inputRef}
      data-nr={rowIdx}
      data-nc={colIdx}
      type="text"
      inputMode={isHrs ? "numeric" : "decimal"}
      value={displayVal}
      placeholder="—"
      onFocus={() => {
        setRaw(value === 0 ? "" : String(value));
        setFocused(true);
        setTimeout(() => inputRef.current?.select(), 0);
      }}
      onChange={(e) => {
        const txt = e.target.value.replace(/,/g, "");
        setRaw(e.target.value);
        onChange(Number(txt) || 0);
      }}
      onBlur={() => setFocused(false)}
      onKeyDown={handleKeyDown}
      className="w-full bg-transparent text-right font-mono text-[13px] tabular-nums border-0 border-b px-0 py-0 transition-colors focus:outline-none"
      style={{
        color: isDirty ? "#fbbf24" : W90,
        borderBottomColor: focused ? ORANGE : "rgba(255,255,255,0.15)",
        caretColor: ORANGE,
      }}
    />
  );
}

// ── FilaNomina ────────────────────────────────────────────────────────────────

function FilaNomina({
  linea,
  nominaId,
  editable,
  onSaved,
  rowIndex,
}: {
  linea: EmpleadoLinea;
  nominaId: string;
  editable: boolean;
  onSaved: () => void;
  rowIndex: number;
}) {
  const [vals, setVals] = useState<FilaState>({
    horasExtra:      linea.horasExtra,
    montoHorasExtra: linea.montoHorasExtra,
    bono:            linea.bono,
    afpEmpleado:     linea.afpEmpleado,
    sfsEmpleado:     linea.sfsEmpleado,
    prestamos:       linea.prestamos,
    san:             linea.san,
    otrosDescuentos: linea.otrosDescuentos,
  });

  const [saved,  setSaved]  = useState<FilaState>(vals);
  const [saving, setSaving] = useState(false);
  const [ok,     setOk]     = useState(false);

  const isDirty = JSON.stringify(vals) !== JSON.stringify(saved);
  const { bruto, neto } = calcTotales(vals, linea.salarioBase);

  const setHorasExtra = (hrs: number) => {
    const monto = +(hrs * linea.empleado.valorHoraExtra).toFixed(2);
    setVals((v) => ({ ...v, horasExtra: hrs, montoHorasExtra: monto }));
  };
  const set = (k: keyof FilaState) => (v: number) =>
    setVals((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await actualizarLineaNomina(linea.id, {
      horasExtra:      vals.horasExtra,
      montoHorasExtra: vals.montoHorasExtra,
      bono:            vals.bono,
      afpEmpleado:     vals.afpEmpleado,
      sfsEmpleado:     vals.sfsEmpleado,
      prestamos:       vals.prestamos,
      san:             vals.san,
      otrosDescuentos: vals.otrosDescuentos,
    });
    setSaved(vals);
    setSaving(false);
    setOk(true);
    setTimeout(() => setOk(false), 2000);
    onSaved();
  };

  const rowBg = isDirty
    ? "rgba(251,191,36,0.06)"
    : rowIndex % 2 === 0 ? DK_ROW : DK_ROW_ALT;

  const cellR = (content: React.ReactNode, extraStyle?: React.CSSProperties) => (
    <td
      className="px-2.5 py-2 text-right font-mono text-[13px] tabular-nums"
      style={{ borderRight: `1px solid ${BORDER}`, color: W90, ...extraStyle }}
    >
      {content}
    </td>
  );

  return (
    <tr style={{ backgroundColor: rowBg, borderBottom: `1px solid ${BORDER}` }}>

      {/* Empleado */}
      <td className="px-3 py-2 whitespace-nowrap" style={{ borderRight: `1px solid ${BORDER}` }}>
        <p className="text-[13px] font-semibold leading-tight" style={{ color: W90 }}>
          {linea.empleado.nombre} {linea.empleado.apellido}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: W30 }}>{linea.empleado.cargo}</p>
      </td>

      {/* Salario Q */}
      {cellR(<span style={{ color: W55 }}>{fmtNum(linea.salarioBase)}</span>)}

      {/* ── DEVENGADOS ── */}
      {/* H.Extra hrs */}
      <td className="px-2.5 py-2 w-[72px]" style={{ borderRight: `1px solid ${BORDER}` }}>
        {editable
          ? <NumericInput value={vals.horasExtra} onChange={setHorasExtra} isDirty={isDirty} isHrs rowIdx={rowIndex} colIdx={0} />
          : <span className="text-right block font-mono text-[13px]" style={{ color: W90 }}>
              {vals.horasExtra || "—"}
            </span>}
      </td>

      {/* H.Extra RD$ */}
      <td className="px-2.5 py-2 w-[120px]" style={{ borderRight: `1px solid ${BORDER}` }}>
        {editable
          ? <NumericInput value={vals.montoHorasExtra} onChange={set("montoHorasExtra")} isDirty={isDirty} rowIdx={rowIndex} colIdx={1} />
          : <span className="text-right block font-mono text-[13px]" style={{ color: W90 }}>
              {vals.montoHorasExtra > 0 ? fmtNum(vals.montoHorasExtra) : "—"}
            </span>}
      </td>

      {/* Bono */}
      <td className="px-2.5 py-2 w-[120px]" style={{ borderRight: `1px solid ${BORDER}` }}>
        {editable
          ? <NumericInput value={vals.bono} onChange={set("bono")} isDirty={isDirty} rowIdx={rowIndex} colIdx={2} />
          : <span className="text-right block font-mono text-[13px]" style={{ color: W90 }}>
              {vals.bono > 0 ? fmtNum(vals.bono) : "—"}
            </span>}
      </td>

      {/* Total Bruto */}
      <td className="px-2.5 py-2 text-right font-mono text-[13px] tabular-nums"
        style={{ backgroundColor: DK_SPOT, borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>
        <span className="font-bold" style={{ color: EMERALD }}>{fmtNum(bruto)}</span>
      </td>

      {/* ── DESCUENTOS ── */}
      {/* AFP */}
      <td className="px-2.5 py-2 w-[115px]" style={{ borderRight: `1px solid ${BORDER}` }}>
        {linea.empleado.exentoAfp
          ? <span className="block text-right text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded" style={{ color: W30, backgroundColor: "rgba(255,255,255,0.06)" }}>Exento</span>
          : editable
          ? <NumericInput value={vals.afpEmpleado} onChange={set("afpEmpleado")} isDirty={isDirty} rowIdx={rowIndex} colIdx={3} />
          : <span className="text-right block font-mono text-[13px]" style={{ color: W55 }}>{fmtNum(vals.afpEmpleado)}</span>}
      </td>

      {/* SFS */}
      <td className="px-2.5 py-2 w-[115px]" style={{ borderRight: `1px solid ${BORDER}` }}>
        {linea.empleado.exentoSfs
          ? <span className="block text-right text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded" style={{ color: W30, backgroundColor: "rgba(255,255,255,0.06)" }}>Exento</span>
          : editable
          ? <NumericInput value={vals.sfsEmpleado} onChange={set("sfsEmpleado")} isDirty={isDirty} rowIdx={rowIndex} colIdx={4} />
          : <span className="text-right block font-mono text-[13px]" style={{ color: W55 }}>{fmtNum(vals.sfsEmpleado)}</span>}
      </td>

      {/* Préstamos */}
      <td className="px-2.5 py-2 w-[120px]" style={{ borderRight: `1px solid ${BORDER}` }}>
        {editable
          ? <NumericInput value={vals.prestamos} onChange={set("prestamos")} isDirty={isDirty} rowIdx={rowIndex} colIdx={5} />
          : <span className="text-right block font-mono text-[13px]"
              style={{ color: vals.prestamos > 0 ? ROSE : W55 }}>
              {vals.prestamos > 0 ? fmtNum(vals.prestamos) : "—"}
            </span>}
      </td>

      {/* SAN */}
      <td className="px-2.5 py-2 w-[115px]" style={{ borderRight: `1px solid ${BORDER}` }}>
        {editable
          ? <NumericInput value={vals.san} onChange={set("san")} isDirty={isDirty} rowIdx={rowIndex} colIdx={6} />
          : <span className="text-right block font-mono text-[13px]" style={{ color: W55 }}>
              {vals.san > 0 ? fmtNum(vals.san) : "—"}
            </span>}
      </td>

      {/* Otros */}
      <td className="px-2.5 py-2 w-[115px]" style={{ borderRight: `1px solid ${BORDER}` }}>
        {editable
          ? <NumericInput value={vals.otrosDescuentos} onChange={set("otrosDescuentos")} isDirty={isDirty} rowIdx={rowIndex} colIdx={7} />
          : <span className="text-right block font-mono text-[13px]" style={{ color: W55 }}>
              {vals.otrosDescuentos > 0 ? fmtNum(vals.otrosDescuentos) : "—"}
            </span>}
      </td>

      {/* ── NETO ── */}
      <td className="px-3 py-2 text-right whitespace-nowrap"
        style={{ backgroundColor: DK_SPOT, borderLeft: `1px solid ${BORDER}` }}>
        <span className="text-[11px] mr-0.5" style={{ color: W30 }}>RD$</span>
        <span className="text-[15px] font-black tracking-tight" style={{ color: ORANGE }}>
          {fmtNum(neto)}
        </span>
      </td>

      {/* Guardar */}
      {editable && (
        <td className="px-2 py-2 w-[84px] text-center">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto" style={{ color: W30 }} />
          ) : ok ? (
            <CheckCircle2 className="h-4 w-4 mx-auto" style={{ color: EMERALD }} />
          ) : (
            <button
              onClick={handleSave}
              tabIndex={-1}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all hover:brightness-110"
              style={{
                backgroundColor: isDirty ? ORANGE : "rgba(255,255,255,0.10)",
                color: isDirty ? "#fff" : W55,
              }}
            >
              <Save className="h-3 w-3" /> Guardar
            </button>
          )}
        </td>
      )}

      {/* Volante */}
      <td className="px-2 py-2 w-[38px] text-center">
        <Link
          href={`/nominas/${nominaId}/imprimir/${linea.id}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`Volante de ${linea.empleado.nombre}`}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:brightness-125"
          style={{ color: W30 }}
        >
          <Printer className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  );
}

// ── VolantesBtn ───────────────────────────────────────────────────────────────

function VolantesBtn({ nominaId }: { nominaId: string }) {
  return (
    <Link
      href={`/nominas/${nominaId}/imprimir`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted/40"
      style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
    >
      <Printer className="h-3.5 w-3.5" /> Imprimir volantes
    </Link>
  );
}

// ── NominaTabla ───────────────────────────────────────────────────────────────

export function NominaTabla({
  nominaId, estado, periodo, mes, anio, lineas,
}: NominaTablaProps) {
  const router  = useRouter();
  const editable = estado === "BORRADOR";

  const handleSaved = useCallback(() => { router.refresh(); }, [router]);

  const totalBruto = lineas.reduce((s, l) => s + l.salarioBase + l.montoHorasExtra + l.bono, 0);
  const totalNeto  = lineas.reduce((s, l) => s + l.totalNeto, 0);

  // Header helpers
  const th = (label: string, cls?: string, style?: React.CSSProperties) => (
    <th className={cn("px-2.5 py-2 text-right text-[11px] font-bold tracking-wide whitespace-nowrap", cls)}
      style={{ color: W90, borderRight: `1px solid ${BORDER}`, ...style }}>
      {label}
    </th>
  );

  const thSection = (label: string, span: number, color: string) => (
    <th colSpan={span}
      className="px-2 py-1.5 text-center text-[11px] font-black tracking-[0.10em] uppercase"
      style={{ color, borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>
      {label}
    </th>
  );

  return (
    <div className="space-y-3">

      {/* Controls */}
      <div className="flex items-center justify-between">
        {editable && (
          <p className="text-[11px] italic" style={{ color: "var(--muted-foreground)" }}>
            Escribe directamente en la tabla — el botón Guardar aparece al modificar cada fila
          </p>
        )}
        <div className="ml-auto">
          <VolantesBtn nominaId={nominaId} />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: BORDER, backgroundColor: DK_ROW }}>
        <table className="w-full border-collapse">

          {/* THEAD */}
          <thead>
            {/* Group row */}
            <tr style={{ backgroundColor: DK_HEADER }}>
              <th className="px-3 py-2 text-left text-[11px] font-black tracking-wide uppercase"
                style={{ color: W90, borderRight: `1px solid ${BORDER}` }}>
                Empleado / Cargo
              </th>
              <th className="px-2.5 py-2 text-right text-[11px] font-bold tracking-wide whitespace-nowrap"
                style={{ color: W90, borderRight: `1px solid ${BORDER}` }}>
                Salario Q
              </th>
              {thSection("↑ Devengados", 3, EMERALD)}
              <th className="px-2 py-1.5 text-center text-[9px] font-black tracking-[0.12em] uppercase"
                style={{ color: W90, backgroundColor: DK_SPOT, borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>
                Total Bruto
              </th>
              {thSection("↓ Descuentos", 5, ROSE)}
              <th className="px-3 py-2 text-center text-[9px] font-black tracking-[0.12em] uppercase"
                style={{ color: ORANGE, backgroundColor: DK_SPOT, borderLeft: `1px solid ${BORDER}` }}>
                Neto
              </th>
              {editable && <th style={{ backgroundColor: DK_HEADER, width: 84 }} />}
              <th style={{ backgroundColor: DK_HEADER, width: 38 }} />
            </tr>

            {/* Column names row */}
            <tr style={{ backgroundColor: DK_SUB, borderBottom: `1px solid ${BORDER}` }}>
              <th className="px-3 py-1.5 text-left" style={{ borderRight: `1px solid ${BORDER}` }} />
              {th("RD$")}
              {th("Hrs", "border-l")}
              {th("$ Monto")}
              {th("$ Bono")}
              <th className="px-2.5 py-1.5 text-right text-[10px] font-bold tracking-wide"
                style={{ color: EMERALD, backgroundColor: DK_SPOT, borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>
                $ Bruto
              </th>
              {th("AFP 2.87%")}
              {th("SFS 3.04%")}
              {th("$ Préstamos")}
              {th("$ SAN")}
              {th("$ Otros")}
              <th className="px-3 py-1.5 text-center text-[10px] font-bold"
                style={{ color: ORANGE, backgroundColor: DK_SPOT, borderLeft: `1px solid ${BORDER}` }}>
                RD$
              </th>
              {editable && <th style={{ backgroundColor: DK_SUB }} />}
              <th style={{ backgroundColor: DK_SUB }} />
            </tr>
          </thead>

          {/* TBODY */}
          <tbody>
            {lineas.map((l, i) => (
              // Key includes prestamos so React remounts when sync updates server value
              <FilaNomina
                key={`${l.id}-${l.prestamos}`}
                linea={l}
                nominaId={nominaId}
                editable={editable}
                onSaved={handleSaved}
                rowIndex={i}
              />
            ))}
          </tbody>

          {/* TFOOT */}
          <tfoot>
            <tr style={{ backgroundColor: DK_HEADER, borderTop: `2px solid rgba(255,255,255,0.12)` }}>
              <td className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: W30 }}>
                Totales — {lineas.length} empleado{lineas.length !== 1 ? "s" : ""}
              </td>
              <td colSpan={4} />
              <td className="px-2.5 py-2.5 text-right font-mono font-bold tabular-nums"
                style={{ color: EMERALD, backgroundColor: DK_SPOT, borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>
                {fmtNum(totalBruto)}
              </td>
              <td colSpan={5} />
              <td className="px-3 py-2.5 text-right whitespace-nowrap"
                style={{ backgroundColor: DK_SPOT, borderLeft: `1px solid ${BORDER}` }}>
                <span className="text-[10px] mr-1" style={{ color: W30 }}>RD$</span>
                <span className="text-[16px] font-black tracking-tight" style={{ color: ORANGE }}>
                  {fmtNum(totalNeto)}
                </span>
              </td>
              {editable && <td style={{ backgroundColor: DK_HEADER }} />}
              <td style={{ backgroundColor: DK_HEADER }} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Hint */}
      {editable && (
        <p className="text-[11px] text-center" style={{ color: "var(--muted-foreground)" }}>
          AFP y SFS se pueden poner en <strong>0</strong> si el empleado no aplica ·
          Los cambios se resaltan en <span style={{ color: "#fbbf24" }}>amarillo</span> hasta guardar
        </p>
      )}
    </div>
  );
}
