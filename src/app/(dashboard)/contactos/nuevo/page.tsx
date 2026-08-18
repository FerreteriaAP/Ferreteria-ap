import { ContactoForm } from "@/components/contactos/contacto-form";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export default function NuevoContactoPage() {
 return (
 <div className="space-y-5"> <Breadcrumb> <BreadcrumbList> <BreadcrumbItem> <BreadcrumbLink href="/contactos">Contactos</BreadcrumbLink> </BreadcrumbItem> <BreadcrumbSeparator /> <BreadcrumbItem> <BreadcrumbPage>Nuevo contacto</BreadcrumbPage> </BreadcrumbItem> </BreadcrumbList> </Breadcrumb> <div> <h1 className="text-2xl font-bold">Nuevo contacto</h1> <p className="text-sm text-muted-foreground mt-0.5">Cliente, suplidor o ambos</p> </div> <ContactoForm /> </div> );
}
