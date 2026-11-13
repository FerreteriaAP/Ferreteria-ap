"use client";

import { useEffect } from "react";

// Solicita y guarda un device token en localStorage.
// Permite que iOS restaure la sesión automáticamente aunque borre la cookie.
export function SessionKeeper() {
  useEffect(() => {
    const refresh = async () => {
      try {
        const existing = localStorage.getItem("ap_dt");
        if (existing) {
          // Solo refrescar si el token tiene más de 24 horas
          const [data] = existing.split(".");
          if (data) {
            const payload = JSON.parse(
              atob(data.replace(/-/g, "+").replace(/_/g, "/"))
            ) as { iat?: number };
            const ageHours = (Date.now() / 1000 - (payload.iat ?? 0)) / 3600;
            if (ageHours < 24) return;
          }
        }
        const res = await fetch("/api/auth/device-token");
        if (!res.ok) return;
        const data = (await res.json()) as { token?: string };
        if (data.token) localStorage.setItem("ap_dt", data.token);
      } catch {
        // localStorage bloqueado (modo privado) — ignorar
      }
    };
    refresh();
  }, []);

  return null;
}
