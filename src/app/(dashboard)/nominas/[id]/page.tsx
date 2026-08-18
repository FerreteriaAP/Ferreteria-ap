import { notFound } from "next/navigation";
import { getNomina } from "@/actions/nominas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { NominaAcciones } from "@/components/nominas/nomina-acciones";
import { NominaTabla } from "@/components/nominas/nomina-tabla";

interface PageProps {
 params: Promise<{ id: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmt = (n: any) => `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

const estadoVariant: Record<string, "default" | "secondary" | "outline"> = {
 BORRADOR: "outline", PROCESADA: "secondary", PAGADA: "default",
};

const periodoLabel: Record<string, string> = {
 PRIMERA_QUINCENA: "1ra Quincena (1–15)",
 SEGUNDA_QUINCENA: "2da Quincena (16–fin)",
};

const meses = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default async function NominaPage({ params }: PageProps) {
 const { id } = await params;
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const nomina = (await getNomina(id)) as any;
 if (!nomina) notFound();

 return (
 <div className="space-y-5"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem><BreadcrumbLink href="/nominas">Nóminas</BreadcrumbLink></BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem><BreadcrumbPage>{nomina.numero}</BreadcrumbPage></BreadcrumbItem> </BreadcrumbList> </Breadcrumb> {/* Encabezado */}
 <div className="flex items-start justify-between"> <div className="space-y-1"> <div className="flex items-center gap-2"> <h1 className="text-2xl font-bold">{nomina.numero}</h1> <Badge variant={estadoVariant[nomina.estado]}>{nomina.estado}</Badge> </div> <p className="text-sm text-muted-foreground"> {periodoLabel[nomina.periodo]} — {meses[nomina.mes]} {nomina.anio}
 </p> </div> <NominaAcciones nominaId={id} numero={nomina.numero} estado={nomina.estado} /> </div> {/* Resumen */}
 <div className="grid grid-cols-3 gap-4"> {[
 { label: "Total bruto", value: fmt(nomina.totalBruto), sub: "Salario + devengados" },
 { label: "Total descuentos", value: fmt(nomina.totalDescuentos), sub: "AFP + SFS + préstamos + SAN" },
 { label: "Total neto a pagar",value: fmt(nomina.totalNeto), sub: "Lo que recibe el empleado" },
 ].map((s) => (
 <Card key={s.label}> <CardContent className="pt-4 pb-3"> <p className="text-xs text-muted-foreground">{s.label}</p> <p className="text-xl font-bold mt-1">{s.value}</p> <p className="text-[10px] text-muted-foreground/60 mt-0.5">{s.sub}</p> </CardContent> </Card> ))}
 </div> {/* Sin empleados */}
 {nomina.empleados.length === 0 && (
 <div className="rounded-md bg-orange-50 border border-orange-200 p-4 text-sm text-orange-800"> <p className="font-medium"> Esta nómina no tiene empleados</p> <p className="mt-1 text-xs"> Fue generada antes de registrar empleados. Crea una nueva nómina desde la lista.
 </p> </div> )}

 {/* Planilla editable */}
 {nomina.empleados.length > 0 && (
 <div className="space-y-2"> <div className="flex items-center justify-between"> <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"> Planilla — {nomina.empleados.length} empleados
 </h2> {nomina.estado === "BORRADOR" && (
 <span className="text-xs text-blue-600 font-medium"> Edición habilitada — modifica directamente en la tabla
 </span> )}
 </div> <NominaTabla
 nominaId={id}
 estado={nomina.estado}
 numero={nomina.numero}
 periodo={nomina.periodo}
 mes={nomina.mes}
 anio={nomina.anio}
 lineas={nomina.empleados}
 /> </div> )}

 {/* Resumen TSS empleador (oculto al fondo para referencia) */}
 {nomina.empleados.length > 0 && (
 <details className="rounded-md border"> <summary className="px-4 py-2.5 text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"> Ver aportes empleador (TSS — para declaración DGSS)
 </summary> <div className="px-4 py-3 text-sm space-y-1.5 border-t"> {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
 {[
 { label: "AFP empleador (7.10%)", val: nomina.empleados.reduce((s: number, l: any) => s + Number(l.afpEmpleador), 0) },
 { label: "SFS empleador (7.09%)", val: nomina.empleados.reduce((s: number, l: any) => s + Number(l.sfsEmpleador), 0) },
 ].map((r) => (
 <div key={r.label} className="flex justify-between text-muted-foreground"> <span>{r.label}</span> <span className="tabular-nums">{fmt(r.val)}</span> </div> ))}
 </div> </details> )}
 </div> );
}
