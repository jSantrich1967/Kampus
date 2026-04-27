import type { Metadata } from "next";
import { Suspense } from "react";

import { VirtualClassroomSession } from "@/components/collaborate/virtual-classroom-session";

export const metadata: Metadata = { title: "Sesión en vivo" };

/** Next.js 15+: dynamic route `params` is a Promise and must be awaited. */
export default async function AulaVirtualSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando aula…</div>}>
      <VirtualClassroomSession sessionId={sessionId} />
    </Suspense>
  );
}
