"use client";

import { useState, useCallback } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crearOrdenCompra, type OcInput } from "@/actions/ordenes-compra";
import { buscarProductosPorKeyword, getProductoPorCodigo } from "@/actions/productos";
import { cn } from "@/lib/utils";

// ─── Schema ───────────────────────────────────────────────────────────────────

const DetalleSchema = z.object({
  productoId:   z.string().min(1),
  nombre:       z.string(),
  codigo:       z.string(),
  unidad:       z.string(),
  cantidad:     z.coerce.number().positive("> 0"),
  costo:        z.coerce.number().min(0, "Costo estimado"),
  exentoItbis:  z.boolean().default(false),
});

const FormSchema = z.object({
  suplidorId:   z.string().min(1, "Suplidor requerido"),
  fechaEntrega: z.string().optional(),
  notas:        z.string().optional(),
  detalles:     z.array(DetalleSchema).min(1, "Agrega al menos un producto"),
});

type FormValues = z.infer<typeof FormSchema>;

interface Suplidor { id: string; nombre: string }

const UNIDADES = ["UND","PIE","M","M2","M3","KG","LB","GLL","FND","CJA","RLL","PLG","TN","SACO","QUINTAL","METRO3"];
const hoy = new Date().toISOString().split("T")[0];

const ROW_BORDER: React.CSSProperties = {
  borderBottom: "1px solid color-mix(in oklch, var(--border) 35%, transparent)",
};

const LABEL = "text-xs font-medium text-muted-foreground";
const INPUT_CLS = "w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

// ─── Componente ───────────────────────────────────────────────────────────────

