import { VendedorGuard } from "@/components/vendedor/vendedor-guard";

export default function VentasLayout({ children }: { children: React.ReactNode }) {
 return <VendedorGuard modulo="Ventas">{children}</VendedorGuard>;
}
