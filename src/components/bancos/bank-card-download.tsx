"use client";

interface CuentaCard {
  banco: string;
  nombre: string;
  numero: string;
  tipo: string;
}

interface Props {
  cuenta: CuentaCard;
}

// Dibuja la tarjeta en canvas y descarga como PNG
function drawCard(cuenta: CuentaCard): void {
  const W = 856;
  const H = 540;
  const R = 32; // border radius

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // --- Fondo con gradiente ---
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#1C1C1C");
  grad.addColorStop(0.55, "#2a1a0a");
  grad.addColorStop(1, "#3d1e00");
  ctx.fillStyle = grad;

  // Rounded rect
  ctx.beginPath();
  ctx.moveTo(R, 0);
  ctx.lineTo(W - R, 0);
  ctx.quadraticCurveTo(W, 0, W, R);
  ctx.lineTo(W, H - R);
  ctx.quadraticCurveTo(W, H, W - R, H);
  ctx.lineTo(R, H);
  ctx.quadraticCurveTo(0, H, 0, H - R);
  ctx.lineTo(0, R);
  ctx.quadraticCurveTo(0, 0, R, 0);
  ctx.closePath();
  ctx.fill();

  // --- Detalle decorativo: círculos translúcidos ---
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#F47717";
  ctx.beginPath();
  ctx.arc(W - 120, H - 100, 240, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W - 80, H - 80, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Línea naranja izquierda
  const lineGrad = ctx.createLinearGradient(0, 0, 0, H);
  lineGrad.addColorStop(0, "#F47717");
  lineGrad.addColorStop(1, "rgba(244,119,23,0)");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, 0, 5, H);

  // --- Octagon AP logo (top-left) ---
  drawLogoAP(ctx, 54, 52, 44);

  // --- "FERRETERÍA AP" junto al logo ---
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 26px Arial Black, Arial, sans-serif";
  ctx.letterSpacing = "1px";
  ctx.fillText("FERRETERÍA AP", 110, 58);
  ctx.font = "13px Arial, sans-serif";
  ctx.fillStyle = "#F47717";
  ctx.letterSpacing = "3px";
  ctx.fillText("HARDWARE & SUPPLIES", 112, 80);

  // --- Chip (decorativo) ---
  drawChip(ctx, 54, 170);

  // --- Número de cuenta ---
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 36px 'Courier New', monospace";
  ctx.letterSpacing = "4px";
  const numFormatted = formatAccountNumber(cuenta.numero);
  ctx.fillText(numFormatted, 54, 300);

  // --- Banco ---
  ctx.font = "bold 28px Arial, sans-serif";
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#F47717";
  ctx.fillText(cuenta.banco.toUpperCase(), 54, 365);

  // --- Labels bottom ---
  ctx.font = "11px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.letterSpacing = "2px";
  ctx.fillText("TITULAR", 54, 415);
  ctx.fillText("TIPO", 340, 415);

  // --- Valores bottom ---
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.letterSpacing = "0px";
  ctx.fillText(cuenta.nombre.toUpperCase(), 54, 440);
  ctx.fillText(cuenta.tipo, 340, 440);

  // --- Borde sutil ---
  ctx.save();
  ctx.strokeStyle = "rgba(244,119,23,0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(R, 0);
  ctx.lineTo(W - R, 0);
  ctx.quadraticCurveTo(W, 0, W, R);
  ctx.lineTo(W, H - R);
  ctx.quadraticCurveTo(W, H, W - R, H);
  ctx.lineTo(R, H);
  ctx.quadraticCurveTo(0, H, 0, H - R);
  ctx.lineTo(0, R);
  ctx.quadraticCurveTo(0, 0, R, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // --- Descargar ---
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuenta-${cuenta.banco.replace(/\s+/g, "-").toLowerCase()}-${cuenta.numero.slice(-4)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function formatAccountNumber(numero: string): string {
  const digits = numero.replace(/\D/g, "");
  if (digits.length >= 8) {
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }
  return numero;
}

function drawLogoAP(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const pts = 8;
  const angles = Array.from({ length: pts }, (_, i) => ((i * 360) / pts - 22.5) * (Math.PI / 180));
  ctx.beginPath();
  for (let i = 0; i < pts; i++) {
    const x = cx + r * Math.cos(angles[i]);
    const y = cy + r * Math.sin(angles[i]);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "#1C1C1C";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner ring
  const r2 = r * 0.82;
  ctx.beginPath();
  for (let i = 0; i < pts; i++) {
    const x = cx + r2 * Math.cos(angles[i]);
    const y = cy + r2 * Math.sin(angles[i]);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = "#1C1C1C";
  ctx.lineWidth = 1;
  ctx.stroke();

  // AP text
  ctx.font = `bold ${r * 0.9}px Arial Black, Arial, sans-serif`;
  ctx.fillStyle = "#EC6E00";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("AP", cx, cy + 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawChip(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const w = 72, h = 54, r = 8;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "#d4a843");
  grad.addColorStop(0.5, "#f0d070");
  grad.addColorStop(1, "#b8892a");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fill();
  // Líneas del chip
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  const mx = x + w / 2, my = y + h / 2;
  ctx.strokeRect(x + 14, y + 14, w - 28, h - 28);
  ctx.beginPath(); ctx.moveTo(mx, y + 14); ctx.lineTo(mx, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mx, y + h - 14); ctx.lineTo(mx, y + h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 14, my); ctx.lineTo(x, my); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w - 14, my); ctx.lineTo(x + w, my); ctx.stroke();
}

export function BankCardDownload({ cuenta }: Props) {
  return (
    <button
      onClick={() => drawCard(cuenta)}
      title="Descargar tarjeta como imagen PNG"
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:brightness-110 active:scale-95"
      style={{
        backgroundColor: "color-mix(in oklch, #F47717 15%, transparent)",
        color: "#F47717",
        border: "1px solid color-mix(in oklch, #F47717 35%, transparent)",
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Tarjeta PNG
    </button>
  );
}
