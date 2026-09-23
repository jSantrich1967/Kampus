import type { Metadata } from "next";
import { Suspense } from "react";

import { MyCertificates } from "@/components/study/my-certificates";

export const metadata: Metadata = { title: "Mis certificados" };

export default function CertificatesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <MyCertificates />
    </Suspense>
  );
}
