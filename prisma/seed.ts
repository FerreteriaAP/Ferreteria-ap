import { PrismaClient, Rol, CategoriaInventario, TipoCuentaBancaria } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed...");

  // -------------------------------------------
  // Usuario Administrador
  // -------------------------------------------
  const passwordHash = await bcrypt.hash("Admin2024!", 12);

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@ferreteria-ap.com" },
    update: {},
    create: {
      email: "admin@ferreteria-ap.com",
      password: passwordHash,
      nombre: "Administrador",
      apellido: "Sistema",
      rol: Rol.ADMINISTRADOR,
      activo: true,
    },
  });
  console.log("✅ Usuario admin creado:", admin.email);

  // -------------------------------------------
  // Categorías de Inventario
  // -------------------------------------------
  const categorias = [
    { id: "CTC", codigo: CategoriaInventario.CTC, nombre: "Construcción", descripcion: "Materiales de construcción en general" },
    { id: "FT",  codigo: CategoriaInventario.FT,  nombre: "Ferretería", descripcion: "Herramientas y ferretería" },
    { id: "ET",  codigo: CategoriaInventario.ET,  nombre: "Eléctrico",  descripcion: "Materiales y equipos eléctricos" },
    { id: "PL",  codigo: CategoriaInventario.PL,  nombre: "Plomería", descripcion: "Materiales de plomería y fontanería" },
  ];

  for (const cat of categorias) {
    await prisma.categoria.upsert({
      where: { id: cat.id },
      update: { nombre: cat.nombre },
      create: cat,
    });
  }
  console.log("✅ Categorías de inventario creadas");

  // -------------------------------------------
  // Secuencias de Documentos
  // -------------------------------------------
  const secuencias = [
    { tipo: "COTIZACION",    prefijo: "COT",      digitos: 5 },
    { tipo: "ORDEN_VENTA",   prefijo: "OV",       digitos: 5 },
    { tipo: "CONDUCE_OUT",   prefijo: "CDC/OUT/",  digitos: 5 },
    { tipo: "CONDUCE_IN",    prefijo: "CDC/IN/",   digitos: 5 },
    { tipo: "FACTURA",       prefijo: "FAC",      digitos: 5 },
    { tipo: "COMPRA",        prefijo: "COMP",     digitos: 5 },
    { tipo: "ORDEN_COMPRA",  prefijo: "OC",       digitos: 5 },
    { tipo: "GASTO",         prefijo: "GAS",      digitos: 5 },
    { tipo: "NOMINA",        prefijo: "NOM",      digitos: 5 },
  ];

  for (const seq of secuencias) {
    await prisma.secuenciaDocumento.upsert({
      where: { tipo: seq.tipo },
      update: {},
      create: { ...seq, siguiente: 1 },
    });
  }
  console.log("✅ Secuencias de documentos creadas");

  // -------------------------------------------
  // Categorías de Gastos
  // -------------------------------------------
  const categoriasGasto = [
    { nombre: "Alquiler",            tipo: "FIJO"     as const },
    { nombre: "Electricidad",        tipo: "VARIABLE" as const },
    { nombre: "Agua",                tipo: "VARIABLE" as const },
    { nombre: "Teléfono / Internet", tipo: "FIJO"     as const },
    { nombre: "Combustible",         tipo: "VARIABLE" as const },
    { nombre: "Mantenimiento",       tipo: "VARIABLE" as const },
    { nombre: "Limpieza",            tipo: "VARIABLE" as const },
    { nombre: "Publicidad",          tipo: "VARIABLE" as const },
    { nombre: "Seguros",             tipo: "FIJO"     as const },
    { nombre: "Servicios Contables", tipo: "FIJO"     as const },
    { nombre: "Papelería / Oficina", tipo: "VARIABLE" as const },
    { nombre: "Transportación",      tipo: "VARIABLE" as const },
    { nombre: "Otros",               tipo: "VARIABLE" as const },
  ];

  for (const cat of categoriasGasto) {
    await prisma.categoriaGasto.upsert({
      where: { nombre: cat.nombre },
      update: {},
      create: cat,
    });
  }
  console.log("✅ Categorías de gastos creadas");

  // -------------------------------------------
  // Cuentas Bancarias
  // -------------------------------------------
  const cuentasBancarias = [
    { banco: "Banco Popular Dominicano", nombre: "Cuenta Corriente Principal", numero: "****", tipo: TipoCuentaBancaria.CORRIENTE },
    { banco: "BHD León",                banco2: "BHD León", nombre: "Cuenta BHD",                 numero: "****", tipo: TipoCuentaBancaria.CORRIENTE },
  ];

  for (const c of [
    { banco: "Banco Popular Dominicano", nombre: "Cuenta Corriente Principal", numero: "****", tipo: TipoCuentaBancaria.CORRIENTE },
    { banco: "BHD León",                nombre: "Cuenta BHD",                  numero: "****", tipo: TipoCuentaBancaria.CORRIENTE },
  ]) {
    const existe = await prisma.cuentaBancaria.findFirst({
      where: { banco: c.banco, nombre: c.nombre },
    });
    if (!existe) await prisma.cuentaBancaria.create({ data: c });
  }
  console.log("✅ Cuentas bancarias creadas (Banco Popular y BHD)");

  // -------------------------------------------
  // Configuración General
  // -------------------------------------------
  const configs = [
    { clave: "empresa_nombre",       valor: "Ferretería AP", descripcion: "Nombre de la empresa" },
    { clave: "empresa_rnc",          valor: "",              descripcion: "RNC de la empresa" },
    { clave: "empresa_telefono",     valor: "",              descripcion: "Teléfono principal" },
    { clave: "empresa_email",        valor: "",              descripcion: "Email de la empresa" },
    { clave: "empresa_direccion",    valor: "",              descripcion: "Dirección de la empresa" },
    { clave: "itbis_porcentaje",     valor: "18",            descripcion: "Porcentaje de ITBIS (18%)" },
    { clave: "moneda",               valor: "DOP",           descripcion: "Moneda (DOP = Peso Dominicano)" },
    { clave: "dias_credito_default", valor: "30",            descripcion: "Días de crédito por defecto" },
    { clave: "stock_alerta_email",   valor: "",              descripcion: "Email para alertas de stock mínimo" },
  ];

  for (const conf of configs) {
    await prisma.configuracion.upsert({
      where: { clave: conf.clave },
      update: {},
      create: conf,
    });
  }
  console.log("✅ Configuración general creada");

  console.log("\n🎉 Seed completado exitosamente!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 Admin:    admin@ferreteria-ap.com");
  console.log("🔑 Password: Admin2024!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
