"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { qz: any; }
}

/** Nombre de la impresora thermal registrada en el sistema */
const PRINTER_NAME = "Epson-TM-T20II";

export function QzPrintBtn() {
  const [estado, setEstado] = useState<"idle" | "conectando" | "imprimiendo" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const scriptLoaded = useRef(false);

  // Cargar qz-tray.js una sola vez
  useEffect(() => {
    if (scriptLoaded.current || typeof window === "undefined") return;
    scriptLoaded.current = true;
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/qz-tray/qz-tray.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  async function imprimir() {
    const qz = window.qz;
    if (!qz) {
      setEstado("error");
      setMsg("QZ Tray no cargó — espera 2 segundos e intenta de nuevo");
      return;
    }

    try {
      setEstado("conectando"); setMsg("Conectando con QZ Tray…");

      // Sin firma (uso local/intranet)
      qz.security.setCertificatePromise((resolve: (v: string) => void) => resolve(""));
      qz.security.setSignatureAlgorithm("SHA512");
      qz.security.setSignaturePromise(() => (resolve: () => void) => resolve());

      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({ host: "localhost", port: { secure: [8181] } });
      }

      setEstado("imprimiendo"); setMsg("Enviando a la impresora…");

      // Tomar el HTML completo del recibo + sus estilos
      const reciboEl = document.getElementById("recibo");
      const styleEl  = document.getElementById("recibo-style");
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>${styleEl?.textContent ?? ""}</style></head>
        <body style="margin:0;padding:0;background:white;">${reciboEl?.outerHTML ?? ""}</body></html>`;

      const config = qz.configs.create(PRINTER_NAME, {
        size:    { width: 80, height: null, units: "mm" },
        margins: { top: 3, right: 2, bottom: 3, left: 2, units: "mm" },
        colorType: "blackwhite",
        copies: 1,
      });

      const data = [{
        type: "pixel",
        format: "html",
        flavor: "plain",
        data: html,
        options: { pageWidth: 80, pageHeight: 0, units: "mm" },
      }];

      await qz.print(config, data);
      setEstado("ok"); setMsg("¡Recibo enviado!");
      setTimeout(() => { setEstado("idle"); setMsg(""); }, 3000);

    } catch (e: unknown) {
      const err = e as Error;
      setEstado("error");
      if (err?.message?.includes("Unable to establish") || err?.message?.includes("closed")) {
        setMsg("QZ Tray no responde — asegúrate de que esté corriendo en la barra de menú");
      } else if (err?.message?.includes("not found") || err?.message?.includes("No printer")) {
        setMsg(`Impresora "${PRINTER_NAME}" no encontrada — verifica el nombre en Impresoras y Escáneres`);
      } else {
        setMsg(err?.message ?? "Error desconocido");
      }
    }
  }

  const COLOR: Record<string, string> = {
    idle: "#1a1a1a", conectando: "#b07000",
    imprimiendo: "#0060b0", ok: "#1a7a40", error: "#c03050",
  };
  const TEXTO: Record<string, string> = {
    idle: "🖨  Imprimir recibo", conectando: "⏳ Conectando…",
    imprimiendo: "⏳ Imprimiendo…", ok: "✓  ¡Enviado!", error: "✕  Error — reintentar",
  };

  return (
    <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
      <button
        onClick={imprimir}
        disabled={estado === "conectando" || estado === "imprimiendo"}
        style={{
          backgroundColor: COLOR[estado], color: "#fff", border: "none",
          borderRadius: 8, padding: "9px 26px", fontSize: 13, fontWeight: 700,
          cursor: estado === "conectando" || estado === "imprimiendo" ? "wait" : "pointer",
          opacity: estado === "conectando" || estado === "imprimiendo" ? 0.7 : 1,
          transition: "background-color 0.25s",
        }}
      >
        {TEXTO[estado]}
      </button>
      {msg && (
        <p style={{ fontSize: 10, color: COLOR[estado], maxWidth: 290, margin: "5px auto 0", lineHeight: 1.4 }}>
          {msg}
        </p>
      )}
      <p style={{ fontSize: 10, color: "#aaa", marginTop: 6 }}>
        También puedes usar <strong>Cmd+P</strong>
      </p>
    </div>
  );
}
