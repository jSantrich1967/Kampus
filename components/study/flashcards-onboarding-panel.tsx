"use client";

import Link from "next/link";
import {
  Brain,
  Clock,
  Layers3,
  PlayCircle,
  Radar,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";

import { buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { flashcardsCopy } from "@/lib/i18n/flashcards";
import { buildPassModeFlashcardsPath, buildFlashcardsDemoPath } from "@/lib/study/plan-flashcards";

type Props = {
  deckCount: number;
  sessionHref: string;
};

const FEATURES = [
  { icon: Sparkles, key: "featureAdaptive" as const },
  { icon: Target, key: "featureWeakTopics" as const },
  { icon: Brain, key: "featurePassMode" as const },
  { icon: Timer, key: "featureTimer" as const },
  { icon: Clock, key: "featureStreak" as const },
  { icon: Layers3, key: "featureRescue" as const },
];

export function FlashcardsOnboardingPanel({ deckCount, sessionHref }: Props) {
  const t = flashcardsCopy.es;

  return (
    <Card className="border-purple-400/30 bg-gradient-to-br from-purple-500/15 via-transparent to-indigo-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers3 className="h-5 w-5 text-purple-300" aria-hidden />
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
              <Icon className="h-3.5 w-3.5 shrink-0 text-purple-300" aria-hidden />
              {t[key]}
            </div>
          ))}
        </div>

        <p className="text-sm text-slate-300">{t.steps}</p>
        <p className="text-xs text-purple-200/80">{t.cardCount(deckCount)}</p>

        <div className="flex flex-wrap gap-2">
          <Link href={sessionHref} className={buttonClasses({ size: "sm", className: "gap-1.5" })}>
            <PlayCircle className="h-3.5 w-3.5" aria-hidden />
            {t.planCta}
          </Link>
          <Link
            href={buildFlashcardsDemoPath()}
            className={buttonClasses({ size: "sm", variant: "secondary", className: "gap-1.5" })}
          >
            <PlayCircle className="h-3.5 w-3.5" aria-hidden />
            {t.demoCta}
          </Link>
          <Link href="/risk" className={buttonClasses({ size: "sm", variant: "ghost", className: "gap-1.5" })}>
            <Radar className="h-3.5 w-3.5" aria-hidden />
            {t.radarCta}
          </Link>
        </div>

        <p className="text-xs text-slate-500">{t.demoFootnote}</p>
      </div>
    </Card>
  );
}
