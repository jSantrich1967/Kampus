"use client";

import { Flag } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { COMMUNITY_REPORT_REASONS } from "@/lib/community/report-reasons";
import { communityCopy } from "@/lib/i18n/community";

type CommunityReportPostButtonProps = {
  disabled?: boolean;
  alreadyReported?: boolean;
  onReport: (reason: string, detail: string) => Promise<void>;
};

export function CommunityReportPostButton({ disabled, alreadyReported, onReport }: CommunityReportPostButtonProps) {
  const t = communityCopy.es;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(COMMUNITY_REPORT_REASONS[0]!.id);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyReported);

  if (done || alreadyReported) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Flag className="h-3.5 w-3.5" aria-hidden />
        {t.reportDone}
      </span>
    );
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-slate-400" disabled={disabled} onClick={() => setOpen(true)}>
        <Flag className="h-3.5 w-3.5" aria-hidden />
        {t.reportCta}
      </Button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-rose-400/20 bg-rose-500/5 p-3">
      <div className="text-xs font-medium text-rose-100">{t.reportTitle}</div>
      <p className="mt-1 text-[11px] text-slate-400">{t.reportHint}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {COMMUNITY_REPORT_REASONS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`rounded-full px-2.5 py-1 text-[11px] transition ${
              reason === r.id ? "bg-rose-500/30 text-white ring-1 ring-rose-400/40" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
            onClick={() => setReason(r.id)}
          >
            {r.es}
          </button>
        ))}
      </div>
      <textarea
        className="mt-2 min-h-[56px] w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-200 outline-none ring-rose-400/30 focus:ring"
        placeholder={t.reportDetailPlaceholder}
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        maxLength={500}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          {t.reportCancel}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError(null);
            void onReport(reason, detail)
              .then(() => {
                setDone(true);
                setOpen(false);
              })
              .catch((e) => {
                setError(e instanceof Error ? e.message : t.reportError);
              })
              .finally(() => setBusy(false));
          }}
        >
          {busy ? t.reportSending : t.reportSubmit}
        </Button>
        {error ? <span className="text-xs text-rose-300">{error}</span> : null}
      </div>
    </div>
  );
}
