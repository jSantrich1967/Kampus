"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { todayCopy } from "@/lib/i18n/today";
import { buildCommunityExamHref } from "@/lib/community/channels";
import { buildSubjectRisks, buildTeacherFocusBlock } from "@/lib/pass-mode";
import { usePassModePlan } from "@/lib/hooks/use-pass-mode-plan";
import { buildPressureQuizPath, getPressureQuizBlock } from "@/lib/study/pressure-quiz";
import { TodayAuthBypassNote } from "@/components/today/today-auth-bypass-note";
import { TodayContextPanel } from "@/components/today/today-context-panel";
import { TodayCollaboratePanel } from "@/components/today/today-collaborate-panel";
import { TodayWellbeingPanel } from "@/components/today/today-wellbeing-panel";
import { TodayMissionPanel } from "@/components/today/today-mission-panel";
import { TodayMomentumPanel } from "@/components/today/today-momentum-panel";
import { PassModeOverloadBanner } from "@/components/pass-mode/pass-mode-overload-banner";
import { CommunityReplyBannerFromNotifications } from "@/components/community/community-reply-banner";
import { useCommunityReplyNotifications } from "@/hooks/use-community-reply-notifications";
import { useUpcomingExamsSync } from "@/hooks/use-upcoming-exams-sync";
import { daysUntilExam } from "@/lib/exams/exam-insights";

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

/** Un paso del hilo didáctico de "Hoy": cada sección dice qué hacer y en qué orden. */
function TodayStep({ step, label, children }: { step: string; label: string; children: ReactNode }) {
  return (
    <section aria-label={`${step}: ${label}`} className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {step} · {label}
      </p>
      {children}
    </section>
  );
}

type DeadlineItem = { subject: string; date: string; days: number | null };

