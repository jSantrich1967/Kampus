import type { Metadata } from "next";
import { Suspense } from "react";

import { CommunityHub } from "@/components/community/community-hub";

export const metadata: Metadata = { title: "Comunidad" };

export default function CommunityPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <CommunityHub />
    </Suspense>
  );
}
