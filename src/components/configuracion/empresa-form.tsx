"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  saveEmpresaConfig,
  saveCuentaBancaria,
  toggleCuentaBancaria,
  type DatosEmpresa,
} from "@/actions/empresa";

interface CuentaBancaria {
  id: string;
  banco: string;
  nombre: string;
  numero: string;
  tipo: string;
  saldo: number;
  activa: boolean;
}

interface Props {
  datos: DatosEmpresa;
}

const INPUT =
  "w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50";
const LABEL = "text-xs font-medium text-muted-foreground";

const fmt = (n: number) =>
  `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Sub-formulario cuenta bancaria (portal propio, NO anidado) ────────────────

function CuentaForm({
  inicial,
  onOk,
  onCancel,
}: {
  inicial?: CuentaBancaria;
  onOk: () => void;
  onCancel: () => void;
}) {
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [banco, setBanco] = useState(inicial?.banco ?? "");
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [numero, setNumero] = useState(inicial?.numero ?? "");
  const [tipo, setTipo] = useState<"CORRIENTE" | "AHORROS">(
    (inicial?.tipo as "CORRIENTE" | "AHORROS") ?? "CORRIENTE"
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation(); // evita que el evento suba al form padre
    if (!banco || !nombre || !numero) {
      setError("Completa banco, nombre y número");
      return;
    }
    start(async () => {
      const res = await saveCuentaBancaria({ id: inicial?.id, banco, nombre, numero, tipo });
      if (!res.ok) { setError(res.error ?? "Error"); return; }
      onOk();
    });
  }

  return (
    <div className="space-y-3 p-4 rounded-xl border bg-muted/20">
      <p className="text-sm font-semibold">{inicial ? "Editar" : "Nueva"} cuenta bancaria</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={LABEL}>Banco</label>
          <input
            value={banco} onChange={e => setBanco(e.target.value)}
            placeholder="Banco Popular" className={INPUT}
          />
        </div>
        <div className="space-y-1">
          <label className={LABEL}>Alias / Nombre</label>
          <input
            value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Cuenta corriente principal" className={INPUT}
          />
        </div>
        <div className="space-y-1">
          <label className={LABEL}>Número (últimos 4 o completo)</label>
          <input
            value={numero} onChange={e => setNumero(e.target.value)}
            placeholder="****1234" className={INPUT}
          />
        </div>
        <div className="space-y-1">
          <label className={LABEL}>Tipo</label>
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value as "CORRIENTE" | "AHORROS")}
            className={INPUT}
          >
            <option value="CORRIENTE">Corriente</option>
            <option value="AHORROS">Ahorros</option>
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit as unknown as React.MouseEventHandler}
          disabled={isPending}
          className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Sección ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── Formulario principal ──────────────────────────────────────────────────────

export function EmpresaForm({ datos }: Props) {
  const [isPending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<DatosEmpresa>({
    EMPRESA_NOMBRE:        datos.EMPRESA_NOMBRE        ?? "",
    EMPRESA_NOMBRE_LEGAL:  datos.EMPRESA_NOMBRE_LEGAL  ?? "",
    EMPRESA_RNC:           datos.EMPRESA_RNC           ?? "",
    EMPRESA_TELEFONO:      datos.EMPRESA_TELEFONO      ?? "",
    EMPRESA_TELEFONO_ALT:  datos.EMPRESA_TELEFONO_ALT  ?? "",
    EMPRESA_EMAIL:         datos.EMPRESA_EMAIL         ?? "",
    EMPRESA_DIRECCION:     datos.EMPRESA_DIRECCION     ?? "",
    EMPRESA_CIUDAD:        datos.EMPRESA_CIUDAD        ?? "Santo Domingo",
    EMPRESA_PAIS:          datos.EMPRESA_PAIS          ?? "República Dominicana",
    EMPRESA_WEB:           datos.EMPRESA_WEB           ?? "",
    EMPRESA_LEMA:          datos.EMPRESA_LEMA          ?? "",
  });

  const set =
    (k: keyof DatosEmpresa) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));

  function handleGuardar(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    start(async () => {
      const res = await saveEmpresaConfig(form);
      if (!res.ok) { setError(res.error ?? "Error al guardar"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={handleGuardar} className="space-y-6">

      {/* Identificación */}
      <Section title="Identificación">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={LABEL}>Nombre comercial *</label>
            <input
              value={form.EMPRESA_NOMBRE} onChange={set("EMPRESA_NOMBRE")}
              placeholder="Ferretería AP" className={INPUT} required
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL}>Nombre legal (razón social)</label>
            <input
              value={form.EMPRESA_NOMBRE_LEGAL} onChange={set("EMPRESA_NOMBRE_LEGAL")}
              placeholder="AP Ferretería, SRL" className={INPUT}
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL}>RNC</label>
            <input
              value={form.EMPRESA_RNC} onChange={set("EMPRESA_RNC")}
              placeholder="1-31-12345-6" className={INPUT}
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL}>Lema / Slogan (opcional)</label>
            <input
              value={form.EMPRESA_LEMA} onChange={set("EMPRESA_LEMA")}
              placeholder="Tu ferretería de confianza" className={INPUT}
            />
          </div>
        </div>
      </Section>

      {/* Contacto */}
      <Section title="Contacto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={LABEL}>Teléfono principal</label>
            <input
              value={form.EMPRESA_TELEFONO} onChange={set("EMPRESA_TELEFONO")}
              placeholder="(809) 555-0000" className={INPUT}
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL}>Teléfono alternativo</label>
            <input
              value={form.EMPRESA_TELEFONO_ALT} onChange={set("EMPRESA_TELEFONO_ALT")}
              placeholder="(829) 555-0000" className={INPUT}
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL}>Correo electrónico</label>
            <input
              type="email"
              value={form.EMPRESA_EMAIL} onChange={set("EMPRESA_EMAIL")}
              placeholder="info@ferreteria.com" className={INPUT}
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL}>Sitio web</label>
            <input
              value={form.EMPRESA_WEB} onChange={set("EMPRESA_WEB")}
              placeholder="www.ferreteriaap.com" className={INPUT}
            />
          </div>
        </div>
      </Section>

      {/* Ubicación */}
      <Section title="Ubicación">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className={LABEL}>Dirección</label>
            <input
              value={form.EMPRESA_DIRECCION} onChange={set("EMPRESA_DIRECCION")}
              placeholder="Calle Principal #123, Sector…" className={INPUT}
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL}>Ciudad</label>
            <input
              value={form.EMPRESA_CIUDAD} onChange={set("EMPRESA_CIUDAD")}
              placeholder="Santo Domingo" className={INPUT}
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL}>País</label>
            <input
              value={form.EMPRESA_PAIS} onChange={set("EMPRESA_PAIS")}
              placeholder="República Dominicana" className={INPUT}
            />
          </div>
        </div>
      </Section>

      {/* Guardar */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-50 hover:bg-accent"
          style={{ color: "var(--accent-hex)", borderColor: "var(--accent-hex)" }}
        >
          {isPending ? "Guardando…" : "Guardar datos de empresa"}
        </button>
        {saved && (
          <span className="text-sm font-medium" style={{ color: "#16a34a" }}>
            ✓ Guardado
          </span>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>

      {/* Cuentas bancarias — fuera del form principal para evitar conflictos */}
    </form>
  );
}

// ─── Cuentas Bancarias (componente separado, fuera del form de empresa) ────────

export function CuentasBancariasPanel({
  cuentasIniciales,
}: {
  cuentasIniciales: CuentaBancaria[];
}) {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>(cuentasIniciales);
  const [showCuentaForm, setShowCuentaForm] = useState(false);
  const [editandoCuenta, setEditandoCuenta] = useState<CuentaBancaria | null>(null);
  const [, startCuentas] = useTransition();

  function handleToggleCuenta(id: string, activa: boolean) {
    startCuentas(async () => {
      await toggleCuentaBancaria(id, activa);
      setCuentas(prev => prev.map(c => c.id === id ? { ...c, activa } : c));
    });
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between border-b pb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Cuentas bancarias
        </p>
        {!showCuentaForm && !editandoCuenta && (
          <button
            type="button"
            onClick={() => setShowCuentaForm(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
          >
            + Agregar cuenta
          </button>
        )}
      </div>

      {showCuentaForm && (
        <CuentaForm
          onOk={() => { setShowCuentaForm(false); window.location.reload(); }}
          onCancel={() => setShowCuentaForm(false)}
        />
      )}

      {editandoCuenta && (
        <CuentaForm
          inicial={editandoCuenta}
          onOk={() => { setEditandoCuenta(null); window.location.reload(); }}
          onCancel={() => setEditandoCuenta(null)}
        />
      )}

      {cuentas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Sin cuentas bancarias registradas
        </p>
      ) : (
        <div className="space-y-2">
          {cuentas.map(c => (
            <div
              key={c.id}
              className={`rounded-xl border p-3.5 flex items-center gap-4 transition-colors ${
                c.activa ? "bg-card" : "bg-muted/30 opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{c.banco}</span>
                  <span className="text-xs text-muted-foreground">{c.nombre}</span>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">
                    {c.tipo === "CORRIENTE" ? "Cte." : "Aho."}
                  </span>
                  {!c.activa && (
                    <span className="text-[10px] text-muted-foreground font-medium">Inactiva</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs font-mono text-muted-foreground">{c.numero}</span>
                  <span className="text-xs font-mono font-medium">{fmt(c.saldo)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditandoCuenta(c)}
                  className="text-xs px-2.5 py-1 rounded-lg border hover:bg-accent transition-colors"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCuenta(c.id, !c.activa)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    c.activa
                      ? "border-destructive/50 text-destructive hover:bg-destructive/10"
                      : "border-green-500/50 text-green-700 dark:text-green-400 hover:bg-green-500/10"
                  }`}
                >
                  {c.activa ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
