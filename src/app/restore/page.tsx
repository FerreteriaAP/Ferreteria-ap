import { Suspense } from "react";
import { RestoreClient } from "./restore-client";

// Deshabilitar prerender — esta página es dinámica por naturaleza
export const dynamic = "force-dynamic";

export default function RestorePage() {
  return (
    <Suspense>
      <RestoreClient />
    </Suspense>
  );
}