export function OcForm({ suplidores }: { suplidores: Suplidor[] }) {
  const router    = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [busqueda,   setBusqueda]   = useState("");
  const [sugerencias, setSugerencias] = useState<Array<{
    id: string; nombre: string; codigo: string;
    unidadMedida: string; costoUltimo: number; exentoItbis: boolean;
  }>>([]);
  const [buscando, setBuscando] = useState(false);

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(FormSchema) as unknown as Resolver<FormValues>,
    defaultValues: { suplidorId: "", notas: "", detalles: [] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "detalles" });

  // Buscar productos
  const buscarProductos = useCallback(async (q: string) => {
    setBusqueda(q);
    if (q.length < 2) { setSugerencias([]); return; }
    setBuscando(true);
    try {
      if (/^\d{6,}$/.test(q)) {
        const p = await getProductoPorCodigo(q);
        if (p) { agregarProducto(p); setBusqueda(""); setSugerencias([]); return; }
      }
      const res = await buscarProductosPorKeyword(q);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSugerencias((res as any[]).map(p => ({
        id: p.id, nombre: p.nombre, codigo: p.codigo,
        unidadMedida: p.unidadMedida, costoUltimo: Number(p.costoUltimo),
        exentoItbis: Boolean(p.exentoItbis),
      })));
    } finally { setBuscando(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function agregarProducto(p: any) {
    const existe = fields.findIndex(f => f.productoId === p.id);
    if (existe >= 0) {
      form.setValue(`detalles.${existe}.cantidad`, form.getValues(`detalles.${existe}.cantidad`) + 1);
    } else {
      append({
        productoId: p.id, nombre: p.nombre, codigo: p.codigo,
        unidad: p.unidadMedida, cantidad: 1,
        costo: Number(p.costoUltimo ?? 0),
        exentoItbis: Boolean(p.exentoItbis ?? false),
      });
    }
    setSugerencias([]);
    setBusqueda("");
  }

  // Totales
  const detalles  = form.watch("detalles");
  const fmt       = (n: number) => n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const subtotal  = detalles.reduce((s, d) => s + (Number(d.cantidad) || 0) * (Number(d.costo) || 0), 0);
  const itbisTotal = detalles.reduce((s, d) =>
    d.exentoItbis ? s : s + (Number(d.cantidad) || 0) * (Number(d.costo) || 0) * 0.18, 0);
  const total = subtotal + itbisTotal;

  // Submit
  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await crearOrdenCompra(values as unknown as OcInput);
      if ("error" in res) {
        setError(typeof res.error === "string" ? res.error : "Verifica los datos");
      } else {
        router.push(`/ordenes-compra/${res.id}`);
      }
    } finally { setSubmitting(false); }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* ─── Datos de la orden ─────────────────────────────────────────── */}
      <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}>
        <p className="text-sm font-semibold">Datos de la orden</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Suplidor */}
          <div className="space-y-1.5">
            <label className={LABEL}>Suplidor *</label>
            <Select
              value={form.watch("suplidorId") || undefined}
              onValueChange={v => form.setValue("suplidorId", String(v ?? ""))}
            >
              <SelectTrigger className={form.formState.errors.suplidorId ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecciona suplidor..." />
              </SelectTrigger>
              <SelectContent>
                {suplidores.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.suplidorId && (
              <p className="text-xs text-destructive">{form.formState.errors.suplidorId.message}</p>
            )}
          </div>

          {/* Fecha entrega */}
          <div className="space-y-1.5">
            <label className={LABEL}>Fecha de entrega esperada</label>
            <Input type="date" min={hoy} {...form.register("fechaEntrega")} />
          </div>

          {/* Notas */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className={LABEL}>Notas</label>
            <Textarea
              rows={2}
              placeholder="Instrucciones especiales, especificaciones..."
              {...form.register("notas")}
            />
          </div>
        </div>
      </div>

      {/* ─── Productos a solicitar ─────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 3%, var(--card))" }}>

        {/* Header */}
        <div className="px-5 py-3 border-b flex items-center justify-between"
          style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 5%, var(--card))" }}>
          <p className="text-sm font-semibold">Productos a solicitar</p>
          <span className="text-xs text-muted-foreground">
            {fields.length} ítem{fields.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* Buscador */}
          <div className="relative">
            <input
              value={busqueda}
              onChange={e => buscarProductos(e.target.value)}
              placeholder="Buscar producto por nombre o código..."
              autoComplete="off"
              className={INPUT_CLS}
            />
            {buscando && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                Buscando…
              </span>
            )}

            {/* Dropdown — fondo sólido explícito */}
            {sugerencias.length > 0 && (
              <div
                className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border shadow-xl overflow-hidden"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              >
                {sugerencias.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => agregarProducto(p)}
                    className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors text-sm flex justify-between items-center border-b last:border-0"
                    style={{ borderColor: "color-mix(in oklch, var(--border) 40%, transparent)" }}
                  >
                    <span>
                      <span className="font-semibold">{p.nombre}</span>
                      <span className="text-muted-foreground text-xs ml-2">· {p.codigo}</span>
                    </span>
                    <span className="text-xs shrink-0 ml-3 flex items-center gap-1 font-mono">
                      RD$ {fmt(p.costoUltimo)}
                      {p.exentoItbis
                        ? <span className="text-green-600 dark:text-green-400 font-semibold ml-1">EXENTO</span>
                        : <span style={{ color: "var(--accent-hex)" }} className="font-semibold ml-1">+ITBIS</span>
                      }
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabla de productos */}
          {fields.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={ROW_BORDER}>
                    <TableHead>Producto</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead className="w-24">Cantidad</TableHead>
                    <TableHead className="w-32">Costo unit.</TableHead>
                    <TableHead className="w-24 text-right">ITBIS 18%</TableHead>
                    <TableHead className="w-28 text-right">Subtotal</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, i) => {
                    const cant    = Number(form.watch(`detalles.${i}.cantidad`)) || 0;
                    const costo   = Number(form.watch(`detalles.${i}.costo`))    || 0;
                    const exento  = field.exentoItbis;
                    const itbisLin = exento ? 0 : cant * costo * 0.18;
                    const subLin   = cant * costo;
                    return (
                      <TableRow key={field.id} style={ROW_BORDER}>
                        <TableCell>
                          <div className="font-medium text-sm">{field.nombre}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            {field.codigo}
                            {exento && (
                              <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 rounded px-1">
                                EXENTO
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            defaultValue={field.unidad ?? undefined}
                            onValueChange={v => form.setValue(`detalles.${i}.unidad`, v ?? "")}
                          >
                            <SelectTrigger className="h-8 w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number" step="0.0001" min="0.0001"
                            className="h-8 w-20"
                            {...form.register(`detalles.${i}.cantidad`)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number" step="0.01" min="0"
                            className="h-8 w-28"
                            {...form.register(`detalles.${i}.costo`)}
                          />
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono text-sm",
                          exento ? "text-muted-foreground line-through" : "text-orange-500"
                        )}>
                          {exento ? "—" : fmt(itbisLin)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {fmt(subLin + itbisLin)}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => remove(i)}
                            className="text-muted-foreground hover:text-destructive transition-colors text-lg leading-none"
                          >
                            ×
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Estado vacío */}
          {fields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm rounded-xl"
              style={{ border: "1px dashed color-mix(in oklch, var(--border) 60%, transparent)" }}>
              Busca y agrega los productos a solicitar
            </div>
          )}

          {form.formState.errors.detalles && (
            <p className="text-xs text-destructive">{form.formState.errors.detalles.message}</p>
          )}

          {/* Totales */}
          {fields.length > 0 && (
            <div className="flex justify-end">
              <div
                className="text-right space-y-1 rounded-xl px-4 py-3 border min-w-[240px]"
                style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}
              >
                <div className="flex justify-between gap-6 text-sm text-muted-foreground">
                  <span>Subtotal (sin ITBIS)</span>
                  <span className="font-mono font-semibold text-foreground">RD$ {fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-6 text-sm text-muted-foreground">
                  <span>ITBIS 18%</span>
                  <span className="font-mono text-orange-500">RD$ {fmt(itbisTotal)}</span>
                </div>
                <div className="flex justify-between gap-6 text-base font-bold border-t pt-1 mt-1"
                  style={{ borderColor: "color-mix(in oklch, var(--border) 40%, transparent)" }}>
                  <span>Total estimado</span>
                  <span className="font-mono" style={{ color: "var(--accent-hex)" }}>RD$ {fmt(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Acciones ──────────────────────────────────────────────────── */}
      <div className="flex gap-3 justify-end">
        <a href="/ordenes-compra" className={cn(buttonVariants({ variant: "outline" }))}>
          Cancelar
        </a>
        <button
          type="submit"
          disabled={submitting}
          className={cn(buttonVariants(), submitting && "opacity-60 pointer-events-none")}
        >
          {submitting ? "Guardando..." : "Crear orden de compra"}
        </button>
      </div>

    </form>
  );
}
