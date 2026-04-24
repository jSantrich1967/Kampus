"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { todayCopy } from "@/lib/i18n/today";
import { buildPassModePlan, buildSubjectRisks } from "@/lib/pass-mode";
import { TodayAuthBypassNote } from "@/components/today/today-auth-bypass-note";

function daysUntil(isoDate: string): number | null {
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function riskTone(risk: "low" | "medium" | "high") {
  if (risk === "high") return "danger" as const;
  if (risk === "medium") return "warning" as const;
  return "success" as const;
}

function riskLabel(risk: "low" | "medium" | "high") {
  if (risk === "high") return "ALTO";
  if (risk === "medium") return "MEDIO";
  return "BAJO";
}

export function TodayDashboard() {
  const router = useRouter();
  const { profile, hydrated } = useKampus();
  const t = todayCopy.es;

  useEffect(() => {
    if (!hydrated) return;
    if (!profile.onboardingFinished) router.replace("/onboarding");
  }, [hydrated, profile.onboardingFinished, router]);

  const plan = useMemo(() => buildPassModePlan(profile), [profile]);
  const risks = useMemo(() => buildSubjectRisks(profile), [profile]);

  const deadlines = useMemo(() => {
    return profile.upcomingExams
      .map((e) => ({ ...e, days: daysUntil(e.date) }))
      .filter((e) => e.days !== null)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
      .slice(0, 4);
  }, [profile.upcomingExams]);

  const firstBlock = plan.sequence[0];

  if (!hydrated || !profile.onboardingFinished) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hoy"
        title={t.greeting({ name: profile.displayName, institution: profile.university })}
        description={t.tagline}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ShareLinkButton
              pathname="/today"
              campaign="today_digest"
              refHandle={profile.university || "kampus"}
              label="Copiar enlace de Hoy"
              copiedLabel="Copiado"
            />
            {profile.role === "student" ? (
              <Link href="/pass-mode">
                <Button className="w-full sm:w-auto">{t.passCta}</Button>
              </Link>
            ) : null}
            <Link href="/study/rescue">
              <Button variant="secondary" className="w-full sm:w-auto">
                {t.rescueCta}
              </Button>
            </Link>
          </div>
        }
      />

      <TodayAuthBypassNote />

      {profile.plan === "free" && profile.role === "student" ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-50">
          {t.premiumHint}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.sequenceTitle}</CardTitle>
            <CardDescription>{firstBlock?.rationale}</CardDescription>
          </CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-semibold text-white">{firstBlock?.title}</div>
              <div className="mt-1 text-sm text-slate-300">
                {firstBlock?.subject} · {firstBlock?.minutes} min · Enfoque: {firstBlock?.focus}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="accent">{firstBlock?.priority}</Badge>
              <Link href="/study/flashcards">
                <Button size="sm" variant="secondary">
                  {t.quickQuiz}
                </Button>
              </Link>
              <Link href="/risk">
                <Button size="sm" variant="ghost">
                  {t.radar}
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.preparedness}</CardTitle>
            <CardDescription>{plan.overloadNote ?? "Ritmo sostenible."}</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div className="text-4xl font-semibold text-white">{plan.preparednessScore}%</div>
              <div className="text-xs text-slate-400">modelo heurístico</div>
            </div>
            <Progress value={plan.preparednessScore} />
            <div className="text-sm text-slate-300">
              <span className="font-medium text-white">{t.streak}</span>: {profile.streakDays}{" "}
              días
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.deadlines}</CardTitle>
            <CardDescription>{deadlines.length ? "" : t.noDeadlines}</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {deadlines.map((d) => (
              <div
                key={`${d.subject}-${d.date}`}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div>
                  <div className="font-medium text-white">{d.subject}</div>
                  <div className="text-xs text-slate-400">{d.date}</div>
                </div>
                <Badge tone={(d.days ?? 99) <= 7 ? "danger" : (d.days ?? 99) <= 14 ? "warning" : "neutral"}>
                  {d.days}{" "}
                  días
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.continueTitle}</CardTitle>
            <CardDescription>{t.continueBody}</CardDescription>
          </CardHeader>
          <Link href="/study/library">
            <Button variant="secondary" className="w-full">
              Ir a mis cuadernos
            </Button>
          </Link>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.riskTitle}</CardTitle>
          <CardDescription>Prioriza lo que más pesa en tu semana.</CardDescription>
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-2">
          {risks.map((r) => (
            <div key={r.subject} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-white">{r.subject}</div>
                <Badge tone={riskTone(r.risk)}>{riskLabel(r.risk)}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-300">{r.nextAction}</p>
            </div>
          ))}
        </div>
      </Card>

      {profile.role === "teacher" ? (
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t.teacherTitle}</CardTitle>
              <CardDescription>{t.teacherBody}</CardDescription>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              <Link href="/teaching">
                <Button size="sm">Copiloto docente</Button>
              </Link>
              <Link href="/exams">
                <Button size="sm" variant="secondary">
                  Flujo de exámenes
                </Button>
              </Link>
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Feedback publicable</CardTitle>
              <CardDescription>
                Menos fricción, más claridad para el alumno.
              </CardDescription>
            </CardHeader>
            <Link href="/teaching">
              <Button variant="ghost" size="sm" className="px-0 text-indigo-200 hover:text-white">
                Abrir borradores →
              </Button>
            </Link>
          </Card>
        </div>
      ) : null}

      {profile.role === "institution" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.institutionTitle}</CardTitle>
            <CardDescription>{t.institutionBody}</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            <Link href="/institution">
              <Button size="sm">Ver panel</Button>
            </Link>
            <Link href="/risk">
              <Button size="sm" variant="secondary">
                {t.radar}
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
