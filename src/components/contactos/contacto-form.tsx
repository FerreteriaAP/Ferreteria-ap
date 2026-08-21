"use client";

import { useState } from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { crearContacto, actualizarContacto, type ContactoInput } from "@/actions/contactos";
import { cn } from "@/lib/utils";
import { AlertCircle, Plus, Trash2 } from "lucide-react";

// ── Capitaliza cada palabra ───────────────────────────────────────────────────
function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

// ── Constantes de estilo ──────────────────────────────────────────────────────
const CARD_BG = "color-mix(in srgb, var(--card) 55%, transparent)";
const ACCENT  = "var(--accent-hex)";

// ── Subcomponentes ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border" style={{ backgroundColor: CARD_BG }}>
      <div className="px-5 py-3 border-b rounded-t-xl"
        style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, children, error, hint, full }: {
  label: string; children: React.ReactNode; error?: string; hint?: string; full?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", full && "col-span-2")}>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">{label}</label>
      {children}
      {hint  && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const INPUT_CLS = "w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

// ── Schema ────────────────────────────────────────────────────────────────────

const DireccionSchema = z.object({
  id:         z.string().optional(),
  etiqueta:   z.string().min(1, "Etiqueta requerida"),
  direccion:  z.string().min(1, "Dirección requerida"),
  sector:     z.string().optional(),
  ciudad:     z.string().default("Santo Domingo"),
  provincia:  z.string().optional(),
  referencia: z.string().optional(),
  esPrincipal: z.boolean().default(false),
});

const FormSchema = z.object({
  tipo:              z.enum(["CLIENTE", "SUPLIDOR", "AMBOS"]),
  nombre:            z.string().min(1, "Nombre requerido"),
  nombreLegal:       z.string().optional(),
  rnc:               z.string().optional(),
  tipoComprobante:   z.enum(["B01", "B02", "B14", "B15"]),
  email:             z.string().optional(),
  telefono:          z.string().optional(),
  telefonoAlt:       z.string().optional(),
  credito:           z.enum(["CONTADO", "DIAS_10", "DIAS_15", "DIAS_30", "DIAS_45", "DIAS_60", "DIAS_90"]),
  limiteCredito:     z.coerce.number().optional(),
  descuentoFijo:     z.coerce.number().min(0).max(100).optional(),
  esEmisorElectronico: z.boolean().default(false),
  notas:             z.string().optional(),
  activo:            z.boolean().default(true),
  direcciones:       z.array(DireccionSchema).default([]),
});

type FormValues = z.infer<typeof FormSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface ContactoFormProps {
  contactoId?:    string;
  defaultValues?: Partial<FormValues>;
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ContactoForm({ contactoId, defaultValues }: ContactoFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const esEdicion = !!contactoId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as any,
    defaultValues: {
      tipo: "CLIENTE",
      tipoComprobante: "B02",
      credito: "CONTADO",
      esEmisorElectronico: false,
      activo: true,
      direcciones: [],
      ...defaultValues,
    },
  });

  const { fields: direcciones, append, remove } = useFieldArray({
    control: form.control,
    name: "direcciones",
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setServerError(null);
    const result = esEdicion
      ? await actualizarContacto(contactoId, values as ContactoInput)
      : await crearContacto(values as ContactoInput);

    if ("error" in result && result.error) {
      const errors = result.error as Record<string, string[]>;
      setServerError(Object.values(errors).flat()[0] ?? "Error al guardar");
      return;
    }

    const id = "id" in result ? result.id : contactoId;
    router.push(`/contactos/${id}`);
  };

  const { errors, isSubmitting } = form.formState;
  const tipo    = form.watch("tipo");
  const credito = form.watch("credito");

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-5 max-w-4xl pb-24">

      {/* Error servidor */}
      {serverError && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* ── Sección 1: Información general ── */}
      <Section title="Información general">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <Field label="Tipo *">
            <Select value={form.watch("tipo")} onValueChange={v => form.setValue("tipo", v as FormValues["tipo"])}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CLIENTE">Cliente</SelectItem>
                <SelectItem value="SUPLIDOR">Suplidor</SelectItem>
                <SelectItem value="AMBOS">Cliente y Suplidor</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tipo de comprobante">
            <Select value={form.watch("tipoComprobante")} onValueChange={v => form.setValue("tipoComprobante", v as FormValues["tipoComprobante"])}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="B01">B01 — Crédito Fiscal</SelectItem>
                <SelectItem value="B02">B02 — Consumidor Final</SelectItem>
                <SelectItem value="B14">B14 — Regímenes Especiales</SelectItem>
                <SelectItem value="B15">B15 — Gubernamentales</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Nombre comercial / Persona *" error={errors.nombre?.message} full>
            <input className={INPUT_CLS} placeholder="Distribuidora López, S.R.L."
              {...form.register("nombre")}
              onBlur={e => form.setValue("nombre", toTitleCase(e.target.value))} />
          </Field>

          <Field label="Nombre legal (si difiere)" full>
            <input className={INPUT_CLS} placeholder="Razón social completa"
              {...form.register("nombreLegal")}
              onBlur={e => form.setValue("nombreLegal", toTitleCase(e.target.value))} />
          </Field>

          <Field label="RNC / Cédula">
            <input className={INPUT_CLS} placeholder="101-12345-6" {...form.register("rnc")} />
          </Field>

          <Field label="Teléfono principal">
            <input className={INPUT_CLS} placeholder="809-555-0000" {...form.register("telefono")} />
          </Field>

          <Field label="Teléfono alternativo">
            <input className={INPUT_CLS} placeholder="829-555-0000" {...form.register("telefonoAlt")} />
          </Field>

          <Field label="Email">
            <input className={INPUT_CLS} type="email" placeholder="contacto@empresa.com" {...form.register("email")} />
          </Field>

          <Field label="Notas internas" full>
            <textarea className={INPUT_CLS + " resize-none h-16"} placeholder="Observaciones, condiciones especiales..." {...form.register("notas")} />
          </Field>

        </div>
      </Section>

      {/* ── Sección 2: Crédito ── */}
      <Section title={tipo === "SUPLIDOR" ? "Condiciones de compra / crédito suplidor" : "Condiciones de crédito"}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <Field label="Plazo de crédito">
            <Select value={credito} onValueChange={v => form.setValue("credito", v as FormValues["credito"])}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTADO">Contado</SelectItem>
                <SelectItem value="DIAS_10">10 días</SelectItem>
                <SelectItem value="DIAS_15">15 días</SelectItem>
                <SelectItem value="DIAS_30">30 días</SelectItem>
                <SelectItem value="DIAS_45">45 días</SelectItem>
                <SelectItem value="DIAS_60">60 días</SelectItem>
                <SelectItem value="DIAS_90">90 días</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {credito !== "CONTADO" && (
            <Field label={tipo === "SUPLIDOR" ? "Línea de crédito con suplidor (RD$)" : "Límite de crédito (RD$)"}>
              <input className={INPUT_CLS + " text-right font-mono"} type="number" step="0.01" placeholder="50,000.00" {...form.register("limiteCredito")} />
            </Field>
          )}

          <Field label="Descuento fijo (%)" hint="Aplica automáticamente en ventas">
            <input className={INPUT_CLS + " text-right font-mono"} type="number" step="0.01" min="0" max="100" placeholder="0.00" {...form.register("descuentoFijo")} />
          </Field>

          {/* Facturación electrónica — solo suplidores */}
          {(tipo === "SUPLIDOR" || tipo === "AMBOS") && (
            <div className="sm:col-span-3 flex items-start gap-3 pt-1">
              <input type="checkbox" id="esEmisorElectronico" {...form.register("esEmisorElectronico")}
                className="mt-0.5 h-4 w-4 rounded border" />
              <div>
                <label htmlFor="esEmisorElectronico" className="text-sm font-medium cursor-pointer">
                  Este suplidor emite facturas electrónicas (E31)
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Marca esto si el suplidor usa NCF electrónico (E31) en lugar de los físicos B01-B15
                </p>
              </div>
            </div>
          )}

        </div>
      </Section>

      {/* ── Sección 3: Direcciones ── */}
      <Section title="Direcciones de entrega">
        <div className="space-y-4">

          {/* Botón agregar */}
          <div className="flex justify-end">
            <button type="button"
              onClick={() => append({ etiqueta: "", direccion: "", sector: "", ciudad: "Santo Domingo", provincia: "", referencia: "", esPrincipal: direcciones.length === 0 })}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-muted/40 transition-colors">
              <Plus size={13} /> Agregar dirección
            </button>
          </div>

          {direcciones.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sin direcciones registradas. Agrega al menos una.
            </p>
          )}

          {direcciones.map((field, index) => (
            <div key={field.id} className="rounded-xl border p-4 space-y-3"
              style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}>

              <div className="flex items-center justify-between">
                <Badge variant={index === 0 ? "default" : "outline"} className="text-xs">
                  {index === 0 ? "Principal" : `Dirección ${index + 1}`}
                </Badge>
                <button type="button" onClick={() => remove(index)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Etiqueta *" error={errors.direcciones?.[index]?.etiqueta?.message}>
                  <input className={INPUT_CLS} placeholder="Almacén Principal, Sucursal Norte…"
                    {...form.register(`direcciones.${index}.etiqueta`)} />
                </Field>
                <Field label="Ciudad">
                  <input className={INPUT_CLS} placeholder="Santo Domingo"
                    {...form.register(`direcciones.${index}.ciudad`)} />
                </Field>
                <Field label="Dirección *" error={errors.direcciones?.[index]?.direccion?.message} full>
                  <input className={INPUT_CLS} placeholder="Calle, número, edificio…"
                    {...form.register(`direcciones.${index}.direccion`)} />
                </Field>
                <Field label="Sector">
                  <input className={INPUT_CLS} placeholder="Piantini, Naco…"
                    {...form.register(`direcciones.${index}.sector`)} />
                </Field>
                <Field label="Provincia">
                  <input className={INPUT_CLS} placeholder="Distrito Nacional"
                    {...form.register(`direcciones.${index}.provincia`)} />
                </Field>
                <Field label="Referencia" full>
                  <input className={INPUT_CLS} placeholder="Frente al colmado, 2da planta…"
                    {...form.register(`direcciones.${index}.referencia`)} />
                </Field>
              </div>

            </div>
          ))}
        </div>
      </Section>

      {/* ── Barra de acciones — derecha ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()}
          className="h-9 px-5 rounded-lg border text-sm font-medium hover:bg-muted/40 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting}
          className={cn("h-9 px-6 rounded-lg text-sm font-bold text-white transition-all", isSubmitting && "opacity-60 pointer-events-none")}
          style={{ backgroundColor: ACCENT }}>
          {isSubmitting ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear contacto"}
        </button>
      </div>

    </form>
  );
}
