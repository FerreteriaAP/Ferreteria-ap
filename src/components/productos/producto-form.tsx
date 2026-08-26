"use client";

import { useState, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { crearProducto, actualizarProducto, siguienteCodigoPorCategoria, type ProductoInput } from "@/actions/productos";
import { cn } from "@/lib/utils";

// Schema 

const FormSchema = z.object({
 codigo: z.string().min(1, "Código requerido"),
 codigoBarras: z.string().optional(),
 nombre: z.string().min(1, "Nombre requerido"),
 descripcion: z.string().optional(),
 categoriaId: z.string().min(1, "Categoría requerida"),
 unidadMedida: z.string().min(1, "Unidad requerida"),
 esFraccionable: z.boolean().default(false),
 unidadFraccion: z.string().optional(),
 factorFraccion: z.coerce.number().positive().optional(),
 exentoItbis: z.boolean().default(false),
 costoUltimo: z.coerce.number().min(0).default(0),
 porcentajeGanancia: z.coerce.number().min(0).default(30),
 precioVenta: z.coerce.number().min(0),
 precioMayoreo: z.coerce.number().min(0).optional(),
 stockActual: z.coerce.number().default(0),
 stockMinimo: z.coerce.number().min(0).default(0),
 stockMaximo: z.coerce.number().min(0).optional(),
 esServicio: z.boolean().default(false),
 activo: z.boolean().default(true),
});

type FormValues = z.infer<typeof FormSchema>;

// Props 

type Categoria = { id: string; nombre: string; codigo: string };

interface ProductoFormProps {
 productoId?: string;
 categorias: Categoria[];
 defaultValues?: Partial<FormValues>;
 nextCodigo?: string;
}

const UNIDADES = ["UND", "M", "M2", "M3", "KG", "LB", "GLL", "LT", "PIE", "ROLLO", "CAJA", "PAR", "JGO", "FND"];

// Componente 

export function ProductoForm({ productoId, categorias, defaultValues, nextCodigo }: ProductoFormProps) {
 const router = useRouter();
 const [serverError, setServerError] = useState<string | null>(null);
 const esEdicion = !!productoId;

 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const form = useForm<FormValues>({
 resolver: zodResolver(FormSchema) as any,
 defaultValues: {
 codigo: nextCodigo ?? "",
 unidadMedida: "UND",
 esFraccionable: false,
 exentoItbis: false,
 esServicio: false,
 costoUltimo: 0,
 porcentajeGanancia: 30,
 precioVenta: 0,
 stockActual: 0,
 stockMinimo: 0,
 activo: true,
 ...defaultValues,
 },
 });

 const { errors, isSubmitting } = form.formState;
 const costo = form.watch("costoUltimo") ?? 0;
 const ganancia = form.watch("porcentajeGanancia") ?? 30;
 const fraccion = form.watch("esFraccionable");

 // Auto-generar código cuando cambia la categoría (solo en modo creación)
 const handleCategoriaChange = async (categoriaId: string) => {
 form.setValue("categoriaId", categoriaId);
 if (!esEdicion && categoriaId) {
 const codigo = await siguienteCodigoPorCategoria(categoriaId);
 form.setValue("codigo", codigo);
 }
 };

 // Calcular precio de venta sugerido cuando cambia costo o ganancia
 useEffect(() => {
 if (!esEdicion && costo > 0) {
 const sugerido = costo * (1 + ganancia / 100);
 form.setValue("precioVenta", Math.round(sugerido * 100) / 100);
 }
 }, [costo, ganancia, esEdicion, form]);

 const onSubmit: SubmitHandler<FormValues> = async (values) => {
 setServerError(null);

 const result = esEdicion
 ? await actualizarProducto(productoId, values as ProductoInput)
 : await crearProducto(values as ProductoInput);

 if ("error" in result && result.error) {
 const errs = result.error as Record<string, string[]>;
 setServerError(Object.values(errs).flat()[0] ?? "Error al guardar");
 return;
 }

 const id = "id" in result ? result.id : productoId;
 router.push(`/productos/${id}`);
 };

 const precioSugerido = costo > 0 ? (costo * (1 + ganancia / 100)).toFixed(2) : null;

 return (
 <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 max-w-4xl"> {serverError && (
 <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"> {serverError}
 </div> )}

 {/* Identificación */}
 <Card> <CardHeader><CardTitle className="text-base">Identificación</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div className="space-y-1.5"> <Label htmlFor="codigo">Código interno *</Label> <Input id="codigo" placeholder="PROD-00001" {...form.register("codigo")} /> {errors.codigo && <p className="text-xs text-destructive">{errors.codigo.message}</p>}
 </div> <div className="space-y-1.5"> <Label htmlFor="codigoBarras">Código de barras</Label> <Input id="codigoBarras" placeholder="7896543210123" {...form.register("codigoBarras")} /> {errors.codigoBarras && <p className="text-xs text-destructive">{errors.codigoBarras.message}</p>}
 </div> <div className="space-y-1.5 sm:col-span-2"> <Label htmlFor="nombre">Nombre del producto *</Label> <Input id="nombre" placeholder="Cable #12 THHN Negro" {...form.register("nombre")} /> {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
 </div> <div className="space-y-1.5"> <Label>Categoría *</Label> <Select
 value={(form.watch("categoriaId") as string | undefined) ?? ""}
 onValueChange={(v) => handleCategoriaChange((v ?? "") as string)}
 > <SelectTrigger> <SelectValue placeholder="Seleccionar..." /> </SelectTrigger> <SelectContent> {categorias.map((c) => (
 <SelectItem key={c.id} value={c.id}> <span className="font-mono text-xs mr-2 text-muted-foreground">{c.codigo}</span> {c.nombre}
 </SelectItem> ))}
 </SelectContent> </Select> {errors.categoriaId && <p className="text-xs text-destructive">{errors.categoriaId.message}</p>}
 </div> <div className="space-y-1.5"> <Label>Unidad de medida *</Label> <Select
 value={(form.watch("unidadMedida") as string | undefined) ?? "UND"}
 onValueChange={(v) => form.setValue("unidadMedida", (v ?? "UND") as string)}
 > <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> {UNIDADES.map((u) => (
 <SelectItem key={u} value={u}>{u}</SelectItem> ))}
 </SelectContent> </Select> </div> <div className="space-y-1.5 sm:col-span-2"> <Label htmlFor="descripcion">Descripción</Label> <Textarea id="descripcion" rows={2} placeholder="Especificaciones técnicas, presentación..." {...form.register("descripcion")} /> </div> </CardContent> </Card> {/* Fraccionamiento */}
 <Card> <CardHeader> <div className="flex items-center justify-between"> <CardTitle className="text-base">Fraccionamiento</CardTitle> <label className="flex items-center gap-2 cursor-pointer"> <input
 type="checkbox" {...form.register("esFraccionable")}
 className="rounded" /> <span className="text-sm">Este producto se vende fraccionado</span> </label> </div> </CardHeader> {fraccion && (
 <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div className="space-y-1.5"> <Label>Unidad de fracción</Label> <Input placeholder="PIE, CM, ML..." {...form.register("unidadFraccion")} /> <p className="text-xs text-muted-foreground">Ej: si la unidad es ROLLO, la fracción sería PIE</p> </div> <div className="space-y-1.5"> <Label>Factor de conversión</Label> <Input type="number" step="0.0001" placeholder="100" {...form.register("factorFraccion")} /> <p className="text-xs text-muted-foreground">Cuántas fracciones hay por unidad (ej: 100 pies por rollo)</p> </div> </CardContent> )}
 </Card> {/* ITBIS */}
 <Card> <CardHeader> <div className="flex items-center justify-between"> <CardTitle className="text-base">Impuestos (ITBIS)</CardTitle> <label className="flex items-center gap-2 cursor-pointer"> <input
 type="checkbox" {...form.register("exentoItbis")}
 className="rounded" /> <span className="text-sm">Este producto está <strong>exento de ITBIS</strong></span> </label> </div> </CardHeader> {form.watch("exentoItbis") && (
 <div className="px-6 pb-4 text-xs text-muted-foreground"> Al agregar este producto a una cotización/venta, el ITBIS se marcará como exento automáticamente (ej. agregados, materiales exentos).
 </div> )}
 </Card> {/* Servicio (precio variable) */}
 <Card> <CardHeader> <div className="flex items-center justify-between"> <CardTitle className="text-base">Tipo de producto</CardTitle> <label className="flex items-center gap-2 cursor-pointer"> <input
 type="checkbox" {...form.register("esServicio")}
 className="rounded" /> <span className="text-sm">Es un <strong>servicio</strong> (precio variable por venta)</span> </label> </div> </CardHeader> {form.watch("esServicio") && (
 <div className="px-6 pb-4 text-xs text-muted-foreground"> Al agregar este producto en Ventas o PDV, cualquier usuario podrá ingresar el precio manualmente. Ideal para servicios como <strong>Acarreo</strong>, instalación o mano de obra donde el monto varía según cada cliente.
 </div> )}
 </Card> {/* Precios */}
 <Card> <CardHeader><CardTitle className="text-base">Precios</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div className="space-y-1.5"> <Label htmlFor="costoUltimo">Costo (RD$)</Label> <Input id="costoUltimo" type="number" step="0.01" min="0" placeholder="0.00" {...form.register("costoUltimo")} /> </div> <div className="space-y-1.5"> <Label htmlFor="porcentajeGanancia">% Ganancia</Label> <Input id="porcentajeGanancia" type="number" step="0.01" min="0" placeholder="30" {...form.register("porcentajeGanancia")} /> {precioSugerido && (
 <p className="text-xs text-muted-foreground"> Precio sugerido: <span className="font-medium text-foreground">RD$ {precioSugerido}</span> </p> )}
 </div> <div className="space-y-1.5"> <Label htmlFor="precioVenta">Precio de venta (RD$) *</Label> <Input id="precioVenta" type="number" step="0.01" min="0" placeholder="0.00" {...form.register("precioVenta")} /> {errors.precioVenta && <p className="text-xs text-destructive">{errors.precioVenta.message}</p>}
 </div> <div className="space-y-1.5"> <Label htmlFor="precioMayoreo">Precio al por mayor (RD$)</Label> <Input id="precioMayoreo" type="number" step="0.01" min="0" placeholder="Opcional" {...form.register("precioMayoreo")} /> </div> </CardContent> </Card> {/* Inventario / Stock */}
 <Card> <CardHeader><CardTitle className="text-base">Control de inventario</CardTitle></CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4"> <div className="space-y-1.5"> <Label htmlFor="stockActual"> Stock actual
 {esEdicion && <Badge variant="outline" className="ml-2 text-xs">Genera ajuste</Badge>}
 </Label> <Input id="stockActual" type="number" step="0.0001" min="0" placeholder="0" {...form.register("stockActual")} /> </div> <div className="space-y-1.5"> <Label htmlFor="stockMinimo"> Stock mínimo
 <span className="text-xs text-muted-foreground ml-1">(alerta)</span> </Label> <Input id="stockMinimo" type="number" step="0.0001" min="0" placeholder="0" {...form.register("stockMinimo")} /> </div> <div className="space-y-1.5"> <Label htmlFor="stockMaximo">Stock máximo</Label> <Input id="stockMaximo" type="number" step="0.0001" min="0" placeholder="Opcional" {...form.register("stockMaximo")} /> </div> </CardContent> </Card> <Separator /> <div className="flex items-center justify-end gap-3"> <button
 type="button" onClick={() => router.back()}
 className={cn(buttonVariants({ variant: "outline" }))}
 > Cancelar
 </button> <button
 type="submit" disabled={isSubmitting}
 className={cn("font-semibold transition-colors", isSubmitting && "opacity-50 pointer-events-none")}
 style={{ backgroundColor: "var(--accent-hex)", color: "#fff", padding: "0.5rem 1.25rem", borderRadius: "0.5rem" }}
 > {isSubmitting ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear producto"}
 </button> </div> </form> );
}
