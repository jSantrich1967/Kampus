import type { Metadata } from "next";

export const metadata: Metadata = { title: "Psicólogo" };

export default function PsychologistPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-slate-100">Psicólogo</h1>
      <p className="text-sm text-slate-400">
        Próximamente. Aquí iremos construyendo un espacio de apoyo (estrés, ansiedad pre-examen, hábitos y bienestar).
      </p>
    </div>
  );
}

