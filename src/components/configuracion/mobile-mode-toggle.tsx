"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMobileMode } from "@/actions/config";
import { Smartphone, Loader2 } from "lucide-react";

export function MobileModeToggle({ activo }: { activo: boolean }) {
  const [enabled, setEnabled] = useState(activo);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      await setMobileMode(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Modo mobile
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          Ajusta el tamaño del texto y los botones para pantallas táctiles.
          Solo afecta este dispositivo.
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={pending}
        aria-pressed={enabled}
        data-toggle
        className="relative flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2"
        style={{
          backgroundColor: enabled ? "var(--primary)" : "var(--border)",
          width: 44,
          height: 24,
          minHeight: 24,
        }}
      >
        {pending ? (
          <Loader2
            size={12}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin"
            style={{ color: enabled ? "#fff" : "var(--muted-foreground)" }}
          />
        ) : (
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
            style={{ transform: enabled ? "translateX(20px)" : "translateX(0)" }}
          />
        )}
      </button>
    </div>
  );
}
