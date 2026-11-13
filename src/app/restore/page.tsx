"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// Pantalla de carga que restaura sesión desde localStorage (iOS Add to Home Screen)
// Si hay device token → entra directo. Si no → redirige al login.
export default function RestorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const to = searchParams.get("to") ?? "/dashboard";

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem("ap_dt");
        if (token) {
          const res = await signIn("device-token", { token, redirect: false });
          if (res?.ok) {
            router.push(to);
            router.refresh();
            return;
          }
          localStorage.removeItem("ap_dt");
        }
      } catch {
        // localStorage no disponible
      }
      router.push(`/login?callbackUrl=${encodeURIComponent(to)}`);
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        background: "#0d0d0d",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.svg" alt="" width={36} height={36} />
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.1em", color: "#f97316" }}>
          FERRETERÍA AP
        </span>
      </div>

      {/* Spinner */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "2.5px solid rgba(249,115,22,0.25)",
          borderTopColor: "#f97316",
          animation: "spin 0.75s linear infinite",
        }}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
