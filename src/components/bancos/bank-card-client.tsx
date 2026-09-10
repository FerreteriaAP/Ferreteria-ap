"use client";
// Wrapper client-side para BankCardDownload.
// El dynamic con ssr:false solo puede usarse dentro de un Client Component,
// no directamente en Server Components (como bancos/page.tsx).
import dynamic from "next/dynamic";

export const BankCardDownload = dynamic(
  () => import("./bank-card-download").then((m) => m.BankCardDownload),
  { ssr: false, loading: () => null }
);
