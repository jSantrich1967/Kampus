"use client";

import { ArrowLeft, GraduationCap, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePassModePlan } from "@/lib/hooks/use-pass-mode-plan";
import { passModeCopy } from "@/lib/i18n/pass-mode";
import { buildProfessorSimulatorPrompts } from "@/lib/study/professor-simulator";
import { cn } from "@/lib/cn";

export function ProfessorSimulatorPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useKampus();
  const { plan } = usePassModePlan();
  const t = passModeCopy.es;
  const isPremium = profile.plan === "premium";

  const subjectParam = searchParams.get("subject")?.trim();
  const subject =
    subjectParam ||
    plan.subjectRisks[0]?.subject ||
    profile.subjects[0] ||
    "General";

  const allPrompts = useMemo(
    () => buildProfessorSimulatorPrompts(profile, plan, 3),
    [profile, plan],
  );
  const prompts = isPremium ? allPrompts : allPrompts.slice(0, 1);

  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const current = prompts[index];
  const rubricDone = current
    ? current.rubric.filter((_, i) => checked[`${current.id}-${i}`]).length
    : 0;

  function toggleRubric(itemKey: string) {
    setChecked((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.simulatorTitle}
        description={t.simulatorHint}
        actions={
          <Link href="/pass-mode">
            <Button variant="secondary" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t.backToPassMode}
            </Button>
          </Link>
        }
      />

      {!isPremium ? (
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-amber-300" aria-hidden />
              {t.simulatorPremiumTitle}
            </CardTitle>
            <CardDescription>{t.simulatorPremiumHint}</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button type="button" onClick={() => router.push("/settings")}>
              {t.simulatorPremiumCta}
            </Button>
          </div>
        </Card>
      ) : null}

      {current ? (
        <Card className="border-indigo-500/25">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-300" aria-hidden />
              <CardTitle className="text-lg">{t.simulatorQuestion(index + 1, prompts.length)}</CardTitle>
              <Badge tone="accent">{subject}</Badge>
              {isPremium ? <Badge tone="success">Premium</Badge> : <Badge tone="warning">Vista previa</Badge>}
            </div>
            <CardDescription className="text-base text-slate-200">{current.question}</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.simulatorRubricTitle}
              </p>
              <ul className="space-y-2">
                {current.rubric.map((item, i) => {
                  const key = `${current.id}-${i}`;
                  const done = Boolean(checked[key]);
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
                          done
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                            : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/[0.07]",
                        )}
                        onClick={() => toggleRubric(key)}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs",
                            done ? "border-emerald-400 bg-emerald-500/30" : "border-white/20",
                          )}
                        >
                          {done ? "✓" : i + 1}
                        </span>
                        {item}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-slate-400">
                {t.simulatorRubricProgress(rubricDone, current.rubric.length)}
              </p>
            </div>
            <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
              <span className="font-semibold text-white">{t.simulatorFollowUp}</span> {current.followUp}
            </p>
            <div className="flex flex-wrap gap-2">
              {index > 0 ? (
                <Button type="button" variant="secondary" onClick={() => setIndex((i) => i - 1)}>
                  {t.simulatorPrev}
                </Button>
              ) : null}
              {index < prompts.length - 1 ? (
                <Button type="button" onClick={() => setIndex((i) => i + 1)}>
                  {t.simulatorNext}
                </Button>
              ) : isPremium ? (
                <Link href="/pass-mode">
                  <Button>{t.backToPassMode}</Button>
                </Link>
              ) : (
                <Button type="button" onClick={() => router.push("/settings")}>
                  {t.simulatorUnlockAll}
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
