/**
 * Generador mínimo de archivos Excel (.xlsx) sin dependencias.
 * Un .xlsx es un ZIP con XML; aquí se arma con el método "store" (sin
 * compresión), suficiente para reportes de miles de filas. Celdas de texto
 * (inlineStr) y numéricas con 2 decimales; fila de encabezado en negrita.
 */

export type CeldaXlsx = string | number | null | undefined;

export interface HojaXlsx {
  nombre: string;             // máx. 31 caracteres, sin : \ / ? * [ ]
  encabezados: string[];
  filas: CeldaXlsx[][];
  /** Índices (desde 0) de columnas que deben ir como texto aunque parezcan números (RNC, NCF, fechas). */
  columnasTexto?: number[];
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    // caracteres de control no válidos en XML
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

function colLetra(i: number): string {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function hojaXml(h: HojaXlsx): string {
  const texto = new Set(h.columnasTexto ?? []);
  const filas: string[] = [];
  const celdaTexto = (ref: string, v: string, estilo: number) =>
    `<c r="${ref}" t="inlineStr"${estilo ? ` s="${estilo}"` : ""}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;

  filas.push(`<row r="1">${h.encabezados.map((e, i) => celdaTexto(`${colLetra(i)}1`, e, 1)).join("")}</row>`);
  h.filas.forEach((fila, fi) => {
    const r = fi + 2;
    const celdas = fila.map((v, ci) => {
      const ref = `${colLetra(ci)}${r}`;
      if (v === null || v === undefined || v === "") return "";
      if (typeof v === "number" && !texto.has(ci)) {
        return Number.isFinite(v) ? `<c r="${ref}" s="2"><v>${v}</v></c>` : "";
      }
      return celdaTexto(ref, String(v), 0);
    });
    filas.push(`<row r="${r}">${celdas.join("")}</row>`);
  });

  const ancho = h.encabezados.map((e, i) => {
    const max = Math.max(e.length, ...h.filas.slice(0, 500).map((f) => String(f[i] ?? "").length));
    return `<col min="${i + 1}" max="${i + 1}" width="${Math.min(45, Math.max(10, max + 2))}" customWidth="1"/>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${ancho}</cols><sheetData>${filas.join("")}</sheetData></worksheet>`;
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

// ── ZIP (método store) ───────────────────────────────────────────────────────

const CRC_TABLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLA[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(archivos: { nombre: string; datos: Buffer }[]): Buffer {
  const partes: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  // Fecha DOS fija: 2026-01-01 00:00
  const dosFecha = ((2026 - 1980) << 9) | (1 << 5) | 1;
  for (const a of archivos) {
    const nombre = Buffer.from(a.nombre, "utf8");
    const crc = crc32(a.datos);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);       // versión necesaria
    local.writeUInt16LE(0x0800, 6);   // nombres en UTF-8
    local.writeUInt16LE(0, 8);        // método: store
    local.writeUInt16LE(0, 10);       // hora
    local.writeUInt16LE(dosFecha, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(a.datos.length, 18);
    local.writeUInt32LE(a.datos.length, 22);
    local.writeUInt16LE(nombre.length, 26);
    local.writeUInt16LE(0, 28);
    partes.push(local, nombre, a.datos);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(dosFecha, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(a.datos.length, 20);
    cd.writeUInt32LE(a.datos.length, 24);
    cd.writeUInt16LE(nombre.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nombre);
    offset += 30 + nombre.length + a.datos.length;
  }
  const cdBuf = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(archivos.length, 8);
  fin.writeUInt16LE(archivos.length, 10);
  fin.writeUInt32LE(cdBuf.length, 12);
  fin.writeUInt32LE(offset, 16);
  return Buffer.concat([...partes, cdBuf, fin]);
}

/** Arma el libro de Excel con una o más hojas. */
export function crearXlsx(hojas: HojaXlsx[]): Buffer {
  const nombres = hojas.map((h, i) => (h.nombre.replace(/[:\\/?*[\]]/g, " ").slice(0, 31) || `Hoja${i + 1}`));
  const tipos = hojas.map((_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const archivos = [
    { nombre: "[Content_Types].xml", texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${tipos}</Types>` },
    { nombre: "_rels/.rels", texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nombre: "xl/workbook.xml", texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nombres.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>` },
    { nombre: "xl/_rels/workbook.xml.rels", texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { nombre: "xl/styles.xml", texto: ESTILOS },
    ...hojas.map((h, i) => ({ nombre: `xl/worksheets/sheet${i + 1}.xml`, texto: hojaXml(h) })),
  ];
  return zip(archivos.map((a) => ({ nombre: a.nombre, datos: Buffer.from(a.texto, "utf8") })));
}
