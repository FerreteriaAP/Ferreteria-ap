/**
 * Cliente del Conector e-CF (KRP Consulting). Solo se usa en el servidor:
 * server actions, server components y route handlers. Nunca desde el navegador.
 *
 * El conector corre en el mismo servidor (127.0.0.1:8085), asigna el e-NCF,
 * firma, envía a la DGII y devuelve e-NCF, código de seguridad, QR y estado.
 * Contrato completo: API.md del paquete krp_ecf_conector.
 *
 * Variables de entorno (.env, nunca en git):
 *   ECF_ACTIVO=true|false   interruptor general; con false todo funciona como antes
 *   ECF_URL=http://127.0.0.1:8085
 *   ECF_API_KEY=...         clave de [api] en C:\KRP_ECF\config\config.toml
 */

export function ecfActivo(): boolean {
  return process.env.ECF_ACTIVO === "true";
}

const BASE = () => (process.env.ECF_URL ?? "http://127.0.0.1:8085").replace(/\/$/, "");

export type EstadoEcf =
  | "firmado" | "en_proceso" | "aceptado" | "aceptado_condicional"
  | "pendiente_envio" | "verificar" | "rechazado" | "error_interno";

/** Estados que el conector todavía puede cambiar solo (hay que sincronizar). */
export const ESTADOS_EN_CURSO: EstadoEcf[] = ["firmado", "en_proceso", "pendiente_envio", "verificar"];
/** Estados que necesitan que alguien actúe. */
export const ESTADOS_ATENCION: EstadoEcf[] = ["rechazado", "verificar", "error_interno"];

export const TIPO_ECF_NOMBRE: Record<number, string> = {
  31: "Factura de Crédito Fiscal Electrónica",
  32: "Factura de Consumo Electrónica",
  33: "Nota de Débito Electrónica",
  34: "Nota de Crédito Electrónica",
  44: "Comprobante Electrónico para Regímenes Especiales",
  45: "Comprobante Electrónico Gubernamental",
};

export const ESTADO_ECF_LABEL: Record<string, string> = {
  firmado: "Firmado (enviando)",
  en_proceso: "En proceso en la DGII",
  aceptado: "Aceptado por la DGII",
  aceptado_condicional: "Aceptado condicional",
  pendiente_envio: "Pendiente de envío",
  verificar: "Verificar en la DGII",
  rechazado: "Rechazado por la DGII",
  error_interno: "Error del conector",
};

export interface LineaEcf {
  descripcion: string;
  cantidad: number;
  precio_unitario: number; // SIN ITBIS
  itbis: 18 | "exento";
  es_servicio?: boolean;
}

export interface DocumentoEcf {
  referencia: string;
  numero_interno?: string;
  tipo: 31 | 32 | 34 | 44 | 45;
  fecha_emision: string; // AAAA-MM-DD
  comprador?: { rnc?: string; nombre?: string; direccion?: string; correo?: string };
  pago?: {
    condicion: "contado" | "credito";
    fecha_limite?: string | null;
    formas?: { forma: string; monto: number }[];
  };
  lineas: LineaEcf[];
  documento_modificado?: { ncf: string; fecha: string; codigo_modificacion: 1 | 2 | 3; razon?: string };
  itbis_total?: number;
  total_esperado?: number;
}

export interface RespuestaEcf {
  referencia: string;
  tipo: number;
  tipo_nombre: string;
  encf: string;
  estado: EstadoEcf;
  estado_descripcion?: string;
  valido_fiscalmente?: boolean;
  codigo_seguridad: string;
  fecha_emision?: string;
  fecha_firma: string;
  fecha_vencimiento_secuencia: string | null;
  totales: { total: number; itbis_total: number };
  qr_url: string;
  mensajes: unknown[];
  encf_anteriores?: string[];
}

/** Error del conector con el código HTTP y los detalles para mostrar al usuario. */
export class ErrorEcf extends Error {
  constructor(message: string, public http: number, public detalles: string[] = []) {
    super(message);
  }
  /** true si el problema es de datos (422) o de estado (409): reintentar igual no sirve. */
  get esDeDatos() {
    return this.http === 422 || this.http === 409;
  }
}

async function llamar<T>(ruta: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const key = process.env.ECF_API_KEY;
  if (!key) throw new ErrorEcf("Falta ECF_API_KEY en el .env del servidor", 0);
  let r: Response;
  try {
    r = await fetch(`${BASE()}${ruta}`, {
      ...init,
      headers: { "Content-Type": "application/json", "X-API-Key": key, ...(init.headers ?? {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(init.timeoutMs ?? 60_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ErrorEcf(`El conector e-CF no responde en ${BASE()}: revisa que esté encendido (tarea "KRP Conector eCF" en el servidor) y la conexión. (${msg})`, 0);
  }
  const texto = await r.text();
  let data: unknown = null;
  try { data = texto ? JSON.parse(texto) : null; } catch { /* respuesta no JSON */ }
  if (!r.ok) {
    const d = (data ?? {}) as { error?: string; detalles?: string[] };
    throw new ErrorEcf(d.error ?? `Conector e-CF respondió ${r.status}`, r.status, d.detalles ?? []);
  }
  return data as T;
}

export function emitirECF(doc: DocumentoEcf, opts: { asincrono?: boolean } = {}) {
  return llamar<RespuestaEcf>(`/v1/documentos${opts.asincrono ? "?asincrono=true" : ""}`, {
    method: "POST",
    body: JSON.stringify(doc),
  });
}

export function consultarECF(referencia: string) {
  return llamar<RespuestaEcf>(`/v1/documentos/${encodeURIComponent(referencia)}`, { timeoutMs: 15_000 });
}

export function reintentarECF(referencia: string) {
  return llamar<RespuestaEcf>(`/v1/documentos/${encodeURIComponent(referencia)}/reintentar`, { method: "POST" });
}

export function reemitirECF(referencia: string, documento?: DocumentoEcf) {
  return llamar<RespuestaEcf>(`/v1/documentos/${encodeURIComponent(referencia)}/reemitir`, {
    method: "POST",
    body: JSON.stringify(documento ? { documento } : {}),
  });
}

export function saludECF() {
  return llamar<Record<string, unknown>>("/v1/salud", { timeoutMs: 5_000 });
}

/** SVG del QR, listo para incrustar en la impresión. null si el conector no responde. */
export async function qrSvgECF(referencia: string): Promise<string | null> {
  const key = process.env.ECF_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`${BASE()}/v1/documentos/${encodeURIComponent(referencia)}/qr.svg`, {
      headers: { "X-API-Key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!r.ok) return null;
    const svg = await r.text();
    return svg.trimStart().startsWith("<") ? svg : null;
  } catch {
    return null;
  }
}

/** Campos ecf* a guardar en Venta o NotaCredito a partir de la respuesta del conector. */
export function camposDesdeRespuesta(r: RespuestaEcf) {
  return {
    ecfTipo: r.tipo,
    ecfEncf: r.encf,
    ecfEstado: r.estado,
    ecfCodigoSeguridad: r.codigo_seguridad,
    ecfFechaFirma: r.fecha_firma,
    ecfFechaVencSecuencia: r.fecha_vencimiento_secuencia,
    ecfQrUrl: r.qr_url,
    ecfMensajes: (r.mensajes ?? []) as object,
    ecfError: null,
    ecfActualizado: new Date(),
  };
}
