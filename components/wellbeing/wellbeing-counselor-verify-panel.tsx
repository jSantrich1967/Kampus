"use client";

import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

type VerifyResult =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "valid"; message: string; signedAt: string }
  | { status: "invalid"; error: string };

export function WellbeingCounselorVerifyPanel() {
  const t = wellbeingCopy.es;
  const [text, setText] = useState("");
  const [result, setResult] = useState<VerifyResult>({ status: "idle" });

  async function onVerify() {
    if (!text.trim()) return;
    setResult({ status: "loading" });
    try {
      const res = await fetch("/api/wellbeing/counselor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = (await res.json()) as { valid?: boolean; message?: string; error?: string; signedAt?: string };
      if (json.valid) {
        setResult({ status: "valid", message: json.message ?? t.counselorVerifyOk, signedAt: json.signedAt ?? "" });
      } else {
        setResult({ status: "invalid", error: json.error ?? t.counselorVerifyFail });
      }
    } catch {
      setResult({ status: "invalid", error: t.counselorVerifyFail });
    }
  }

  return (
    <Card className="border-sky-400/25 bg-slate-950/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-sky-300" aria-hidden />
          {t.counselorVerifyTitle}
        </CardTitle>
        <CardDescription>{t.counselorVerifyHint}</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        <textarea
          className="min-h-40 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
          placeholder={t.counselorVerifyPlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="button" size="sm" disabled={result.status === "loading" || !text.trim()} onClick={() => void onVerify()}>
          {result.status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          {t.counselorVerifyCta}
        </Button>
        {result.status === "valid" ? (
          <p className="flex items-start gap-2 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {result.message}
              {result.signedAt ? ` (${t.counselorVerifySignedAt}: ${result.signedAt.slice(0, 10)})` : null}
            </span>
          </p>
        ) : null}
        {result.status === "invalid" ? (
          <p className="flex items-start gap-2 text-sm text-rose-200">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {result.error}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
