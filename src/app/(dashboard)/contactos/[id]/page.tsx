import { notFound } from "next/navigation";
import Link from "next/link";
import { getContacto } from "@/actions/contactos";
import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { ChequeSupllidorBtn } from "@/components/cheques/cheque-btn";

const tipoLabel: Record<string, string> = { CLIENTE: "Cliente", SUPLIDOR: "Suplidor", AMBOS: "Cliente y Suplidor" };
const tipoVariant: Record<string, "default" | "secondary" | "outline"> = { CLIENTE: "default", SUPLIDOR: "secondary", AMBOS: "outline" };
const creditoLabel: Record<string, string> = { CONTADO: "Contado", DIAS_30: "30 días", DIAS_45: "45 días", DIAS_60: "60 días" };
const ncfLabel: Record<string, string> = { B01: "B01 — Crédito Fiscal", B02: "B02 — Consumidor Final", B14: "B14 — Regímenes Especiales", B15: "B15 — Gubernamentales" };

interface PageProps {
 params: Promise<{ id: string }>;
}

export default async function ContactoPage({ params }: PageProps) {
 const { id } = await params;
 const [contacto, session] = await Promise.all([getContacto(id), auth()]);

 if (!contacto) notFound();

 const rol = (session?.user as { rol?: string })?.rol ?? "";
 const esAdmin = rol === "ADMINISTRADOR";
 const esSuplidor = contacto.tipo === "SUPLIDOR" || contacto.tipo === "AMBOS";

 return (
 <div className="space-y-5 max-w-4xl"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem> <BreadcrumbLink href="/contactos">Contactos</BreadcrumbLink> </BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem> <BreadcrumbPage>{contacto.nombre}</BreadcrumbPage> </BreadcrumbItem> </BreadcrumbList> </Breadcrumb> {/* Header */}
 <div className="flex items-start justify-between"> <div className="space-y-1"> <div className="flex items-center gap-2"> <h1 className="text-2xl font-bold">{contacto.nombre}</h1> <Badge variant={tipoVariant[contacto.tipo]}>{tipoLabel[contacto.tipo]}</Badge> {!contacto.activo && <Badge variant="destructive">Inactivo</Badge>}
 </div> {contacto.nombreLegal && (
 <p className="text-sm text-muted-foreground">{contacto.nombreLegal}</p> )}
 </div>
 <div className="flex items-center gap-2">
 {esAdmin && esSuplidor && (
 <ChequeSupllidorBtn
 contactoId={contacto.id}
 nombre={contacto.nombre}
 chequeListo={contacto.chequeListo}
 />
 )}
 <Link href={`/contactos/${id}/editar`} className={buttonVariants({ variant: "outline" })}> Editar
 </Link>
 </div>
 </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Datos generales */}
 <Card> <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Datos generales</CardTitle></CardHeader> <CardContent className="space-y-2 text-sm"> <Row label="RNC / Cédula" value={contacto.rnc ?? "—"} /> <Row label="Comprobante" value={ncfLabel[contacto.tipoComprobante]} /> <Row label="Teléfono" value={contacto.telefono ?? "—"} /> <Row label="Tel. alternativo" value={contacto.telefonoAlt ?? "—"} /> <Row label="Email" value={contacto.email ?? "—"} /> </CardContent> </Card> {/* Condiciones comerciales */}
 <Card> <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Condiciones comerciales</CardTitle></CardHeader> <CardContent className="space-y-2 text-sm"> <Row label="Crédito" value={creditoLabel[contacto.credito]} /> <Row label="Límite crédito" value={contacto.limiteCredito ? `RD$ ${Number(contacto.limiteCredito).toLocaleString("es-DO")}` : "—"} /> <Row label="Descuento fijo" value={contacto.descuentoFijo ? `${contacto.descuentoFijo}%` : "—"} /> <Separator className="my-1" /> <Row label="Ventas" value={String(contacto._count.ventas)} /> <Row label="Compras" value={String(contacto._count.compras)} /> </CardContent> </Card> </div> {/* Notas */}
 {contacto.notas && (
 <Card> <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Notas internas</CardTitle></CardHeader> <CardContent> <p className="text-sm whitespace-pre-line">{contacto.notas}</p> </CardContent> </Card> )}

 {/* Direcciones */}
 <Card> <CardHeader className="flex flex-row items-center justify-between"> <CardTitle className="text-sm font-medium text-muted-foreground"> Direcciones de entrega ({contacto.direcciones.length})
 </CardTitle> </CardHeader> <CardContent> {contacto.direcciones.length === 0 ? (
 <p className="text-sm text-muted-foreground">Sin direcciones registradas</p> ) : (
 <div className="space-y-3"> {contacto.direcciones.map((dir) => (
 <div key={dir.id} className="border rounded-lg px-4 py-3 space-y-1"> <div className="flex items-center gap-2"> <span className="font-medium text-sm">{dir.etiqueta}</span> {dir.esPrincipal && <Badge variant="outline" className="text-xs">Principal</Badge>}
 </div> <p className="text-sm text-muted-foreground"> {dir.direccion}{dir.sector ? `, ${dir.sector}` : ""} — {dir.ciudad}
 {dir.provincia ? `, ${dir.provincia}` : ""}
 </p> {dir.referencia && (
 <p className="text-xs text-muted-foreground"> {dir.referencia}</p> )}
 </div> ))}
 </div> )}
 </CardContent> </Card> </div> );
}

function Row({ label, value }: { label: string; value: string }) {
 return (
 <div className="flex justify-between"> <span className="text-muted-foreground">{label}</span> <span className="font-medium">{value}</span> </div> );
}