function StudentDeadlinesCard({ deadlines }: { deadlines: DeadlineItem[] }) {
  const t = todayCopy.es;
  const { profile } = useKampus();
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{t.deadlines}</CardTitle>
        <CardDescription>{deadlines.length ? t.deadlinesHint : t.noDeadlines}</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {deadlines.length ? (
          <>
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
                  {d.days} días
                </Badge>
              </div>
            ))}
            {profile.interestedInCommunity !== false && deadlines[0] && (deadlines[0].days ?? 99) <= 7 ? (
              <div className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 px-4 py-3">
                <p className="text-sm text-slate-200">{t.communityDeadlineHint}</p>
                <Link href={buildCommunityExamHref(deadlines[0].subject, deadlines[0].date)} className="mt-2 inline-block">
                  <Button size="sm" variant="secondary">
                    {t.communityDeadlineCta(deadlines[0].subject)}
                  </Button>
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <Link href="/exams/calendar">
            <Button variant="secondary" size="sm">
              {t.addDeadlinesCta}
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

function StudentRiskCard({ risks }: { risks: { subject: string; risk: "low" | "medium" | "high" }[] }) {
  const t = todayCopy.es;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.riskTitle}</CardTitle>
        <CardDescription>Prioriza lo que más pesa en tu semana.</CardDescription>
      </CardHeader>
      <div className="space-y-2 px-6 pb-6">
        {risks.slice(0, 3).map((r) => (
          <div key={r.subject} className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-white">{r.subject}</span>
              <Badge tone={riskTone(r.risk)}>{riskLabel(r.risk)}</Badge>
            </div>
          </div>
        ))}
        <Link href="/risk">
          <Button variant="ghost" size="sm" className="w-full">
            Ver radar completo
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export function TodayDashboard() {
  const router = useRouter();
  const { profile, hydrated, authUserId } = useKampus();
  const t = todayCopy.es;

  useEffect(() => {
    if (!hydrated) return;
    if (!profile.onboardingFinished) router.replace("/onboarding");
  }, [hydrated, profile.onboardingFinished, router]);

  useUpcomingExamsSync();
  const { plan, intensity, setIntensity, overloaded } = usePassModePlan();
  const { notifications: communityReplies, dismiss: dismissCommunityReplies } = useCommunityReplyNotifications(
    profile.role === "student" && profile.interestedInCommunity !== false ? authUserId : null,
  );
  const risks = useMemo(() => buildSubjectRisks(profile), [profile]);
  const teacherFocus = useMemo(() => buildTeacherFocusBlock(profile), [profile]);
  const planningTight = profile.weeklyAvailabilityHours * 60 < profile.subjects.length * 90;

  const deadlines = useMemo(() => {
    return profile.upcomingExams
      .map((e) => ({ ...e, days: daysUntilExam(e.date) }))
      .filter((e) => e.days !== null && e.days >= 0)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
      .slice(0, 4);
  }, [profile.upcomingExams]);

  // Normaliza el nombre del espacio demo en perfiles guardados antes del cambio de marca.
  const institutionName =
    profile.university === "Universidad Demo" ? "Centro Demo" : profile.university;

  const firstBlock = plan.sequence[0];
  const pressureQuizBlock = useMemo(() => getPressureQuizBlock(plan), [plan]);
  const missionPrioritySubjects = useMemo(
    () => [...new Set(plan.sequence.map((b) => b.subject))],
    [plan.sequence],
  );
  const [missionTick, setMissionTick] = useState(0);
  const isTeacher = profile.role === "teacher";

  if (!hydrated || !profile.onboardingFinished) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hoy"
        title={
          isTeacher
            ? t.teacherGreeting({ name: profile.displayName, institution: institutionName })
            : t.greeting({ name: profile.displayName, institution: institutionName })
        }
        description={isTeacher ? t.teacherTagline : t.tagline}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ShareLinkButton
              pathname="/today"
              campaign="today_digest"
              refHandle={profile.university || "kampus"}
              label="Copiar enlace de Hoy"
              copiedLabel="Copiado"
            />
            {isTeacher ? (
              <>
                <Link href="/teaching">
                  <Button className="w-full sm:w-auto">{t.teacherCopilotCta}</Button>
                </Link>
                <Link href="/exams">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    {t.teacherExamsCta}
                  </Button>
                </Link>
                <Link href="/exams/calendar">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    {t.teacherCalendarCta}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {profile.role === "student" ? (
                  <Link href="/pass-mode">
                    <Button className="w-full sm:w-auto">{t.passCta}</Button>
                  </Link>
                ) : null}
                <Link href="/study/library/rescue">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    {t.rescueCta}
                  </Button>
                </Link>
              </>
            )}
          </div>
        }
      />

      <TodayAuthBypassNote />

      {profile.plan === "free" && profile.role === "student" ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-50">
          {t.premiumHint}
        </div>
      ) : null}

      {profile.role === "student" && overloaded ? (
        <PassModeOverloadBanner
          visible
          currentIntensity={intensity}
          onSwitchToMinimal={() => setIntensity("minimal")}
          onKeepFull={() => setIntensity(intensity === "minimal" ? "minimal" : "full")}
        />
      ) : null}

      {profile.role === "student" && profile.interestedInCommunity !== false ? (
        <CommunityReplyBannerFromNotifications
          notifications={communityReplies}
          onDismiss={dismissCommunityReplies}
        />
      ) : null}

      {profile.role === "student" ? (
        <TodayStep step="Paso 1" label="Empieza aquí">
          <TodayMissionPanel plan={plan} onProgressChange={() => setMissionTick((n) => n + 1)} />
        </TodayStep>
      ) : null}

      {profile.role === "student" ? (
        <TodayStep step="Paso 2" label="Lo que viene">
          <div className="grid gap-5 lg:grid-cols-3">
            <StudentDeadlinesCard deadlines={deadlines} />
            <StudentRiskCard risks={risks} />
          </div>
          <TodayCollaboratePanel />
        </TodayStep>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {isTeacher ? (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t.teacherSequenceTitle}</CardTitle>
                <CardDescription>{teacherFocus?.rationale}</CardDescription>
              </CardHeader>
              <div className="flex flex-col gap-4 px-6 pb-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-lg font-semibold text-white">{teacherFocus?.title}</div>
                  <div className="mt-1 text-sm text-slate-300">
                    {teacherFocus?.subject} · Enfoque: {teacherFocus?.focus}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="accent">{teacherFocus?.priority}</Badge>
                  <Link href="/teaching">
                    <Button size="sm" variant="secondary">
                      {t.teacherCopilotCta}
                    </Button>
                  </Link>
                  <Link href="/collaborate/exposiciones">
                    <Button size="sm" variant="ghost">
                      {t.teacherPresentationsCta}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t.sequenceTitle}</CardTitle>
                <CardDescription>{firstBlock?.rationale}</CardDescription>
              </CardHeader>
              <div className="flex flex-col gap-4 px-6 pb-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-lg font-semibold text-white">{firstBlock?.title}</div>
                  <div className="mt-1 text-sm text-slate-300">
                    {firstBlock?.subject} · {firstBlock?.minutes} min · Enfoque: {firstBlock?.focus}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="accent">{firstBlock?.priority}</Badge>
                  <Link
                    href={buildPressureQuizPath(
                      pressureQuizBlock?.subject ?? profile.subjects[0] ?? "General",
                      pressureQuizBlock?.minutes,
                    )}
                  >
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
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t.preparedness}</CardTitle>
              <CardDescription>
                {isTeacher
                  ? planningTight
                    ? t.teacherOverloadNote
                    : t.teacherPreparednessHint
                  : plan.overloadNote ?? "Ritmo sostenible."}
              </CardDescription>
            </CardHeader>
            <div className="space-y-3 px-6 pb-6">
              <div className="flex items-end justify-between">
                <div className="text-4xl font-semibold text-white">{plan.preparednessScore}%</div>
                <div className="text-xs text-slate-400">{isTeacher ? "carga semanal" : "modelo heurístico"}</div>
              </div>
              <Progress value={plan.preparednessScore} />
              {isTeacher ? (
                <div className="text-sm text-slate-300">
                  <span className="font-medium text-white">{t.teacherSubjectsLabel}</span>: {profile.subjects.length}
                </div>
              ) : (
                <div className="text-sm text-slate-300">
                  <span className="font-medium text-white">{t.streak}</span>: {profile.streakDays} días
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {profile.role === "student" ? (
        <TodayStep step="Paso 3" label="Tu día">
          <TodayContextPanel prioritySubjects={missionPrioritySubjects} />
        </TodayStep>
      ) : null}

      {profile.role === "student" ? (
        <TodayStep step="Paso 4" label="Cómo vas">
          <TodayMomentumPanel plan={plan} missionTick={missionTick} />
        </TodayStep>
      ) : null}

      {profile.role === "student" ? (
        <TodayStep step="Paso 5" label="Bienestar">
          <TodayWellbeingPanel />
        </TodayStep>
      ) : null}

      {profile.role !== "student" ? (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{isTeacher ? t.teacherDeadlinesTitle : t.deadlines}</CardTitle>
                <CardDescription>
                  {isTeacher ? t.teacherDeadlinesHint : deadlines.length ? "" : t.noDeadlines}
                </CardDescription>
              </CardHeader>
              <div className="space-y-3 px-6 pb-6">
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
                      {d.days} días
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{isTeacher ? t.teacherContinueTitle : t.continueTitle}</CardTitle>
                <CardDescription>{isTeacher ? t.teacherContinueBody : t.continueBody}</CardDescription>
              </CardHeader>
              <div className="px-6 pb-6">
                <Link href={isTeacher ? "/collaborate/exposiciones" : "/study/library"}>
                  <Button variant="secondary" className="w-full">
                    {isTeacher ? t.teacherContinueCta : "Ir a mis cuadernos"}
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{isTeacher ? t.teacherRiskTitle : t.riskTitle}</CardTitle>
              <CardDescription>
                {isTeacher ? t.teacherRiskDescription : "Prioriza lo que más pesa en tu semana."}
              </CardDescription>
            </CardHeader>
            <div className="grid gap-3 px-6 pb-6 md:grid-cols-2">
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
        </>
      ) : null}

      {profile.role === "institution" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.institutionTitle}</CardTitle>
            <CardDescription>{t.institutionBody}</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2 px-6 pb-6">
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
