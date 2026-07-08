"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { passModeCopy } from "@/lib/i18n/pass-mode";
import type { NotebookHealthAlert } from "@/lib/today/notebook-health";

type PassModeMaterialPanelProps = {
  alerts: NotebookHealthAlert[];
  loading?: boolean;
};

export function PassModeMaterialPanel({ alerts, loading }: PassModeMaterialPanelProps) {
  const t = passModeCopy.es;

  if (loading) return null;
  if (!alerts.length) {
    return (
      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="text-base">{t.materialTitle}</CardTitle>
          <CardDescription>{t.materialEmpty}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-300" aria-hidden />
          {t.materialTitle}
        </CardTitle>
        <CardDescription>{t.materialHint}</CardDescription>
      </CardHeader>
      <ul className="space-y-2 px-6 pb-6">
        {alerts.slice(0, 3).map((alert) => (
          <li
            key={alert.id}
            className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-white">{alert.title}</span>
                <Badge tone="warning">{alert.subject}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400">{alert.description}</p>
            </div>
            <Link href={alert.href} className="shrink-0">
              <Button size="sm" variant="secondary">
                Subir material
              </Button>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
