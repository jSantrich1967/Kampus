"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { FlashcardsOnboardingPanel } from "@/components/study/flashcards-onboarding-panel";
import { useKampus } from "@/components/kampus/kampus-provider";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePassModePlan } from "@/lib/hooks/use-pass-mode-plan";
import { flashcardsCopy } from "@/lib/i18n/flashcards";
import { passModeCopy } from "@/lib/i18n/pass-mode";
import { navCopy } from "@/lib/i18n/nav";
import { buildPassModeFlashcardsPath, buildPlanFlashcards } from "@/lib/study/plan-flashcards";
import { buildProfessorSimulatorPath } from "@/lib/study/professor-simulator";

export function FlashcardsWorkspace() {
  const { profile, locale } = useKampus();
  const { plan } = usePassModePlan();
  const es = locale === "es";
  const t = navCopy.es;
  const fc = flashcardsCopy.es;
  const pm = passModeCopy.es;
  const focus = profile.weakTopics[0] ?? profile.subjects[0] ?? "General";
  const flashBlock = plan.sequence.find((b) => b.id === "flashcards");
  const topSubject = plan.subjectRisks[0]?.subject ?? profile.subjects[0] ?? "General";

  const cards = useMemo(() => buildPlanFlashcards(profile, plan), [profile, plan]);
  const preview = cards.slice(0, 3);
  const sessionHref = buildPassModeFlashcardsPath(flashBlock?.subject ?? topSubject, flashBlock?.minutes, {
    fromHub: true,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t.groups.learn}
        title={es ? "Tarjetas adaptativas" : "Adaptive flashcards"}
        description={
          es
            ? "Repaso breve ligado a tus temas débiles y al Modo aprobar."
            : "Short review tied to weak topics and Pass Mode."
        }
        actions={
          <ShareLinkButton
            pathname="/study/flashcards"
            campaign="quiz_deck"
            extra={{ focus }}
            refHandle={profile.university || "kampus"}
            label={es ? "Compartir mazo" : "Share deck"}
            copiedLabel={es ? "Copiado" : "Copied"}
          />
        }
      />

      <FlashcardsOnboardingPanel deckCount={cards.length} sessionHref={sessionHref} />

      <Card>
        <CardHeader>
          <CardTitle>{fc.previewTitle}</CardTitle>
          <CardDescription>
            {cards.length > 0 ? fc.previewHint : fc.previewEmpty}
          </CardDescription>
        </CardHeader>
        {preview.length > 0 ? (
          <div className="space-y-2 px-6 pb-6">
            {preview.map((card, idx) => (
              <div
                key={`${card.front}-${idx}`}
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
              >
                <p className="font-medium text-white">{card.front}</p>
                <p className="mt-1 text-xs text-slate-400">{card.back}</p>
              </div>
            ))}
            {cards.length > preview.length ? (
              <p className="text-xs text-slate-500">{fc.previewMore(cards.length - preview.length)}</p>
            ) : null}
            <Link href={sessionHref} className={buttonClasses({ size: "sm", className: "mt-2" })}>
                {fc.planCta}
              </Link>
          </div>
        ) : null}
      </Card>

      <Card className="border-purple-500/25 bg-gradient-to-br from-purple-500/10 to-transparent">
        <CardHeader>
          <CardTitle>{pm.flashcardsTitle}</CardTitle>
          <CardDescription>
            {plan.planLabel} · {fc.focusLabel(flashBlock?.focus ?? focus)}
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2 px-6 pb-6">
          <Link href={sessionHref} className={buttonClasses()}>{pm.flashcardsCta}</Link>
          <Link href="/pass-mode" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              {fc.passModeCta}
            </Link>
          <Link href="/risk" className={buttonClasses({ variant: "ghost", size: "sm" })}>
              {fc.radarCta}
            </Link>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{pm.practiceTitle}</CardTitle>
          <CardDescription>{pm.practiceHint}</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2 px-6 pb-6">
          <Link href={buildProfessorSimulatorPath(topSubject)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              {pm.simulatorCta}
              {profile.plan === "free" ? " · Premium" : ""}
            </Link>
          <Link href="/study/library/rescue" className={buttonClasses({ variant: "ghost", size: "sm" })}>
              {fc.rescueCta}
            </Link>
        </div>
      </Card>
    </div>
  );
}
