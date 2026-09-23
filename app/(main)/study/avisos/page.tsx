import type { Metadata } from "next";
import { Suspense } from "react";

import { StudentNotices } from "@/components/study/student-notices";
import { mailboxCopy } from "@/lib/i18n/mailbox";

export const metadata: Metadata = { title: mailboxCopy.es.noticesTitle };

export default function StudentNoticesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <StudentNotices />
    </Suspense>
  );
}
