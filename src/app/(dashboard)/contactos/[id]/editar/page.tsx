import { notFound } from "next/navigation";
import { getContacto } from "@/actions/contactos";
import { ContactoForm } from "@/components/contactos/contacto-form";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface PageProps {
 params: Promise<{ id: string }>;
}

export default async function EditarContactoPage({ params }: PageProps) {
 const { id } = await params;
 const contacto = await getContacto(id);

 if (!contacto) notFound();

 const defaultValues = {
 tipo: contacto.tipo,
 nombre: contacto.nombre,
 nombreLegal: contacto.nombreLegal ?? "",
 rnc: contacto.rnc ?? "",
 tipoComprobante: contacto.tipoComprobante,
 email: contacto.email ?? "",
 telefono: contacto.telefono ?? "",
 telefonoAlt: contacto.telefonoAlt ?? "",
 credito: contacto.credito,
 limiteCredito: contacto.limiteCredito ? Number(contacto.limiteCredito) : undefined,
 descuentoFijo: contacto.descuentoFijo ? Number(contacto.descuentoFijo) : undefined,
 esEmisorElectronico: contacto.esEmisorElectronico,
 notas: contacto.notas ?? "",
 activo: contacto.activo,
 direcciones: contacto.direcciones.map((d) => ({
 id: d.id,
 etiqueta: d.etiqueta,
 direccion: d.direccion,
 sector: d.sector ?? "",
 ciudad: d.ciudad,
 provincia: d.provincia ?? "",
 referencia: d.referencia ?? "",
 esPrincipal: d.esPrincipal,
 })),
 };

 return (
 <div className="space-y-5"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem> <BreadcrumbLink href="/contactos">Contactos</BreadcrumbLink> </BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem> <BreadcrumbLink href={`/contactos/${id}`}>{contacto.nombre}</BreadcrumbLink> </BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem> <BreadcrumbPage>Editar</BreadcrumbPage> </BreadcrumbItem> </BreadcrumbList> </Breadcrumb> <div> <h1 className="text-2xl font-bold">Editar contacto</h1> <p className="text-sm text-muted-foreground mt-0.5">{contacto.nombre}</p> </div> <ContactoForm contactoId={id} defaultValues={defaultValues} /> </div> );
}
