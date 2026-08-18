import { getSuplidores } from "@/actions/compras";
import { OcForm } from "@/components/ordenes-compra/oc-form";

export const metadata = { title: "Nueva orden de compra" };

export default async function NuevaOrdenCompraPage() {
 const suplidores = await getSuplidores();
 return (
 <div className="space-y-5"> <div> <h1 className="text-2xl font-bold">Nueva orden de compra</h1> <p className="text-sm text-muted-foreground mt-1"> Crea una solicitud de compra a un suplidor. Una vez confirmada la recepción se generará la compra automáticamente.
 </p> </div> <OcForm suplidores={suplidores} /> </div> );
}
