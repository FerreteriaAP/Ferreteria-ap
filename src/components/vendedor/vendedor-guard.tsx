import { auth } from "@/lib/auth";
import { getVendedorActivoId, getVendedoresConStats } from "@/actions/vendedor-activo";
import { VendedorSelector } from "./vendedor-selector";
import { BannerVendedor } from "./banner-vendedor";

interface Props {
 children: React.ReactNode;
 modulo: string; // "Ventas" | "Punto de Venta" | "Compras"
}

export async function VendedorGuard({ children, modulo }: Props) {
 const session = await auth();
 const rol = (session?.user as { rol?: string })?.rol ?? "";

 // Administrador y Asistente acceden directo, sin selector
 if (rol === "ADMINISTRADOR" || rol === "ASISTENTE_ADMINISTRATIVO") {
 return <>{children}</>;
 }

 const [activoId, vendedores] = await Promise.all([
 getVendedorActivoId(),
 getVendedoresConStats(),
 ]);

 // Sin vendedor seleccionado  mostrar picker
 if (!activoId) {
 return (
 <VendedorSelector
 vendedores={vendedores}
 titulo={`¿Quién va a operar ${modulo}?`}
 descripcion="Selecciona tu perfil — la sesión dura 8 horas" /> );
 }

 const activo = vendedores.find((v) => v.id === activoId);

 // Si el ID guardado ya no existe (usuario eliminado)  limpiar y mostrar picker
 if (!activo) {
 return (
 <VendedorSelector
 vendedores={vendedores}
 titulo={`¿Quién va a operar ${modulo}?`}
 descripcion="Selecciona tu perfil — la sesión dura 8 horas" /> );
 }

 return (
 <div className="space-y-4"> <BannerVendedor vendedor={activo} vendedores={vendedores} /> {children}
 </div> );
}
