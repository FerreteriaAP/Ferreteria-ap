import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getOrdenCompra } from "@/actions/ordenes-compra";
import { RecepcionOcForm } from "@/components/ordenes-compra/recepcion-oc-form";

export const metadata = { title: "Confirmar recepción" };

export default async function RecibirOcPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const oc = await getOrdenCompra(id);
 if (!oc) notFound();

 // Solo ENVIADA o RECIBIDA_PARCIAL pueden recibirse
 if (oc.estado !== "ENVIADA" && oc.estado !== "RECIBIDA_PARCIAL") {
 redirect(`/ordenes-compra/${id}`);
 }

 const items = oc.detalles.map((d) => ({
 id: d.id,
 productoId: d.productoId,
 nombre: d.producto.nombre,
 codigo: d.producto.codigo,
 unidad: d.producto.unidadMedida,
 cantidad: Number(d.cantidad),
 cantRecibida: Number(d.cantRecibida ?? 0),
 costo: Number(d.costo),
 }));

 // Filtra los que aún tienen pendiente
 const pendientes = items.filter((it) => it.cantidad - it.cantRecibida > 0);

 return (
 <div className="space-y-5"> <div> <Link href={`/ordenes-compra/${id}`} className="text-sm text-muted-foreground hover:text-foreground">  {oc.numero}
 </Link> <h1 className="text-2xl font-bold mt-1">Confirmar recepción</h1> <p className="text-sm text-muted-foreground mt-1"> Suplidor: <strong>{oc.suplidor.nombre}</strong> ·{" "}
 {pendientes.length} producto{pendientes.length !== 1 ? "s" : ""} pendiente{pendientes.length !== 1 ? "s" : ""}
 </p> </div> <RecepcionOcForm
 ordenId={id}
 suplidorId={oc.suplidorId}
 items={items}
 /> </div> );
}
