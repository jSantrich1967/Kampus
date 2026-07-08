"use client";

import { ExternalLink, GraduationCap } from "lucide-react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMatchedVenezuelaInstitution,
  resolveUniversityServices,
} from "@/lib/wellbeing/university-services-catalog";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

export function WellbeingUniversityServicesPanel() {
  const t = wellbeingCopy.es;
  const { profile } = useKampus();
  const matched = getMatchedVenezuelaInstitution(profile.university);
  const services = resolveUniversityServices(profile.university);

  return (
    <Card className="border-cyan-400/20 bg-cyan-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-4 w-4 text-cyan-300" aria-hidden />
          {t.universityServicesTitle}
        </CardTitle>
        <CardDescription>
          {matched ? t.universityServicesHintMatched(matched.label) : t.universityServicesHint}
        </CardDescription>
      </CardHeader>
      <ul className="space-y-3 px-6 pb-5">
        {services.map((svc) => (
          <li key={svc.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
            <a
              href={svc.href}
              className="flex items-start justify-between gap-2 text-sm font-medium text-cyan-100 hover:text-white"
              {...(svc.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {svc.label}
              {svc.external ? <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden /> : null}
            </a>
            <p className="mt-1 text-xs text-slate-400">{svc.description}</p>
          </li>
        ))}
      </ul>
      <p className="px-6 pb-5 text-[11px] text-slate-500">{t.universityServicesDisclaimer}</p>
    </Card>
  );
}
