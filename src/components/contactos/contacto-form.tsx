"use client";

import { useState } from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { crearContacto, actualizarContacto, type ContactoInput } from "@/actions/contactos";
import { cn } from "@/lib/utils";

// Schema 

const DireccionSchema = z.object({
 id: z.string().optional(),
 etiqueta: z.string().min(1, "Etiqueta requerida"),
 direccion: z.string().min(1, "Dirección requerida"),
 sector: z.string().optional(),
 ciudad: z.string().default("Santo Domingo"),
 provincia: z.string().optional(),
 referencia: z.string().optional(),
 esPrincipal: z.boolean().default(false),
});

const FormSchema = z.object({
 tipo: z.enum(["CLIENTE", "SUPLIDOR", "AMBOS"]),
 nombre: z.string().min(1, "Nombre requerido"),
 nombreLegal: z.string().optional(),
 rnc: z.string().optional(),
 tipoComprobante: z.enum(["B01", "B02", "B14", "B15"]),
 email: z.string().optional(),
 telefono: z.string().optional(),
 telefonoAlt: z.string().optional(),
 credito: z.enum(["CONTADO", "DIAS_30", "DIAS_45", "DIAS_60"]),
 limiteCredito: z.coerce.number().optional(),
 descuentoFijo: z.coerce.number().min(0).max(100).optional(),
 esEmisorElectronico: z.boolean().default(false),
 notas: z.string().optional(),
 activo: z.boolean().default(true),
 direcciones: z.array(DireccionSchema).default([]),
});

type FormValues = z.infer<typeof FormSchema>;

// Props 

interface ContactoFormProps {
 contactoId?: string;
 defaultValues?: Partial<FormValues>;
}

