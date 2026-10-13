import type { Metadata } from "next";

import { LectureRecorder } from "@/components/study/lecture-recorder";

export const metadata: Metadata = { title: "Grabar clase" };

export default function GrabarClasePage() {
  return (
    <div className="-mx-4 -mt-2 min-h-[calc(100dvh-6rem)] px-4 py-6 md:-mx-8 md:px-8 md:py-8">
      <div className="mx-auto mb-8 w-full max-w-2xl">
        <p className="mb-2 text-xs font-bold tracking-[0.2em] text-purple-400 uppercase">Estudiar</p>
        <h1 className="mb-4 text-4xl font-bold text-white">Grabar clase</h1>
        <p className="max-w-2xl text-gray-400">
          Graba la clase con el micrófono y Kampus la transcribe y arma tus apuntes en el cuaderno de la materia.
        </p>
      </div>
      <LectureRecorder />
    </div>
  );
}
