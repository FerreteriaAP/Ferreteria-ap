import { VendedorGuard } from "@/components/vendedor/vendedor-guard";

export default function PdvLayout({ children }: { children: React.ReactNode }) {
 return <VendedorGuard modulo="Punto de Venta">{children}</VendedorGuard>;
}