// Componente 

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
 const firstError = Object.values(errors).flat()[0];
 setServerError(firstError ?? "Error al guardar");
 return;
 }

 const id = "id" in result ? result.id : contactoId;
 router.push(`/contactos/${id}`);
 };

 const { errors, isSubmitting } = form.formState;
 const tipoWatch = form.watch("tipo");
 const creditoWatch = form.watch("credito");

 return (
 <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 max-w-4xl"> {serverError && (
 <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"> {serverError}
 </div> )}

 {/* Información básica */}
 <Card> <CardHeader> <CardTitle className="text-base">Información general</CardTitle> </CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4"> <div className="space-y-1.5"> <Label>Tipo *</Label> <Select
 value={form.watch("tipo")}
 onValueChange={(v) => form.setValue("tipo", v as FormValues["tipo"])}
 > <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="CLIENTE">Cliente</SelectItem> <SelectItem value="SUPLIDOR">Suplidor</SelectItem> <SelectItem value="AMBOS">Cliente y Suplidor</SelectItem> </SelectContent> </Select> </div> <div className="space-y-1.5"> <Label>Tipo de comprobante</Label> <Select
 value={form.watch("tipoComprobante")}
 onValueChange={(v) => form.setValue("tipoComprobante", v as FormValues["tipoComprobante"])}
 > <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="B01">B01 — Crédito Fiscal</SelectItem> <SelectItem value="B02">B02 — Consumidor Final</SelectItem> <SelectItem value="B14">B14 — Regímenes Especiales</SelectItem> <SelectItem value="B15">B15 — Gubernamentales</SelectItem> </SelectContent> </Select> </div> <div className="space-y-1.5 sm:col-span-2"> <Label htmlFor="nombre">Nombre comercial / Persona *</Label> <Input id="nombre" placeholder="Distribuidora López, S.R.L." {...form.register("nombre")} /> {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
 </div> <div className="space-y-1.5 sm:col-span-2"> <Label htmlFor="nombreLegal">Nombre legal (si difiere)</Label> <Input id="nombreLegal" placeholder="Razón social completa" {...form.register("nombreLegal")} /> </div> <div className="space-y-1.5"> <Label htmlFor="rnc">RNC / Cédula</Label> <Input id="rnc" placeholder="101-12345-6" {...form.register("rnc")} /> </div> <div className="space-y-1.5"> <Label htmlFor="telefono">Teléfono principal</Label> <Input id="telefono" placeholder="809-555-0000" {...form.register("telefono")} /> </div> <div className="space-y-1.5"> <Label htmlFor="telefonoAlt">Teléfono alternativo</Label> <Input id="telefonoAlt" placeholder="829-555-0000" {...form.register("telefonoAlt")} /> </div> <div className="space-y-1.5"> <Label htmlFor="email">Email</Label> <Input id="email" type="email" placeholder="contacto@empresa.com" {...form.register("email")} /> </div> <div className="space-y-1.5 sm:col-span-2"> <Label htmlFor="notas">Notas internas</Label> <Textarea id="notas" rows={2} placeholder="Observaciones, condiciones especiales..." {...form.register("notas")} /> </div> </CardContent> </Card> {/* Crédito */}
 <Card> <CardHeader> <CardTitle className="text-base"> {tipoWatch === "SUPLIDOR" ? "Condiciones de compra / crédito suplidor" : "Condiciones de crédito"}
 </CardTitle> </CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4"> <div className="space-y-1.5"> <Label>Plazo de crédito</Label> <Select
 value={creditoWatch}
 onValueChange={(v) => form.setValue("credito", v as FormValues["credito"])}
 > <SelectTrigger><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="CONTADO">Contado</SelectItem> <SelectItem value="DIAS_30">30 días</SelectItem> <SelectItem value="DIAS_45">45 días</SelectItem> <SelectItem value="DIAS_60">60 días</SelectItem> </SelectContent> </Select> </div> {creditoWatch !== "CONTADO" && (
 <div className="space-y-1.5"> <Label htmlFor="limiteCredito"> {tipoWatch === "SUPLIDOR" ? "Línea de crédito con suplidor (RD$)" : "Límite de crédito (RD$)"}
 </Label> <Input id="limiteCredito" type="number" step="0.01" placeholder="50000.00" {...form.register("limiteCredito")} /> </div> )}

 <div className="space-y-1.5"> <Label htmlFor="descuentoFijo">Descuento fijo (%)</Label> <Input id="descuentoFijo" type="number" step="0.01" min="0" max="100" placeholder="0.00" {...form.register("descuentoFijo")} /> </div> {/* Facturación electrónica — solo visible para suplidores */}
 {(tipoWatch === "SUPLIDOR" || tipoWatch === "AMBOS") && (
 <div className="sm:col-span-3 flex items-center gap-3 pt-1"> <input
 type="checkbox" id="esEmisorElectronico" {...form.register("esEmisorElectronico")}
 className="h-4 w-4 rounded border" /> <div> <Label htmlFor="esEmisorElectronico" className="cursor-pointer"> Este suplidor emite facturas electrónicas (E31)
 </Label> <p className="text-xs text-muted-foreground mt-0.5"> Marca esto si el suplidor usa NCF electrónico (E31) en lugar de los físicos B01-B15
 </p> </div> </div> )}
 </CardContent> </Card> {/* Direcciones */}
 <Card> <CardHeader className="flex flex-row items-center justify-between"> <CardTitle className="text-base">Direcciones de entrega</CardTitle> <button
 type="button" onClick={() => append({
 etiqueta: "",
 direccion: "",
 sector: "",
 ciudad: "Santo Domingo",
 provincia: "",
 referencia: "",
 esPrincipal: direcciones.length === 0,
 })}
 className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
 > + Agregar dirección
 </button> </CardHeader> <CardContent className="space-y-4"> {direcciones.length === 0 && (
 <p className="text-sm text-muted-foreground text-center py-4"> Sin direcciones registradas. Agrega al menos una.
 </p> )}

 {direcciones.map((field, index) => (
 <div key={field.id} className="border rounded-lg p-4 space-y-3"> <div className="flex items-center justify-between"> <Badge variant={index === 0 ? "default" : "outline"} className="text-xs"> {index === 0 ? "Principal" : `Dirección ${index + 1}`}
 </Badge> <button
 type="button" onClick={() => remove(index)}
 className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-destructive hover:text-destructive")}
 > Eliminar
 </button> </div> <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"> <div className="space-y-1.5"> <Label>Etiqueta *</Label> <Input placeholder="Almacén Principal, Sucursal Norte..." {...form.register(`direcciones.${index}.etiqueta`)} /> {errors.direcciones?.[index]?.etiqueta && (
 <p className="text-xs text-destructive">{errors.direcciones[index]?.etiqueta?.message}</p> )}
 </div> <div className="space-y-1.5"> <Label>Ciudad</Label> <Input placeholder="Santo Domingo" {...form.register(`direcciones.${index}.ciudad`)} /> </div> <div className="space-y-1.5 sm:col-span-2"> <Label>Dirección *</Label> <Input placeholder="Calle, número, edificio..." {...form.register(`direcciones.${index}.direccion`)} /> {errors.direcciones?.[index]?.direccion && (
 <p className="text-xs text-destructive">{errors.direcciones[index]?.direccion?.message}</p> )}
 </div> <div className="space-y-1.5"> <Label>Sector</Label> <Input placeholder="Piantini, Naco..." {...form.register(`direcciones.${index}.sector`)} /> </div> <div className="space-y-1.5"> <Label>Provincia</Label> <Input placeholder="Distrito Nacional" {...form.register(`direcciones.${index}.provincia`)} /> </div> <div className="space-y-1.5 sm:col-span-2"> <Label>Referencia</Label> <Input placeholder="Frente al colmado, 2da planta..." {...form.register(`direcciones.${index}.referencia`)} /> </div> </div> </div> ))}
 </CardContent> </Card> <Separator /> <div className="flex items-center gap-3"> <button
 type="submit" disabled={isSubmitting}
 className={cn(buttonVariants(), isSubmitting && "opacity-50 pointer-events-none")}
 > {isSubmitting ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear contacto"}
 </button> <button
 type="button" onClick={() => router.back()}
 className={cn(buttonVariants({ variant: "outline" }))}
 > Cancelar
 </button> </div> </form> );
}
