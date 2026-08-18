// Helper puro — sin "use server", solo cálculo de rangos de fecha

export interface RangoParams {
 tipo:   string;  // "dia" | "semana" | "quincena" | "mes" | "rango"
 fecha?: string;  // YYYY-MM-DD — para dia / semana
 mes?: string; // YYYY-MM — para quincena / mes
 q?: string; // "1" | "2" — para quincena
 desde?: string; // YYYY-MM-DD — para rango
 hasta?: string; // YYYY-MM-DD — para rango
}

export function rangoFechas(p: RangoParams): { desde: Date; hasta: Date; label: string } {
 const hoy = new Date();
 const todayStr = hoy.toISOString().slice(0, 10);

 switch (p.tipo) {

 // Día específico 
 case "dia": {
 const base = new Date((p.fecha ?? todayStr) + "T00:00:00");
 const desde = new Date(base); desde.setHours(0, 0, 0, 0);
 const hasta = new Date(base); hasta.setHours(23, 59, 59, 999);
 const label = base.toLocaleDateString("es-DO", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
 return { desde, hasta, label };
 }

 // Últimos 7 días desde una fecha 
 case "semana": {
 const fin = new Date((p.fecha ?? todayStr) + "T23:59:59");
 const ini = new Date(fin); ini.setDate(fin.getDate() - 6); ini.setHours(0, 0, 0, 0);
 const label = `${ini.toLocaleDateString("es-DO", { day: "2-digit", month: "short" })} – ${fin.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}`;
 return { desde: ini, hasta: fin, label };
 }

 // Quincena de cualquier mes 
 case "quincena": {
 const [y, m] = parseMes(p.mes ?? todayStr.slice(0, 7));
 const q = p.q === "2" ? 2 : 1;
 const desde = q === 1 ? new Date(y, m, 1) : new Date(y, m, 16);
 const hasta = q === 1
 ? new Date(y, m, 15, 23, 59, 59, 999)
 : new Date(y, m + 1, 0, 23, 59, 59, 999);
 const mesLabel = desde.toLocaleString("es-DO", { month: "long", year: "numeric" });
 return { desde, hasta, label: `${q}ª quincena de ${mesLabel}` };
 }

 // Mes completo 
 case "mes": {
 const [y, m] = parseMes(p.mes ?? todayStr.slice(0, 7));
 const desde = new Date(y, m, 1);
 const hasta = new Date(y, m + 1, 0, 23, 59, 59, 999);
 const label = desde.toLocaleString("es-DO", { month: "long", year: "numeric" });
 return { desde, hasta, label };
 }

 // Rango libre 
 case "rango": {
 const dStr = p.desde ?? todayStr;
 const hStr = p.hasta ?? todayStr;
 const desde = new Date(dStr + "T00:00:00");
 const hasta = new Date(hStr + "T23:59:59");
 const fmt = (d: Date) => d.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
 return { desde, hasta, label: `${fmt(desde)} — ${fmt(hasta)}` };
 }

 // Fallback: mes actual 
 default: {
 const [y, m] = parseMes(todayStr.slice(0, 7));
 const desde = new Date(y, m, 1);
 const hasta = new Date(y, m + 1, 0, 23, 59, 59, 999);
 return { desde, hasta, label: desde.toLocaleString("es-DO", { month: "long", year: "numeric" }) };
 }
 }
}

// Helper interno 

function parseMes(mes: string): [number, number] {
 // mes = "YYYY-MM"
 const [y, m] = mes.split("-").map(Number);
 return [y, m - 1]; // month 0-based
}
