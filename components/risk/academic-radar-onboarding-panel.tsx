"use client";

import Link from "next/link";
import {
  BookOpen,
  Calendar,
  ClipboardList,
  Loader2,
  Microscope,
  PlayCircle,
  Radar,
  Sparkles,
  Target,
} from "lucide-react";
import { useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { applyAgendaExamsToProfile } from "@/lib/exams/refresh-profile-upcoming-exams";
import { bootstrapRadarDemoSignals } from "@/hooks/use-academic-radar-data";
import { radarCopy } from "@/lib/i18n/radar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchUserExams } from "@/lib/supabase/agenda-db";
import { loadExams, seedDemoExamsIfEmpty } from "@/lib/storage/exams-storage";

type Props = {
  useCloud: boolean;
  onRefreshed?: () => void;
};

const FEATURES = [
  { icon: Calendar, key: "featureExams" as const },
  { icon: Microscope, key: "featureResearch" as const },
  { icon: Target, key: "featureWeakTopics" as const },
  { icon: BookOpen, key: "featureWellbeing" as const },
  { icon: Sparkles, key: "featurePassMode" as const },
  { icon: Radar, key: "featureHeuristic" as const },
];

export function AcademicRadarOnboardingPanel({ useCloud, onRefreshed }: Props) {
  const t = radarCopy.es;
  const { profile, authUserId, setProfile } = useKampus();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDemo() {
    setBusy(true);
    setMessage(null);
    try {
      const subjectHint = profile.subjects[0] ?? profile.major ?? "General";
      const result = await bootstrapRadarDemoSignals(useCloud, authUserId, subjectHint);
      if (!result.ok) {
        setMessage(t.demoError);
        return;
      }

      if (profile.role !== "teacher") {
        if (useCloud && authUserId) {
          const supabase = createSupabaseBrowserClient();
          const exams = await fetchUserExams(supabase, authUserId);
          setProfile((prev) => applyAgendaExamsToProfile(prev, exams));
        } else {
          seedDemoExamsIfEmpty(subjectHint);
          setProfile((prev) => applyAgendaExamsToProfile(prev, loadExams()));
        }
      }

      setMessage(result.examsSeeded || result.researchInserted > 0 ? t.demoOk : t.demoExistsOk);
      onRefreshed?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.demoError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 via-transparent to-indigo-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radar className="h-5 w-5 text-cyan-300" aria-hidden />
          {t.onboardingTitle}
        </CardTitle>
        <CardDescription>{t.onboardingHint}</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-200"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden />
              {t[key]}
            </div>
          ))}
        </div>

        <p className="text-sm text-slate-300">{t.steps}</p>

        {!useCloud ? (
          <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
            {t.localOnlyHint}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void handleDemo()} className="gap-1.5">
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" aria-hidden />
            )}
            {t.demoCta}
          </Button>
          <Link href="/collaborate/investigaciones" className={buttonClasses({ size: "sm", variant: "secondary", className: "gap-1.5" })}>
            <ClipboardList className="h-3.5 w-3.5" />
            {t.researchCta}
          </Link>
          <Link href="/exams" className={buttonClasses({ size: "sm", variant: "ghost" })}>
            {t.examsCta}
          </Link>
        </div>

        <p className="text-xs text-slate-500">{t.demoFootnote}</p>
        {message ? <p className="text-sm text-cyan-100/90">{message}</p> : null}
      </div>
    </Card>
  );
}
