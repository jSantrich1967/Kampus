import type { Metadata } from "next";
import { Suspense } from "react";

import { NotebookReader } from "@/components/study/notebook-reader";

export const metadata: Metadata = { title: "Cuaderno" };

/** Next.js 15+: dynamic route `params` is a Promise and must be awaited. */
export default async function NotebookReaderPage({ params }: { params: Promise<{ subjectSlug: string }> }) {
  const { subjectSlug } = await params;
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando cuaderno…</div>}>
      <NotebookReader subjectSlug={subjectSlug} />
    </Suspense>
  );
}
