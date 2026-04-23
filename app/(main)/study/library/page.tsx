import type { Metadata } from "next";
import { Suspense } from "react";

import { LibraryHub } from "@/components/study/library-hub";

export const metadata: Metadata = { title: "Biblioteca IA" };

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <LibraryHub />
    </Suspense>
  );
}
