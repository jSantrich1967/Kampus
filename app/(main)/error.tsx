"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function MainSectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-rose-400/25 bg-rose-950/20 p-6 text-slate-100">
      <h1 className="text-lg font-semibold text-white">No se pudo cargar esta sección</h1>
      <p className="text-sm text-slate-300">
        Algo falló al mostrar la página. Puedes reintentar o volver a Hoy mientras se recupera.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => reset()}>
          Reintentar
        </Button>
        <Link href="/today">
          <Button type="button" size="sm" variant="secondary">
            Ir a Hoy
          </Button>
        </Link>
      </div>
    </div>
  );
}
