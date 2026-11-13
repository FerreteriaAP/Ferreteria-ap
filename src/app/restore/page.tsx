"use client";

export const dynamic = "force-dynamic";

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
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 28,
      background: "var(--background, #0d0d0d)",
    }}>
      {/* Octágono AP grande */}
      <svg width="130" height="130" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="133.7,10 181.3,57.6 181.3,142.4 133.7,190 66.3,190 18.7,142.4 18.7,57.6 66.3,10"
          style={{ fill: "var(--card-bg-hex, #111923)", stroke: "var(--foreground, #fff)", strokeWidth: 7, strokeLinejoin: "round" }} />
        <polygon points="127,23 170,66 170,134 127,177 73,177 30,134 30,66 73,23"
          style={{ fill: "none", stroke: "var(--foreground, #fff)", strokeWidth: 3, strokeLinejoin: "round" }} />
        <text x="100" y="100" dominantBaseline="central" textAnchor="middle"
          fontFamily="Arial Black, Impact, sans-serif" fontWeight="900" fontSize="84" letterSpacing="-3"
          style={{ fill: "var(--accent-hex, #f97316)" }}>AP</text>
      </svg>

      {/* Wordmark */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 2, userSelect: "none" }}>
        <span style={{ color: "var(--accent-hex, #f97316)", fontWeight: 900, fontSize: 30, fontFamily: "'Arial Black', sans-serif", letterSpacing: "-0.02em" }}>F</span>
        <span style={{ color: "var(--foreground, #fff)", fontWeight: 900, fontSize: 30, fontFamily: "'Arial Black', sans-serif", letterSpacing: "-0.02em" }}>ERRETERÍA</span>
      </div>

      {/* Spinner */}
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        border: "2.5px solid rgba(249,115,22,0.25)", borderTopColor: "#f97316",
        animation: "spin 0.75s linear infinite",
      }} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
