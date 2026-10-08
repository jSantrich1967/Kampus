import { RotateCcw } from "lucide-react";

/**
 * Error de una función de IA, siempre igual en toda la app: mensaje amable
 * (nunca el error técnico crudo) y botón «Reintentar» que repite la acción.
 */
export function AiErrorNotice({
  message,
  onRetry,
  retrying = false,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="alert">
      <p className="text-xs text-rose-200/90">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
