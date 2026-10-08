import { Loader2 } from "lucide-react";

/**
 * Estado de carga del detalle de examen: esqueleto visible (cabecera y
 * tarjetas fantasma) con indicador, para que abrir un examen nunca deje
 * la pantalla en blanco mientras llegan los datos.
 */
export function ExamDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando examen">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Cargando tu examen…
      </div>
      <div className="space-y-3">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-white/10" />
        <div className="h-4 w-1/3 animate-pulse rounded-lg bg-white/5" />
      </div>
      <div className="grid gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-full animate-pulse rounded bg-white/5" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-white/5" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
