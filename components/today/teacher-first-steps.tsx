"use client";

import Link from "next/link";
import { CalendarPlus, FilePlus2, Sparkles } from "lucide-react";

import { buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { todayCopy } from "@/lib/i18n/today";

const STEPS = [
  {
    icon: FilePlus2,
    titleKey: "step1Title",
    bodyKey: "step1Body",
    ctaKey: "step1Cta",
    href: "/teaching/examenes",
  },
  {
    icon: CalendarPlus,
    titleKey: "step2Title",
    bodyKey: "step2Body",
    ctaKey: "step2Cta",
    href: "/collaborate/aula-virtual",
  },
  {
    icon: Sparkles,
    titleKey: "step3Title",
    bodyKey: "step3Body",
    ctaKey: "step3Cta",
    href: "/teaching",
  },
] as const;

export function TeacherFirstSteps() {
  const t = todayCopy.es.teacherFirstSteps;

  return (
    <Card className="border-purple-400/20 bg-purple-500/[0.05]">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.body}</CardDescription>
      </CardHeader>
      <div className="grid gap-4 px-6 pb-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <div
            key={step.href}
            className="flex flex-col rounded-2xl border border-white/10 bg-slate-950/40 p-5"
          >
            <div className="mb-3 flex items-center gap-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-300"
                aria-hidden
              >
                {i + 1}
              </span>
              <step.icon className="h-5 w-5 text-purple-300" aria-hidden />
            </div>
            <p className="mb-1 font-semibold text-white">{t[step.titleKey]}</p>
            <p className="mb-4 flex-1 text-sm text-slate-400">{t[step.bodyKey]}</p>
            <Link href={step.href} className={buttonClasses({ size: "sm", variant: "secondary" })}>
              {t[step.ctaKey]}
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}
