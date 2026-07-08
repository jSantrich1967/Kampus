"use client";

import Link from "next/link";
import { Heart, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HUMAN_SUPPORT_RESOURCES, phoneTelHref, VENEZUELA_EMERGENCY_PHONE } from "@/lib/wellbeing/human-support-resources";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

type Props = {
  compact?: boolean;
};

export function WellbeingHumanSupportPanel({ compact = false }: Props) {
  const t = wellbeingCopy.es;

  if (compact) {
    return (
      <div className="rounded-xl border border-rose-400/20 bg-rose-950/15 px-4 py-3 text-sm">
        <p className="font-medium text-rose-100">{t.humanSupportCompactTitle}</p>
        <p className="mt-1 text-slate-300">{t.humanSupportCompactHint}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={phoneTelHref(VENEZUELA_EMERGENCY_PHONE)}>
            <Button size="sm" variant="secondary">
              {t.humanSupportEmergencyCta}
            </Button>
          </a>
          <Link href="/wellbeing#apoyo-humano">
            <Button size="sm" variant="ghost">
              {t.humanSupportSeeAll}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Card id="apoyo-humano" className="border-rose-400/20 bg-gradient-to-br from-rose-950/20 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="h-5 w-5 text-rose-300" aria-hidden />
          {t.humanSupportTitle}
        </CardTitle>
        <CardDescription>{t.humanSupportHint}</CardDescription>
      </CardHeader>
      <ul className="space-y-3 px-6 pb-6">
        {HUMAN_SUPPORT_RESOURCES.map((r) => (
          <li
            key={r.id}
            className={`rounded-xl border px-4 py-3 ${r.urgent ? "border-rose-400/35 bg-rose-500/10" : "border-white/10 bg-slate-950/40"}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium text-white">{r.title}</p>
                <p className="mt-1 text-sm text-slate-300">{r.description}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {r.phone ? (
                  <a href={phoneTelHref(r.phone)}>
                    <Button size="sm" variant={r.urgent ? "primary" : "secondary"} className="gap-1.5">
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      {r.phone}
                    </Button>
                  </a>
                ) : null}
                {r.href ? (
                  <Link href={r.href}>
                    <Button size="sm" variant="ghost">
                      {t.humanSupportOpen}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
