"use client";

import { useState, useTransition, forwardRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { actualizarProducto, type ProductoInput } from "@/actions/productos";
import { Save, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const FormSchema = z.object({
  codigo:            z.string().min(1),
  codigoBarras:      z.string().optional(),
  nombre:            z.string().min(1, "Nombre requerido"),
  descripcion:       z.string().optional(),
  categoriaId:       z.string().min(1, "Categoría requerida"),
  unidadMedida:      z.string().min(1),
  esFraccionable:    z.boolean().default(false),
  unidadFraccion:    z.string().optional(),
  factorFraccion:    z.coerce.number().positive().optional(),
  precioFraccion:    z.coerce.number().min(0).optional(),
  exentoItbis:       z.boolean().default(false),
  costoUltimo:       z.coerce.number().min(0).default(0),
  porcentajeGanancia:z.coerce.number().min(0).default(30),
  precioVenta:       z.coerce.number().min(0),
  precioMayoreo:     z.coerce.number().min(0).optional(),
  stockActual:       z.coerce.number().default(0),
  stockMinimo:       z.coerce.number().min(0).default(0),
  stockMaximo:       z.coerce.number().min(0).optional(),
  activo:            z.boolean().default(true),
});

type FormValues = z.infer<typeof FormSchema>;
type Categoria   = { id: string; nombre: string; codigo: string };

const UNIDADES = ["UND","M","M2","M3","KG","LB","GLL","LT","PIE","ROLLO","CAJA","PAR","JGO","FND"];

const TABS = [
  { key: "general",    label: "General"    },
  { key: "precios",    label: "Precios"    },
  { key: "inventario", label: "Inventario" },
  { key: "opciones",   label: "Opciones"   },
] as const;
type TabKey = typeof TABS[number]["key"];

interface Props {
  productoId:    string;
  categorias:    Categoria[];
  defaultValues: Partial<FormValues>;
  soloLectura?:  boolean;
}

export function ProductoDetailForm({ productoId, categorias, defaultValues, soloLectura = false }: Props) {
  const [tab, setTab]           = useState<TabKey>("general");
  const [isPending, start]      = useTransition();
  const [savedOk, setSavedOk]   = useState(false);
  const [serverError, setError] = useState<string | null>(null);

  // costoUltimo en BD = NETO (sin ITBIS).
  // La UI muestra los dos campos: "Costo sin ITBIS" y "ITBIS (18%)" — informativos.
  // Al guardar solo se persiste el neto; el precio de venta se calcula sobre el bruto.
  const costoNetoInicial = Number(defaultValues.costoUltimo ?? 0);
  const exentoInicial    = defaultValues.exentoItbis ?? false;
  const [costoNeto,   setCostoNeto]   = useState<number>(costoNetoInicial);
  const [itbisMonto,  setItbisMonto]  = useState<number>(
    exentoInicial ? 0 : parseFloat((costoNetoInicial * 0.18).toFixed(2))
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as any,
    defaultValues: {
      unidadMedida: "UND", esFraccionable: false, exentoItbis: false,
      costoUltimo: 0, porcentajeGanancia: 30, precioVenta: 0,
      stockActual: 0, stockMinimo: 0, activo: true,
      ...defaultValues,
    },
  });

  const { errors, isDirty } = form.formState;
  const costo    = form.watch("costoUltimo")        ?? 0;  // neto
  const ganancia = form.watch("porcentajeGanancia") ?? 30;
  const fraccion = form.watch("esFraccionable");
  // Precio sugerido = costo BRUTO (neto + itbis) × (1 + %ganancia)
  const costoBruto = costoNeto + itbisMonto;
  const precioSugerido = costoBruto > 0 ? (costoBruto * (1 + ganancia / 100)).toFixed(2) : null;
  void costo; // costoUltimo se sigue registrando en el form aunque no se use aquí para el sugerido

  // Sincroniza precio de venta con el sugerido automáticamente
  function syncPrecioVenta(costoTotal: number, pct: number) {
    if (costoTotal <= 0) return;
    const sugerido = parseFloat((costoTotal * (1 + pct / 100)).toFixed(2));
    form.setValue("precioVenta", sugerido, { shouldDirty: true });
  }

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    setError(null); setSavedOk(false);
    start(async () => {
      const res = await actualizarProducto(productoId, values as ProductoInput);
      if ("error" in res && res.error) {
        const errs = res.error as Record<string, string[]>;
        setError(Object.values(errs).flat()[0] ?? "Error al guardar");
        return;
      }
      setSavedOk(true);
      form.reset(values);
      setTimeout(() => setSavedOk(false), 3000);
    });
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <form onSubmit={soloLectura ? (e) => e.preventDefault() : form.handleSubmit(onSubmit as any)} className="space-y-4">

      {/* ── Aviso solo lectura ── */}
      {soloLectura && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium"
          style={{
            backgroundColor: "color-mix(in oklch, #ca8a04 8%, var(--card))",
            borderColor: "color-mix(in oklch, #ca8a04 30%, var(--border))",
            color: "#ca8a04",
          }}
        >
          🔒 Solo lectura — no tienes permiso para modificar productos
        </div>
      )}

      {/* ── Barra sticky de guardado ── */}
      {!soloLectura && <div
        className={cn(
          "sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border transition-all",
          isDirty ? "shadow-md" : "opacity-55",
        )}
        style={{
          backgroundColor: "color-mix(in oklch, var(--foreground) 9%, var(--card))",
          borderColor: isDirty
            ? "color-mix(in oklch, var(--accent-hex) 40%, var(--border))"
            : "var(--border)",
        }}
      >
        <span className="text-xs text-muted-foreground">
          {savedOk ? "✓ Cambios guardados" : isDirty ? "Cambios sin guardar" : "Sin cambios pendientes"}
        </span>
        <div className="flex items-center gap-2">
          {serverError && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle size={12} />{serverError}
            </span>
          )}
          {savedOk && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              <CheckCircle2 size={12} />Guardado
            </span>
          )}
          <button
            type="submit"
            disabled={isPending || !isDirty}
            className={cn(
              "flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-bold transition-all",
              isDirty && !isPending
                ? "text-white"
                : "opacity-50 cursor-not-allowed text-muted-foreground",
            )}
            style={isDirty && !isPending
              ? { backgroundColor: "var(--accent-hex)" }
              : { backgroundColor: "var(--muted)" }
            }
          >
            <Save size={13} />
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>}

      {/* ── Tabs + contenido — fieldset bloquea todos los inputs cuando soloLectura ── */}
      <fieldset disabled={soloLectura} className="contents">

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl"
        style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 6%, var(--card))" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === t.key
                ? "text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            style={tab === t.key ? { backgroundColor: "var(--accent-hex)" } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Contenido del tab ── */}
      <div className="rounded-xl border p-5 space-y-5 min-h-[260px]"
        style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>

        {/* GENERAL */}
        {tab === "general" && (
          <div className="space-y-4">
            {/* Nombre — campo prominente */}
            <div className="space-y-1">
              <label className={LABEL}>Nombre del producto</label>
              <input
                className="w-full h-11 rounded-lg border bg-background px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                {...form.register("nombre")}
              />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={LABEL}>Código interno</label>
                <input className={INPUT} {...form.register("codigo")} />
              </div>
              <div className="space-y-1">
                <label className={LABEL}>Código de barras</label>
                <input className={INPUT} placeholder="—" {...form.register("codigoBarras")} />
              </div>
              <div className="space-y-1">
                <label className={LABEL}>Categoría</label>
                <select className={INPUT} {...form.register("categoriaId")}>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                  ))}
                </select>
                {errors.categoriaId && <p className="text-xs text-destructive">{errors.categoriaId.message}</p>}
              </div>
              <div className="space-y-1">
                <label className={LABEL}>Unidad de medida</label>
                <select className={INPUT} {...form.register("unidadMedida")}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className={LABEL}>Descripción</label>
              <textarea
                className={INPUT + " resize-none h-20"}
                placeholder="Especificaciones técnicas, presentación…"
                {...form.register("descripcion")}
              />
            </div>
          </div>
        )}

        {/* PRECIOS */}
        {tab === "precios" && (
          <div className="space-y-4">

            {/* Fila superior: Costo+ITBIS | Ganancia+Exento */}
            <div className="grid grid-cols-2 gap-4">

              {/* Columna izquierda: Costo sin ITBIS + ITBIS monto */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className={LABEL}>Costo sin ITBIS</label>
                  <div className="relative">
                    <span className={PREFIX}>RD$</span>
                    <input
                      className={INPUT_PREFIXED + " text-right font-mono"}
                      type="number" step="0.01" min="0"
                      value={costoNeto}
                      onChange={e => {
                        const neto  = parseFloat(Number(e.target.value).toFixed(2)) || 0;
                        const itbis = parseFloat((neto * 0.18).toFixed(2));
                        const bruto = parseFloat((neto + itbis).toFixed(2));
                        setCostoNeto(neto);
                        setItbisMonto(itbis);
                        // costoUltimo siempre se guarda SIN ITBIS (neto)
                        form.setValue("costoUltimo", neto, { shouldDirty: true });
                        // Precio de venta se calcula sobre el costo BRUTO
                        syncPrecioVenta(bruto, ganancia);
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className={LABEL}>ITBIS <span className="font-normal normal-case text-muted-foreground">(18%)</span></label>
                  <div className="relative">
                    <span className={PREFIX}>RD$</span>
                    <input
                      className={INPUT_PREFIXED + " text-right font-mono"}
                      type="number" step="0.01" min="0"
                      value={itbisMonto}
                      onChange={e => {
                        const itbis = parseFloat(Number(e.target.value).toFixed(2)) || 0;
                        const bruto = parseFloat((costoNeto + itbis).toFixed(2));
                        setItbisMonto(itbis);
                        // costoUltimo siempre SIN ITBIS
                        form.setValue("costoUltimo", costoNeto, { shouldDirty: true });
                        syncPrecioVenta(bruto, ganancia);
                      }}
                    />
                  </div>
                  {/* Costo total resultante */}
                  <p className="text-[10px] text-muted-foreground text-right pr-1">
                    Costo total: <span className="font-semibold text-foreground">RD$ {(costoNeto + itbisMonto).toFixed(2)}</span>
                  </p>
                </div>
              </div>

              {/* Columna derecha: % Ganancia + Exento ITBIS */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className={LABEL}>Ganancia</label>
                  <div className="relative">
                    <input
                      className={INPUT + " font-mono text-right pr-8"}
                      type="number" step="0.01" min="0"
                      {...form.register("porcentajeGanancia", {
                        onChange: e => {
                          const pct = parseFloat(Number(e.target.value).toFixed(2)) || 0;
                          syncPrecioVenta(costo, pct);
                        }
                      })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">%</span>
                  </div>
                  {precioSugerido && (
                    <p className="text-[10px] text-muted-foreground text-right pr-1">
                      Sugerido: <span className="font-semibold text-foreground">RD$ {Number(precioSugerido).toFixed(2)}</span>
                    </p>
                  )}
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border p-3 hover:bg-muted/20 transition-colors"
                  style={{ borderColor: "var(--border)" }}>
                  <input type="checkbox" className="rounded mt-0.5 shrink-0" {...form.register("exentoItbis")} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exento de ITBIS</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">El producto no genera ITBIS al vender</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Precio de venta — barra completa prominente */}
            <div className="rounded-xl p-4 border space-y-1.5"
              style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 8%, var(--card))", borderColor: "color-mix(in oklch, var(--accent-hex) 30%, var(--border))" }}>
              <label className={LABEL} style={{ color: "var(--accent-hex)" }}>Precio de venta</label>
              <div className="relative">
                <span className={PREFIX} style={{ color: "var(--accent-hex)", opacity: 0.7 }}>RD$</span>
                <input
                  className={INPUT_PREFIXED + " text-right font-mono text-xl font-bold h-11"}
                  type="number" step="0.01" min="0"
                  {...form.register("precioVenta", { setValueAs: v => parseFloat(Number(v).toFixed(2)) })}
                />
              </div>
              {errors.precioVenta && <p className="text-xs text-destructive">{errors.precioVenta.message}</p>}
            </div>

            {/* Precio mayoreo */}
            <div className="space-y-1">
              <label className={LABEL}>Precio al por mayor <span className="font-normal normal-case text-muted-foreground">(opcional)</span></label>
              <div className="relative">
                <span className={PREFIX}>RD$</span>
                <input
                  className={INPUT_PREFIXED + " text-right font-mono"}
                  type="number" step="0.01" min="0"
                  {...form.register("precioMayoreo", { setValueAs: v => v === "" || v == null ? undefined : parseFloat(Number(v).toFixed(2)) })}
                />
              </div>
            </div>
          </div>
        )}

        {/* INVENTARIO */}
        {tab === "inventario" && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className={LABEL}>Stock actual</label>
                <input className={INPUT + " font-mono text-right"} type="number" step="0.0001" min="0" {...form.register("stockActual")} />
                <p className="text-[10px] text-amber-500">Genera ajuste de inventario</p>
              </div>
              <div className="space-y-1">
                <label className={LABEL}>Mínimo (alerta)</label>
                <input className={INPUT + " font-mono text-right"} type="number" step="0.0001" min="0" {...form.register("stockMinimo")} />
              </div>
              <div className="space-y-1">
                <label className={LABEL}>Máximo</label>
                <input className={INPUT + " font-mono text-right"} type="number" step="0.0001" min="0" placeholder="—" {...form.register("stockMaximo")} />
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" {...form.register("esFraccionable")} />
                <span className="text-sm font-medium">Este producto se vende fraccionado</span>
              </label>
              {fraccion && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="space-y-1">
                    <label className={LABEL}>Unidad de fracción</label>
                    <input className={INPUT} placeholder="PIE, CM, ML…" {...form.register("unidadFraccion")} />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL}>Factor de conversión</label>
                    <input className={INPUT + " font-mono text-right"} type="number" step="0.0001" placeholder="100" {...form.register("factorFraccion")} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className={LABEL}>Precio de venta por fracción (RD$) <span className="text-muted-foreground font-normal normal-case tracking-normal">— opcional, sobreescribe el auto-calculado</span></label>
                    <input className={INPUT + " font-mono text-right"} type="number" step="0.01" min="0" placeholder="Auto-calculado si se deja vacío" {...form.register("precioFraccion")} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* OPCIONES */}
        {tab === "opciones" && (
          <div className="space-y-4 py-2">
            <Toggle
              label="Producto activo"
              description="Visible en el catálogo y en el PDV"
              {...form.register("activo")}
            />
          </div>
        )}

      </div>
      </fieldset>
    </form>
  );
}

// ── Auxiliares ──

const INPUT         = "w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const INPUT_PREFIXED = "w-full h-9 rounded-lg border bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const PREFIX        = "absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none pointer-events-none";
const LABEL         = "text-xs font-semibold text-muted-foreground uppercase tracking-wide block";

const Toggle = forwardRef<HTMLInputElement, {
  label: string;
  description: string;
  name: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
}>(({ label, description, ...props }, ref) => (
  <label className="flex items-start gap-3 cursor-pointer group rounded-xl p-3 hover:bg-muted/30 transition-colors border border-transparent hover:border-border">
    <input type="checkbox" ref={ref} {...props} className="rounded mt-0.5 shrink-0" />
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
  </label>
));
Toggle.displayName = "Toggle";
