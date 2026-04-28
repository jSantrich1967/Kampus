import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mi Diario" };

export default function DiaryPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-slate-100">Mi Diario</h1>
      <p className="text-sm text-slate-400">
        Próximamente. Aquí podrás registrar reflexiones, metas, hábitos y seguimiento semanal.
      </p>
    </div>
  );
}

