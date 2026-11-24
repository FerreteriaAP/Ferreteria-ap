"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
 Sidebar,
 SidebarContent,
 SidebarFooter,
 SidebarGroup,
 SidebarGroupContent,
 SidebarGroupLabel,
 SidebarHeader,
 SidebarMenu,
 SidebarMenuButton,
 SidebarMenuItem,
 SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
 LayoutDashboard,
 FileText,
 CreditCard,
 Package,
 Tag,
 Bell,
 ClipboardList,
 ShoppingCart,
 ArrowUpFromLine,
 Landmark,
 Receipt,
 Users,
 Briefcase,
 KeyRound,
 Settings,
 Wrench,
 TrendingUp,
 BookOpen,
 BarChart3,
 Calculator,
 Monitor,
 Vault,
} from "lucide-react";

const navItems = [
 {
 group: "Principal",
 items: [
 { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
 ],
 },
 {
 group: "Ventas",
 items: [
 { label: "Punto de Venta", href: "/pdv", icon: Monitor },
 { label: "Caja", href: "/caja", icon: Vault },
 { label: "Ventas / Cotizaciones", href: "/ventas", icon: FileText },
 ],
 },
 {
 group: "Inventario",
 items: [
 { label: "Productos", href: "/productos", icon: Package },
 { label: "Categorías", href: "/categorias", icon: Tag },
 { label: "Alertas", href: "/alertas", icon: Bell },
 ],
 },
 {
 group: "Compras",
 items: [
 { label: "Órdenes de Compra", href: "/ordenes-compra", icon: ClipboardList },
 { label: "Compras", href: "/compras", icon: ShoppingCart },
 ],
 },
 {
 group: "Contabilidad",
 items: [
 { label: "Resumen", href: "/contabilidad", icon: BookOpen },
 { label: "CxC", href: "/contabilidad/cxc", icon: CreditCard },
 { label: "CxP", href: "/contabilidad/cxp", icon: ArrowUpFromLine },
 { label: "Analíticas", href: "/contabilidad/analiticas", icon: BarChart3 },
 { label: "Impuestos", href: "/contabilidad/impuestos", icon: Calculator },
 { label: "Gastos", href: "/contabilidad/gastos", icon: Receipt },
 ],
 },
 {
 group: "Finanzas",
 items: [
 { label: "Bancos", href: "/bancos", icon: Landmark },
 { label: "Nóminas", href: "/nominas", icon: TrendingUp },
 ],
 },
 {
 group: "Administración",
 items: [
 { label: "Contactos", href: "/contactos", icon: Users },
 { label: "Empleados", href: "/empleados", icon: Briefcase },
 { label: "Usuarios", href: "/usuarios", icon: KeyRound },
 { label: "Configuración",href: "/configuracion",icon: Settings },
 ],
 },
];

const rolLabel: Record<string, string> = {
 ADMINISTRADOR: "Administrador",
 ASISTENTE_ADMINISTRATIVO: "Asistente Admin.",
 VENDEDOR: "Vendedor",
 CAJA: "Caja",
};

interface AppSidebarProps {
 user?: {
 name?: string | null;
 email?: string | null;
 rol?: string;
 };
}

export function AppSidebar({ user }: AppSidebarProps) {
 const pathname = usePathname();

 const initials = user?.name
 ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
 : "AP";

 return (
 <Sidebar> {/* Header: logo y nombre */}
 <SidebarHeader className="border-b border-sidebar-border px-4 py-4"> <div className="flex items-center gap-3"> <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary"> <Wrench className="h-4 w-4 text-sidebar-primary-foreground" /> </div> <div> <p className="text-sm font-semibold leading-none text-sidebar-foreground"> Ferretería AP
 </p> <p className="mt-0.5 text-xs text-sidebar-foreground/60"> Sistema de Gestión
 </p> </div> </div> </SidebarHeader> {/* Navegación */}
 <SidebarContent> {navItems.map((group) => (
 <SidebarGroup key={group.group}> <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest font-semibold"> {group.group}
 </SidebarGroupLabel> <SidebarGroupContent> <SidebarMenu> {group.items.map((item) => {
 const isActive =
 pathname === item.href ||
 pathname.startsWith(item.href + "/");
 const Icon = item.icon;
 return (
 <SidebarMenuItem key={item.href}> <SidebarMenuButton
 isActive={isActive}
 render={<Link href={item.href} />}
 className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground" > <Icon className="h-4 w-4 shrink-0" /> <span>{item.label}</span> </SidebarMenuButton> </SidebarMenuItem> );
 })}
 </SidebarMenu> </SidebarGroupContent> </SidebarGroup> ))}
 </SidebarContent> <SidebarSeparator className="bg-sidebar-border" /> {/* Footer: usuario */}
 <SidebarFooter className="px-3 py-3"> <div className="flex items-center gap-3"> <Avatar className="h-8 w-8 shrink-0"> <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground"> {initials}
 </AvatarFallback> </Avatar> <div className="flex-1 min-w-0"> <p className="text-sm font-medium leading-none text-sidebar-foreground truncate"> {user?.name ?? "Usuario"}
 </p> <p className="mt-0.5 text-xs text-sidebar-foreground/60 truncate"> {rolLabel[user?.rol ?? ""] ?? user?.rol ?? ""}
 </p> </div> {user?.rol === "ADMINISTRADOR" && (
 <Badge variant="outline" className="text-[10px] shrink-0 border-sidebar-border text-sidebar-foreground/70"> Admin
 </Badge> )}
 </div> </SidebarFooter> </Sidebar> );
}
