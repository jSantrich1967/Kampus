import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#131318] px-6 text-center text-white">
      <p
        aria-hidden
        className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-8xl font-bold text-transparent"
      >
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold">Página no encontrada</h1>
      <p className="mt-2 max-w-md leading-relaxed text-gray-400">
        La página que buscas no existe o fue movida. Revisa la dirección o vuelve al inicio.
      </p>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition-all hover:bg-purple-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al inicio
        </Link>
        <Link
          href="/demo"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white transition-all hover:bg-white/10"
        >
          <Play className="h-4 w-4" aria-hidden />
          Ver demo
        </Link>
      </div>
    </div>
  );
}
