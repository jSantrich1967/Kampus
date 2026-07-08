"use client";

import { ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { passModeCopy, riskLabel } from "@/lib/i18n/pass-mode";
import type { SubjectRisk } from "@/lib/pass-mode";

type PassModeRisksPanelProps = {
  risks: SubjectRisk[];
};

function riskTone(risk: SubjectRisk["risk"]) {
  if (risk === "high") return "danger" as const;
  if (risk === "medium") return "warning" as const;
  return "success" as const;
}

export function PassModeRisksPanel({ risks }: PassModeRisksPanelProps) {
  const t = passModeCopy.es;
  if (!risks.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-indigo-300" aria-hidden />
          {t.risksTitle}
        </CardTitle>
        <CardDescription>{t.risksHint}</CardDescription>
      </CardHeader>
      <ul className="space-y-2 px-6 pb-6">
        {risks.slice(0, 4).map((risk) => (
          <li key={risk.subject} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-white">{risk.subject}</span>
              <Badge tone={riskTone(risk.risk)}>{riskLabel(risk.risk)}</Badge>
              <span className="text-xs text-slate-500">Score {risk.score}</span>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {risk.reasons.slice(0, 2).map((reason) => (
                <li key={reason}>· {reason}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-300">{risk.nextAction}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
