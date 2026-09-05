"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  crearProducto,
  actualizarProducto,
  siguienteCodigoPorCategoria,
  detectarProductosDuplicados,
  type ProductoInput,
} from "@/actions/productos";
import { cn } from "@/lib/utils";

// ── Estilos compartidos (mismo lenguaje que producto-detail-form) ──────────────
const INPUT          = "w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const INPUT_PREFIXED = "w-full h-9 rounded-lg border bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const PREFIX         = "absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none pointer-events-none";
const LABEL          = "text-xs font-semibold text-muted-foreground uppercase tracking-wide block";
const SECTION        = "rounded-xl border p-5 space-y-4";

// ── Schema ─────────────────────────────────────────────────────────────────────
const FormSchema = z.object({
  codigo:             z.string().min(1, "Código requerido"),
  codigoBarras:       z.string().optional(),
  nombre:             z.string().min(1, "Nombre requerido"),
  descripcion:        z.string().optional(),
  categoriaId:        z.string().min(1, "Categoría requerida"),
  unidadMedida:       z.string().min(1, "Unidad requerida"),
  esFraccionable:     z.boolean().default(false),
  unidadFraccion:     z.string().optional(),
  factorFraccion:     z.coerce.number().positive().optional(),
  exentoItbis:        z.boolean().default(false),
  costoUltimo:        z.coerce.number().min(0).default(0),
  porcentajeGanancia: z.coerce.number().min(0).default(0),
  precioVenta:        z.coerce.number().min(0),
  precioMayoreo:      z.coerce.number().min(0).optional(),
  stockActual:        z.coerce.number().default(0),
  stockMinimo:        z.coerce.number().min(0).default(0),
  stockMaximo:        z.coerce.number().min(0).optional(),
  esServicio:         z.boolean().default(false),
  activo:             z.boolean().default(true),
});

type FormValues = z.infer<typeof FormSchema>;
type Categoria   = { id: string; nombre: string; codigo: string };

interface ProductoFormProps {
  productoId?:    string;
  categorias:     Categoria[];
  defaultValues?: Partial<FormValues>;
  nextCodigo?:    string;
}

const UNIDADES = ["UND","M","M2","M3","KG","LB","GLL","LT","PIE","ROLLO","CAJA","PAR","JGO","FND"];

