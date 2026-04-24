import type { Metadata } from "next";
import { Suspense } from "react";

import { NotebookReader } from "@/components/study/notebook-reader";

export const metadata: Metadata = { title: "Cuaderno" };

export default function NotebookReaderPage({ params }: { params: { subjectSlug: string } }) {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando cuaderno…</div>}>
      <NotebookReader subjectSlug={params.subjectSlug} />
    </Suspense>
  );
}
