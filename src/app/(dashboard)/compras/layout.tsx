import { VendedorGuard } from "@/components/vendedor/vendedor-guard";

export default function ComprasLayout({ children }: { children: React.ReactNode }) {
 return <VendedorGuard modulo="Compras">{children}</VendedorGuard>;
}
