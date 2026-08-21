"""
Prepara los datos de los archivos Excel para importar a Ferretería AP.
Genera 3 archivos JSON: suppliers.json, clients.json, products.json
"""
import pandas as pd
import json
import math
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DESKTOP = os.path.expanduser("~/Desktop")

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def formatear_rnc(valor):
    """Formatea RNC o cédula. Retorna None si no tiene formato válido."""
    if valor is None or (isinstance(valor, float) and math.isnan(valor)):
        return None
    num = str(int(float(valor))).strip()
    if len(num) == 9:
        # RNC: X-XX-XXXXX-X
        return f"{num[0]}-{num[1:3]}-{num[3:8]}-{num[8]}"
    elif len(num) == 11:
        # Cédula: XXX-XXXXXXX-X
        return f"{num[0:3]}-{num[3:10]}-{num[10]}"
    else:
        return None  # error de digitación, omitir

def map_unidad(unidad):
    mapeo = {
        "Unidades": "UND",
        "M2": "M2",
        "M3": "M3",
        "Pie": "PIE",
        "Atado": "ATADO",
    }
    return mapeo.get(str(unidad).strip(), "UND")

def limpiar_str(valor):
    if valor is None or (isinstance(valor, float) and math.isnan(valor)):
        return None
    return str(valor).strip() or None

def limpiar_float(valor):
    if valor is None or (isinstance(valor, float) and math.isnan(valor)):
        return None
    return float(valor)

# ─── SUPLIDORES ───────────────────────────────────────────────────────────────

df_sup = pd.read_excel(f"{DESKTOP}/Contactos Ferreteria AP.xlsx", sheet_name="SUPLIDOR")

suppliers = []
for _, row in df_sup.iterrows():
    nombre = limpiar_str(row.get("Nombre en pantalla"))
    if not nombre:
        continue
    rnc = formatear_rnc(row.get("Rnc"))
    email = limpiar_str(row.get("Correo electrónico"))
    telefono = limpiar_str(row.get("Teléfono"))
    direccion = limpiar_str(row.get("Direccion"))

    suppliers.append({
        "tipo": "SUPLIDOR",
        "nombre": nombre,
        "rnc": rnc,
        "email": email,
        "telefono": telefono,
        "direccion": direccion,
    })

print(f"✓ Suplidores: {len(suppliers)}")

# ─── CLIENTES ─────────────────────────────────────────────────────────────────

df_cli = pd.read_excel(f"{DESKTOP}/Contactos Ferreteria AP.xlsx", sheet_name="CLIENTES")

clients = []
seen_names = set()
for _, row in df_cli.iterrows():
    nombre = limpiar_str(row.get("Nombre"))
    if not nombre or nombre in seen_names:
        continue
    seen_names.add(nombre)
    clients.append({
        "tipo": "CLIENTE",
        "nombre": nombre,
    })

print(f"✓ Clientes: {len(clients)}")

# ─── PRODUCTOS ────────────────────────────────────────────────────────────────

xl = pd.ExcelFile(f"{DESKTOP}/Inventario Ferreteria AP.xlsx")

# Mapeo hoja → código de categoría
CATEGORIA_MAP = {
    "Ferreteria":  "FT",
    "Plomería":    "PL",
    "Electricidad": "ET",
    "Construcción": "CTC",
}

products = []

for sheet in xl.sheet_names:
    cat_code = CATEGORIA_MAP.get(sheet)
    if not cat_code:
        print(f"  ⚠ Hoja desconocida: {sheet}")
        continue

    df = pd.read_excel(f"{DESKTOP}/Inventario Ferreteria AP.xlsx", sheet_name=sheet, header=1)
    df.columns = ["codigo", "nombre", "costo", "precio", "ganancia", "unidad"]
    df = df.dropna(subset=["codigo", "nombre"])

    count = 0
    for _, row in df.iterrows():
        codigo = limpiar_str(row["codigo"])
        nombre = limpiar_str(row["nombre"])
        costo_raw = limpiar_float(row["costo"])
        precio_raw = limpiar_float(row["precio"])
        ganancia_raw = limpiar_float(row["ganancia"])
        unidad = map_unidad(row.get("unidad", "Unidades"))

        if not codigo or not nombre or costo_raw is None or precio_raw is None:
            continue

        # Costo SIN ITBIS (el Excel tiene costo con ITBIS incluido)
        costo_sin_itbis = round(costo_raw / 1.18, 4)

        # Precio de venta CON ITBIS (se mantiene tal cual)
        precio_venta = round(precio_raw, 2)

        # % ganancia: Excel trae fracción (0.41), el sistema guarda porcentaje (41.03)
        # Límite: Decimal(5,2) → máximo 999.99
        if ganancia_raw is None or math.isnan(ganancia_raw):
            ganancia_pct = 30.0
        else:
            ganancia_pct = round(min(ganancia_raw * 100, 999.99), 2)

        products.append({
            "codigo": codigo,
            "nombre": nombre,
            "categoriaCode": cat_code,
            "costoSinItbis": costo_sin_itbis,
            "precioVenta": precio_venta,
            "porcentajeGanancia": ganancia_pct,
            "unidadMedida": unidad,
        })
        count += 1

    print(f"  ✓ {sheet} ({cat_code}): {count} productos")

print(f"✓ Total productos: {len(products)}")

# ─── GUARDAR JSON ─────────────────────────────────────────────────────────────

with open(f"{BASE_DIR}/suppliers.json", "w", encoding="utf-8") as f:
    json.dump(suppliers, f, ensure_ascii=False, indent=2)

with open(f"{BASE_DIR}/clients.json", "w", encoding="utf-8") as f:
    json.dump(clients, f, ensure_ascii=False, indent=2)

with open(f"{BASE_DIR}/products.json", "w", encoding="utf-8") as f:
    json.dump(products, f, ensure_ascii=False, indent=2)

print("\n✅ JSON generados en scripts/import-data/")
