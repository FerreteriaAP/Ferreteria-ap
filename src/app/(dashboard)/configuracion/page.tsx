import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { TemaSelector } from "@/components/configuracion/tema-selector";
import { EmpresaForm, CuentasBancariasPanel } from "@/components/configuracion/empresa-form";
import { UsuariosPanel } from "@/components/configuracion/usuarios-panel";
import { getEmpresaConfig, getCuentasBancarias } from "@/actions/empresa";
import { getUsuarios } from "@/actions/usuarios";
import { Palette, Building2, Users } from "lucide-react";

const TEMAS_VALIDOS = ["dark-ops", "gris-claro", "azul-metal", "dark-multicolor", "carbon"];

async function getConfig() {
 const jar = await cookies();
 const cookieTema = jar.get("ap-tema")?.value;

 const [empleados, contactos, productos, usuarios, temaConfig] = await Promise.all([
 prisma.empleado.count(),
 prisma.contacto.count(),
 prisma.producto.count(),
 prisma.usuario.count(),
 prisma.configuracion.findUnique({ where: { clave: "TEMA_ACTIVO" } }),
 ]);
 return {
 empleados,
 contactos,
 productos,
 usuarios,
 // Cookie tiene prioridad (tema por usuario), fallback a DB global
 temaActual: (cookieTema && TEMAS_VALIDOS.includes(cookieTema))
   ? cookieTema
   : (temaConfig?.valor ?? "dark-ops"),
 };
}

export default async function ConfiguracionPage() {
 const session = await auth();
 const rol = (session?.user as { rol?: string })?.rol ?? "";
 const esAdmin = rol === "ADMINISTRADOR";

 const [stats, datosEmpresa, cuentasBancarias, usuarios] = await Promise.all([
 getConfig(),
 getEmpresaConfig(),
 getCuentasBancarias(),
 getUsuarios(),
 ]);

 return (
 <div className="space-y-6 max-w-4xl"> <div> <h1 className="text-2xl font-bold">Configuración</h1> <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}> Parámetros generales del sistema
 </p> </div> {/* Selector de tema — solo admin */}
 {esAdmin && (
 <div
 className="rounded-2xl p-6" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}
 > <div className="flex items-center gap-3 mb-5"> <div
 className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(var(--primary-rgb, 244 119 23) / 0.12)" }}
 > <Palette size={16} style={{ color: "var(--primary)" }} /> </div> <div> <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}> Tema visual del sistema
 </h2> <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}> Cambia el aspecto para todos los usuarios · 5 temas disponibles
 </p> </div> </div> <TemaSelector temaActual={stats.temaActual} /> </div> )}

 {/* Datos de la empresa — solo admin */}
 {esAdmin && (
 <div
 className="rounded-2xl p-6" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}
 > <div className="flex items-center gap-3 mb-5"> <div
 className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(var(--primary-rgb, 244 119 23) / 0.12)" }}
 > <Building2 size={16} style={{ color: "var(--primary)" }} /> </div> <div> <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}> Datos de la empresa
 </h2> <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}> Información que aparece en facturas, conduces, nóminas y reportes
 </p> </div> </div> <EmpresaForm datos={datosEmpresa} />
        <div className="border-t mt-6 pt-6">
          <CuentasBancariasPanel
            cuentasIniciales={cuentasBancarias.map(c => ({ ...c, saldo: Number(c.saldo) }))}
          />
        </div>
      </div>
    )}

 {/* Info del sistema */}
 <div
 className="rounded-2xl p-6" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}
 > <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--foreground)" }}> Información del sistema
 </h2> <div className="grid grid-cols-2 gap-4"> {[
 { label: "Empresa", value: "Ferretería AP" },
 { label: "País", value: "República Dominicana" },
 { label: "Moneda", value: "Peso Dominicano (RD$)" },
 { label: "ITBIS", value: "18%" },
 ].map((item) => (
 <div key={item.label}> <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{item.label}</p> <p className="font-medium text-sm mt-0.5" style={{ color: "var(--foreground)" }}>{item.value}</p> </div> ))}
 </div> </div> {/* Resumen de datos */}
 <div
 className="rounded-2xl p-6" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}
 > <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--foreground)" }}> Resumen de datos
 </h2> <div className="grid grid-cols-4 gap-3"> {[
 { label: "Empleados", value: stats.empleados },
 { label: "Contactos", value: stats.contactos },
 { label: "Productos", value: stats.productos },
 { label: "Usuarios", value: stats.usuarios },
 ].map((s) => (
 <div
 key={s.label}
 className="rounded-xl p-4 text-center" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
 > <p className="text-2xl font-bold" style={{ color: "var(--primary)" }}>{s.value}</p> <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{s.label}</p> </div> ))}
 </div> </div> {/* Gestión de usuarios inline */}
 {esAdmin && (
 <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}>
   <div className="px-6 py-4 border-b flex items-center gap-3" style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 4%, var(--card))" }}>
     <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "color-mix(in oklch, var(--accent-hex) 12%, transparent)" }}>
       <Users size={16} style={{ color: "var(--accent-hex)" }} />
     </div>
     <div>
       <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>Gestión de usuarios</h2>
       <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} registrado{usuarios.length !== 1 ? "s" : ""}</p>
     </div>
   </div>
   <div className="p-6">
     <UsuariosPanel usuarios={usuarios} />
   </div>
 </div>
 )}

 {/* Parámetros nómina */}
 <div
 className="rounded-2xl p-6" style={{ backgroundColor: "var(--panel)", border: "1px solid var(--border)" }}
 > <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--foreground)" }}> Parámetros de nómina (TSS 2024)
 </h2> <div className="space-y-2 text-sm"> {[
 { concepto: "AFP empleado", tasa: "2.87%" },
 { concepto: "AFP empleador", tasa: "7.10%" },
 { concepto: "SFS empleado", tasa: "3.04%" },
 { concepto: "SFS empleador", tasa: "7.09%" },
 { concepto: "SAM quincenal", tasa: "RD$ 1,000" },
 ].map((p) => (
 <div
 key={p.concepto}
 className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}
 > <span style={{ color: "var(--muted-foreground)" }}>{p.concepto}</span> <span className="font-medium" style={{ color: "var(--foreground)" }}>{p.tasa}</span> </div> ))}
 </div> </div> </div> );
}
