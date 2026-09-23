import type { Metadata } from "next";
import { Suspense } from "react";

import { IssueCertificates } from "@/components/teaching/issue-certificates";

export const metadata: Metadata = { title: "Emitir certificados" };

export default function TeachingCertificatesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <IssueCertificates />
    </Suspense>
  );
}
