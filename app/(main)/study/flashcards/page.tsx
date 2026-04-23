import type { Metadata } from "next";
import { Suspense } from "react";

import { FlashcardsWorkspace } from "@/components/study/flashcards-workspace";

export const metadata: Metadata = { title: "Tarjetas" };

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <FlashcardsWorkspace />
    </Suspense>
  );
}
