import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentWorks } from "@/components/study/student-works";
import { mailboxCopy } from "@/lib/i18n/mailbox";

export const metadata: Metadata = { title: mailboxCopy.es.worksTitle };

export default function MyWorksPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <StudentWorks />
    </Suspense>
  );
}