// ── Componente ─────────────────────────────────────────────────────────────────
export function ProductoForm({ productoId, categorias, defaultValues, nextCodigo }: ProductoFormProps) {
  const router    = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const errorRef  = useRef<HTMLDivElement>(null);
  const esEdicion = !!productoId;
  const [duplicados, setDuplicados] = useState<{ id: string; nombre: string; codigo: string; activo: boolean }[]>([]);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estado local del desglose de costo (igual que el formulario de edición)
  const costoNetoInicial = Number(defaultValues?.costoUltimo ?? 0);
  const exentoInicial    = defaultValues?.exentoItbis ?? false;
  const [costoNeto,  setCostoNeto]  = useState<number>(costoNetoInicial);
  const [itbisMonto, setItbisMonto] = useState<number>(
    exentoInicial ? 0 : parseFloat((costoNetoInicial * 0.18).toFixed(2))
  );

  // Dirección del auto-cálculo de precios
  const lastField = useRef<"ganancia" | "precio">("ganancia");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as any,
    defaultValues: {
      codigo:             nextCodigo ?? "",
      unidadMedida:       "UND",
      esFraccionable:     false,
      exentoItbis:        false,
      esServicio:         false,
      costoUltimo:        0,
      porcentajeGanancia: 0,
      precioVenta:        0,
      stockActual:        0,
      stockMinimo:        0,
      activo:             true,
      ...defaultValues,
    },
  });

  const { errors, isSubmitting } = form.formState;
  const ganancia   = form.watch("porcentajeGanancia") ?? 0;
  const precioVal  = form.watch("precioVenta")        ?? 0;
  const fraccion   = form.watch("esFraccionable");
  const exento     = form.watch("exentoItbis");

  const costoBruto = parseFloat((costoNeto + itbisMonto).toFixed(2));

  // Recalcular precio de venta a partir del costo bruto y la ganancia
  function syncPrecioVenta(bruto: number, pct: number) {
    if (bruto <= 0) return;
    const sugerido = parseFloat((bruto * (1 + pct / 100)).toFixed(2));
    form.setValue("precioVenta", sugerido);
  }

  // Auto-calcular ganancia cuando cambia precio (y viceversa)
  useEffect(() => {
    if (esEdicion || costoBruto <= 0) return;
    if (lastField.current === "precio" && precioVal > 0) {
      const nueva = Math.round(((precioVal / costoBruto) - 1) * 10000) / 100;
      if (Math.abs(nueva - ganancia) > 0.005) form.setValue("porcentajeGanancia", nueva);
    } else {
      const nuevo = parseFloat((costoBruto * (1 + ganancia / 100)).toFixed(2));
      if (Math.abs(nuevo - precioVal) > 0.005) form.setValue("precioVenta", nuevo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costoBruto, ganancia, precioVal]);

  // Cuando se marca exento de ITBIS → poner ITBIS en 0
  useEffect(() => {
    if (exento) {
      setItbisMonto(0);
      syncPrecioVenta(costoNeto, ganancia);
    } else {
      const itbis = parseFloat((costoNeto * 0.18).toFixed(2));
      setItbisMonto(itbis);
      syncPrecioVenta(costoNeto + itbis, ganancia);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exento]);

  // Auto-generar código al seleccionar categoría (solo creación)
  const handleCategoriaChange = async (categoriaId: string) => {
    form.setValue("categoriaId", categoriaId);
    if (!esEdicion && categoriaId) {
      const codigo = await siguienteCodigoPorCategoria(categoriaId);
      form.setValue("codigo", codigo);
    }
  };

  // Detectar nombres duplicados (debounce 500ms)
  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.trim().length < 3) { setDuplicados([]); return; }
    timerRef.current = setTimeout(async () => {
      const res = await detectarProductosDuplicados(val, productoId);
      setDuplicados(res);
    }, 500);
  };

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setServerError(null);
    try {
      const result = esEdicion
        ? await actualizarProducto(productoId, values as ProductoInput)
        : await crearProducto(values as ProductoInput);

      if ("error" in result && result.error) {
        const errs = result.error as Record<string, string[]>;
        setServerError(Object.values(errs).flat()[0] ?? "Error al guardar");
        setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
        return;
      }

      const id = "id" in result ? result.id : productoId;
      router.push(`/productos/${id}`);
    } catch (err) {
      console.error("[ProductoForm] onSubmit error:", err);
      setServerError("Error al conectar con el servidor. Intenta de nuevo.");
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-5 max-w-4xl">

      {serverError && (
        <div ref={errorRef} className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive font-medium">
          ⚠️ {serverError}
        </div>
      )}

      {/* ── Identificación ─────────────────────────────────────────────────── */}
      <div className={SECTION} style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
        <p className={LABEL} style={{ color: "var(--accent-hex)" }}>Identificación</p>

        <div className="space-y-1">
          <label className={LABEL}>Nombre del producto *</label>
          <input
            className="w-full h-11 rounded-lg border bg-background px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Cable #12 THHN Negro"
            {...form.register("nombre", { onChange: handleNombreChange })}
          />
          {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          {duplicados.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 space-y-1 mt-1">
              <p className="font-semibold">⚠️ Posible duplicado — ya existe un producto similar:</p>
              {duplicados.map(d => (
                <div key={d.id} className="flex items-center gap-2">
                  <span className="font-mono text-[10px] bg-amber-100 dark:bg-amber-900 px-1 rounded">{d.codigo}</span>
                  <span>{d.nombre}</span>
                  {!d.activo && <span className="text-[10px] text-muted-foreground">(archivado)</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={LABEL}>Código interno *</label>
            <input className={INPUT} placeholder="PROD-00001" {...form.register("codigo")} />
            {errors.codigo && <p className="text-xs text-destructive">{errors.codigo.message}</p>}
          </div>
          <div className="space-y-1">
            <label className={LABEL}>Código de barras</label>
            <input className={INPUT} placeholder="7896543210123" {...form.register("codigoBarras")} />
          </div>
          <div className="space-y-1">
            <label className={LABEL}>Categoría *</label>
            <Select
              value={(form.watch("categoriaId") as string | undefined) ?? ""}
              onValueChange={(v) => handleCategoriaChange((v ?? "") as string)}
            >
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="font-mono text-xs mr-2 text-muted-foreground">{c.codigo}</span>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoriaId && <p className="text-xs text-destructive">{errors.categoriaId.message}</p>}
          </div>
          <div className="space-y-1">
            <label className={LABEL}>Unidad de medida *</label>
            <Select
              value={(form.watch("unidadMedida") as string | undefined) ?? "UND"}
              onValueChange={(v) => form.setValue("unidadMedida", (v ?? "UND") as string)}
            >
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIDADES.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <label className={LABEL}>Descripción</label>
          <textarea
            className={INPUT + " resize-none h-20 py-2"}
            placeholder="Especificaciones técnicas, presentación..."
            {...form.register("descripcion")}
          />
        </div>
      </div>

      {/* ── Precios ─────────────────────────────────────────────────────────── */}
      <div className={SECTION} style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
        <p className={LABEL} style={{ color: "var(--accent-hex)" }}>Precios</p>

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
                    const itbis = exento ? 0 : parseFloat((neto * 0.18).toFixed(2));
                    const bruto = parseFloat((neto + itbis).toFixed(2));
                    setCostoNeto(neto);
                    setItbisMonto(itbis);
                    form.setValue("costoUltimo", neto);
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
                  className={INPUT_PREFIXED + " text-right font-mono" + (exento ? " opacity-40 cursor-not-allowed" : "")}
                  type="number" step="0.01" min="0"
                  value={itbisMonto}
                  readOnly={exento}
                  onChange={e => {
                    const itbis = parseFloat(Number(e.target.value).toFixed(2)) || 0;
                    const bruto = parseFloat((costoNeto + itbis).toFixed(2));
                    setItbisMonto(itbis);
                    form.setValue("costoUltimo", costoNeto);
                    syncPrecioVenta(bruto, ganancia);
                  }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-right pr-1">
                Costo total: <span className="font-semibold text-foreground">RD$ {costoBruto.toFixed(2)}</span>
              </p>
            </div>
          </div>

          {/* Columna derecha: % Ganancia + Exento ITBIS */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className={LABEL}>% Ganancia</label>
              <div className="relative">
                <input
                  className={INPUT + " font-mono text-right pr-8"}
                  type="number" step="0.01" min="0"
                  {...form.register("porcentajeGanancia", {
                    onChange: () => { lastField.current = "ganancia"; },
                  })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">%</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-right pr-1">
                Se calcula automáticamente al ingresar el precio de venta.
              </p>
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

        {/* Precio de venta — prominente */}
        <div className="rounded-xl p-4 border space-y-1.5"
          style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 8%, var(--card))", borderColor: "color-mix(in oklch, var(--accent-hex) 30%, var(--border))" }}>
          <label className={LABEL} style={{ color: "var(--accent-hex)" }}>Precio de venta *</label>
          <div className="relative">
            <span className={PREFIX} style={{ color: "var(--accent-hex)", opacity: 0.7 }}>RD$</span>
            <input
              className={INPUT_PREFIXED + " text-right font-mono text-xl font-bold h-11"}
              style={{ color: "var(--accent-hex)" }}
              type="number" step="0.01" min="0"
              {...form.register("precioVenta", {
                onChange: () => { lastField.current = "precio"; },
                setValueAs: v => parseFloat(Number(v).toFixed(2)),
              })}
            />
          </div>
          {errors.precioVenta && <p className="text-xs text-destructive">{errors.precioVenta.message}</p>}
        </div>

        {/* Precio al por mayor */}
        <div className="space-y-1">
          <label className={LABEL}>Precio al por mayor <span className="font-normal normal-case text-muted-foreground">(opcional)</span></label>
          <div className="relative">
            <span className={PREFIX}>RD$</span>
            <input
              className={INPUT_PREFIXED + " text-right font-mono"}
              type="number" step="0.01" min="0"
              {...form.register("precioMayoreo", {
                setValueAs: v => v === "" || v == null ? undefined : parseFloat(Number(v).toFixed(2)),
              })}
            />
          </div>
        </div>
      </div>

      {/* ── Control de inventario ───────────────────────────────────────────── */}
      <div className={SECTION} style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
        <p className={LABEL} style={{ color: "var(--accent-hex)" }}>Control de inventario</p>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className={LABEL}>
              Stock actual
              {esEdicion && <Badge variant="outline" className="ml-2 text-[10px]">Genera ajuste</Badge>}
            </label>
            <input className={INPUT + " font-mono text-right"} type="number" step="0.0001" min="0" placeholder="0" {...form.register("stockActual")} />
          </div>
          <div className="space-y-1">
            <label className={LABEL}>Mínimo <span className="font-normal normal-case text-muted-foreground">(alerta)</span></label>
            <input className={INPUT + " font-mono text-right"} type="number" step="0.0001" min="0" placeholder="0" {...form.register("stockMinimo")} />
          </div>
          <div className="space-y-1">
            <label className={LABEL}>Máximo</label>
            <input className={INPUT + " font-mono text-right"} type="number" step="0.0001" min="0" placeholder="—" {...form.register("stockMaximo")} />
          </div>
        </div>
      </div>

      {/* ── Opciones ────────────────────────────────────────────────────────── */}
      <div className={SECTION} style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
        <p className={LABEL} style={{ color: "var(--accent-hex)" }}>Opciones</p>

        {/* Fraccionamiento */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...form.register("esFraccionable")} className="rounded" />
          <span className="text-sm font-medium">Este producto se vende fraccionado</span>
        </label>
        {fraccion && (
          <div className="grid grid-cols-2 gap-4 pl-6 pt-1">
            <div className="space-y-1">
              <label className={LABEL}>Unidad de fracción</label>
              <input className={INPUT} placeholder="PIE, CM, ML…" {...form.register("unidadFraccion")} />
              <p className="text-[10px] text-muted-foreground">Ej: si la unidad es ROLLO, la fracción sería PIE</p>
            </div>
            <div className="space-y-1">
              <label className={LABEL}>Factor de conversión</label>
              <input className={INPUT + " font-mono text-right"} type="number" step="0.0001" placeholder="100" {...form.register("factorFraccion")} />
              <p className="text-[10px] text-muted-foreground">Cuántas fracciones hay por unidad</p>
            </div>
          </div>
        )}

        {/* Servicio */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...form.register("esServicio")} className="rounded" />
          <span className="text-sm font-medium">Es un <strong>servicio</strong> (precio variable por venta)</span>
        </label>
        {form.watch("esServicio") && (
          <p className="text-[11px] text-muted-foreground pl-6">
            Al agregar en Ventas o PDV, el usuario podrá ingresar el precio manualmente. Ideal para Acarreo, instalación o mano de obra.
          </p>
        )}
      </div>

      {/* ── Botones ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn("font-semibold transition-colors", isSubmitting && "opacity-50 pointer-events-none")}
          style={{ backgroundColor: "var(--accent-hex)", color: "#fff", padding: "0.5rem 1.25rem", borderRadius: "0.5rem" }}
        >
          {isSubmitting ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear producto"}
        </button>
      </div>

    </form>
  );
}
