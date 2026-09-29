"use client";

import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";

import { mailboxCopy } from "@/lib/i18n/mailbox";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { submissionFileUrl } from "@/lib/supabase/teacher-student-db";

export function SubmissionDelivery({
  body,
  attachmentPath,
  attachmentName,
}: {
  body: string;
  attachmentPath: string | null;
  attachmentName: string | null;
}) {
  const t = mailboxCopy.es;
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  const note = body.trim();

  async function openFile() {
    if (!attachmentPath) return;
    setFailed(false);
    setOpening(true);
    try {
      const url = await submissionFileUrl(createSupabaseBrowserClient(), attachmentPath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setFailed(true);
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="space-y-3">
      {attachmentPath ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
          <FileText className="h-4 w-4 shrink-0 text-indigo-200" />
          <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
            {attachmentName || t.formFile}
          </span>
          <button
            type="button"
            onClick={() => void openFile()}
            disabled={opening}
            className="text-sm font-medium text-indigo-200 hover:text-indigo-100"
          >
            {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : t.openFile}
          </button>
        </div>
      ) : null}
      {failed ? <p className="text-sm text-rose-200">{t.sendError}</p> : null}
      {note ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{note}</p> : null}
    </div>
  );
}
