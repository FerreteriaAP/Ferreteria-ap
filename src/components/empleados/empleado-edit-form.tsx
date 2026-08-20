"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actualizarEmpleado } from "@/actions/empleados";
import { User, Briefcase, Landmark, ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const CARD_BG   = "color-mix(in srgb, var(--card) 55%, transparent)";
const HEADER_BG = "color-mix(in oklch, var(--foreground) 4%, var(--card))";
const ACCENT    = "var(--accent-hex)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Empleado = any;

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border" style={{ backgroundColor: CARD_BG, borderColor: "var(--border)" }}>
      <div
        className="flex items-center gap-2.5 px-5 py-3 border-b rounded-t-xl"
        style={{ backgroundColor: HEADER_BG, borderColor: "var(--border)" }}
      >
        <Icon size={13} style={{ color: ACCENT }} />
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
          {title}
        </h3>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({
  label,
  hint,
  children,
  full,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </Label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{hint}</p>}
    </div>
  );
}

// ── EmpleadoEditForm ──────────────────────────────────────────────────────────
export function EmpleadoEditForm({ empleado }: { empleado: Empleado }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [estado, setEstado] = useState<"ACTIVO" | "INACTIVO" | "SUSPENDIDO">(empleado.estado);
  const [afp,    setAfp]    = useState<string>(empleado.afp   ?? "POPULAR");
  const [sfs,    setSfs]    = useState<string>(empleado.sfs   ?? "SENASA");

  const fmt = (d: string | null) => d ? new Date(d).toISOString().split("T")[0] : "";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);

    const result = await actualizarEmpleado(empleado.id, {
      nombre:       fd.get("nombre")    as string,
      apellido:     fd.get("apellido")  as string,
      telefono:     (fd.get("telefono") as string)  || undefined,
      email:        (fd.get("email")    as string)  || undefined,
      cargo:        fd.get("cargo")     as string,
      departamento: (fd.get("departamento") as string) || undefined,
      salarioBase:  Number(fd.get("salarioBase")),
      valorHoraExtra:  Number(fd.get("valorHoraExtra"))  || 0,
      descuentoSan:    Number(fd.get("descuentoSan"))    || 0,
      fechaIngreso: (fd.get("fechaIngreso") as string)   || undefined,
      estado,
      afp,
      sfs,
      nss:           (fd.get("nss")           as string) || undefined,
      cuentaBancaria:(fd.get("cuentaBancaria") as string) || undefined,
      bancoCuenta:   (fd.get("bancoCuenta")   as string) || undefined,
    });

    setLoading(false);
    if ("error" in result) { setError(result.error as string); return; }
    setSaved(true);
    setTimeout(() => router.push(`/empleados/${empleado.id}`), 900);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Error / Success feedback */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm"
          style={{ backgroundColor: "color-mix(in oklch, var(--destructive) 10%, var(--card))", borderColor: "color-mix(in oklch, var(--destructive) 30%, transparent)", color: "var(--destructive)" }}>
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm"
          style={{ backgroundColor: "color-mix(in oklch, #16a34a 10%, var(--card))", borderColor: "color-mix(in oklch, #16a34a 30%, transparent)", color: "#16a34a" }}>
          <CheckCircle2 size={15} className="shrink-0" />
          Cambios guardados — redirigiendo…
        </div>
      )}

      {/* ── Datos personales ── */}
      <Section icon={User} title="Datos personales">
        <Field label="Cédula">
          <Input name="cedula" defaultValue={empleado.cedula} disabled className="opacity-50 cursor-not-allowed" />
        </Field>
        <Field label="Nombre *">
          <Input name="nombre" defaultValue={empleado.nombre} required />
        </Field>
        <Field label="Apellido *">
          <Input name="apellido" defaultValue={empleado.apellido} required />
        </Field>
        <Field label="Teléfono">
          <Input name="telefono" defaultValue={empleado.telefono ?? ""} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={empleado.email ?? ""} />
        </Field>
        <Field label="Estado">
          <Select value={estado} onValueChange={(v) => setEstado((v ?? "ACTIVO") as typeof estado)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVO">Activo</SelectItem>
              <SelectItem value="INACTIVO">Inactivo</SelectItem>
              <SelectItem value="SUSPENDIDO">Suspendido</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>

      {/* ── Datos laborales ── */}
      <Section icon={Briefcase} title="Datos laborales">
        <Field label="Cargo *">
          <Input name="cargo" defaultValue={empleado.cargo} required />
        </Field>
        <Field label="Departamento">
          <Input name="departamento" defaultValue={empleado.departamento ?? ""} />
        </Field>
        <Field label="Salario base mensual (RD$) *">
          <Input name="salarioBase" type="number" step="0.01" defaultValue={Number(empleado.salarioBase)} required />
        </Field>
        <Field label="Fecha de ingreso">
          <Input name="fechaIngreso" type="date" defaultValue={fmt(empleado.fechaIngreso)} />
        </Field>
        <Field label="Valor hora extra (RD$)" hint="Cuánto vale cada hora extra trabajada">
          <Input name="valorHoraExtra" type="number" step="0.01" defaultValue={Number(empleado.valorHoraExtra ?? 0)} />
        </Field>
        <Field label="Descuento SAN quincenal (RD$)" hint="Monto fijo descontado cada quincena">
          <Input name="descuentoSan" type="number" step="0.01" defaultValue={Number(empleado.descuentoSan ?? 0)} />
        </Field>
      </Section>

      {/* ── TSS ── */}
      <Section icon={ShieldCheck} title="Seguridad Social (TSS)">
        <Field label="NSS (Número de Seguridad Social)">
          <Input name="nss" defaultValue={empleado.nss ?? ""} />
        </Field>
        <Field label="AFP">
          <Select value={afp} onValueChange={(v) => setAfp(v ?? "POPULAR")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="POPULAR">AFP Popular</SelectItem>
              <SelectItem value="SIAPEN">Siapen</SelectItem>
              <SelectItem value="RESERVAS">AFP Reservas</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="SFS">
          <Select value={sfs} onValueChange={(v) => setSfs(v ?? "SENASA")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SENASA">Senasa</SelectItem>
              <SelectItem value="SEMMA">Semma</SelectItem>
              <SelectItem value="ARS_HUMANO">ARS Humano</SelectItem>
              <SelectItem value="MAPFRE">Mapfre Salud</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>

      {/* ── Cuenta bancaria ── */}
      <Section icon={Landmark} title="Cuenta bancaria (nómina)">
        <Field label="Banco">
          <Input name="bancoCuenta" defaultValue={empleado.bancoCuenta ?? ""} />
        </Field>
        <Field label="Número de cuenta">
          <Input name="cuentaBancaria" defaultValue={empleado.cuentaBancaria ?? ""} />
        </Field>
      </Section>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 h-10 rounded-xl border text-sm font-medium transition-colors hover:bg-muted/30"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || saved}
          className="flex-1 h-10 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ backgroundColor: ACCENT }}
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
