"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { PassModeIntensityToggle } from "@/components/pass-mode/pass-mode-intensity-toggle";
import { PassModeOverloadBanner } from "@/components/pass-mode/pass-mode-overload-banner";
import { PassCloseCyclePanel } from "@/components/pass-mode/pass-close-cycle-panel";
import { PassModeMaterialPanel } from "@/components/pass-mode/pass-mode-material-panel";
import { PassModeNextBlockPanel } from "@/components/pass-mode/pass-mode-next-block-panel";
import { PassModeRisksPanel } from "@/components/pass-mode/pass-mode-risks-panel";
import { useTodayContext } from "@/components/today/use-today-context";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { passModeCopy } from "@/lib/i18n/pass-mode";
import { usePassModePlan } from "@/lib/hooks/use-pass-mode-plan";
import { buildPassModeFlashcardsPath } from "@/lib/study/plan-flashcards";
import { buildProfessorSimulatorPath } from "@/lib/study/professor-simulator";
import { recordStudyActivity } from "@/lib/storage/study-streak-storage";
import {
  loadTodayMission,
  toggleTodayBlock,
} from "@/lib/storage/today-mission-storage";
import {
  getFirstOpenBlock,
  getStudyBlockActionHref,
  getStudyBlockActionLabel,
} from "@/lib/today/block-action-href";
import { syncProfileStudyStreak } from "@/lib/today/sync-profile-streak";
import { cn } from "@/lib/cn";

export function PassModePanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, setProfile } = useKampus();
  const t = passModeCopy.es;
  const { plan, intensity, setIntensity, hydrated: planHydrated, overloaded, autoMinimalApplied } = usePassModePlan();
  const prioritySubjects = useMemo(
    () => plan.subjectRisks.slice(0, 2).map((r) => r.subject),
    [plan.subjectRisks],
  );
  const { alerts, loading: materialLoading } = useTodayContext(prioritySubjects);

  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const mission = loadTodayMission();
    setCompletedIds(mission.completedBlockIds);
    setHydrated(true);
  }, []);

  const subjectFromUrl = searchParams.get("subject")?.trim();
  const fromKit = searchParams.get("from") === "kit" || searchParams.get("from") === "rescue";

  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);
  const blockIds = useMemo(() => plan.sequence.map((b) => b.id), [plan.sequence]);
  const doneCount = blockIds.filter((id) => completedSet.has(id)).length;
  const dayProgress = blockIds.length ? Math.round((doneCount / blockIds.length) * 100) : 0;
  const allDone = doneCount === blockIds.length && blockIds.length > 0;

  const nextBlock = useMemo(
    () => getFirstOpenBlock(plan, completedIds),
    [plan, completedIds],
  );
  const nextBlockIndex = nextBlock ? plan.sequence.findIndex((b) => b.id === nextBlock.id) : 0;

  const markBlockDone = useCallback(
    (blockId: string) => {
      const next = toggleTodayBlock(blockId, true);
      setCompletedIds(next.completedBlockIds);
      recordStudyActivity();
      setProfile((prev) => syncProfileStudyStreak(prev));
    },
    [setProfile],
  );

  const highlightedSubject = useMemo(() => {
    if (!subjectFromUrl) return null;
    const decoded = decodeURIComponent(subjectFromUrl).replace(/_/g, " ");
    const match = profile.subjects.find(
      (s) => s.toLowerCase() === decoded.toLowerCase() || s.replace(/\s+/g, "_").toLowerCase() === subjectFromUrl.toLowerCase(),
    );
    return match ?? decoded;
  }, [subjectFromUrl, profile.subjects]);

  if (!hydrated || !planHydrated) return null;

  const flashBlock = plan.sequence.find((b) => b.id === "flashcards");
  const topSubject = plan.subjectRisks[0]?.subject ?? profile.subjects[0] ?? "General";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          <ShareLinkButton
            pathname="/pass-mode"
            campaign="pass_mode"
            refHandle={profile.university || "kampus"}
            label={t.shareLabel}
            copiedLabel={t.shareCopied}
          />
        }
      />

      {fromKit && highlightedSubject ? (
        <div className="rounded-2xl border border-purple-500/25 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">
          {t.fromKitBanner(highlightedSubject)}
        </div>
      ) : null}

      {overloaded ? (
        <PassModeOverloadBanner
          visible
          currentIntensity={intensity}
          onSwitchToMinimal={() => setIntensity("minimal")}
          onKeepFull={() => setIntensity(intensity === "minimal" ? "minimal" : "full")}
        />
      ) : null}

      {autoMinimalApplied ? (
        <p className="text-sm text-amber-200/90">{t.overloadAutoApplied}</p>
      ) : null}

      <PassModeIntensityToggle intensity={intensity} onChange={setIntensity} planLabel={plan.planLabel} />

      {allDone ? (
        <PassModeNextBlockPanel
          block={null}
          blockIndex={plan.sequence.length}
          totalBlocks={plan.sequence.length}
          doneCount={doneCount}
          dayProgress={dayProgress}
          allDone
          isDone={false}
          onMarkDone={markBlockDone}
        />
      ) : (
        <PassModeNextBlockPanel
          block={nextBlock ?? null}
          blockIndex={nextBlockIndex}
          totalBlocks={plan.sequence.length}
          doneCount={doneCount}
          dayProgress={dayProgress}
          allDone={false}
          isDone={nextBlock ? completedSet.has(nextBlock.id) : false}
          onMarkDone={markBlockDone}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t.sequenceTitle}</CardTitle>
              <CardDescription>{t.sequenceHint}</CardDescription>
            </CardHeader>
            <div className="space-y-3 px-6 pb-6">
              {plan.sequence.map((block, idx) => {
                const done = completedSet.has(block.id);
                return (
                  <div
                    key={block.id}
                    className={cn(
                      "rounded-2xl border p-4",
                      done ? "border-emerald-500/25 bg-emerald-500/5" : "border-white/10 bg-white/5",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-white">
                        {idx + 1}. {block.title}
                        {done ? <span className="ml-2 text-xs font-normal text-emerald-300">· Hecho</span> : null}
                      </div>
                      <Badge tone={block.priority === "P1" ? "accent" : block.priority === "P2" ? "warning" : "neutral"}>
                        {block.priority}
                      </Badge>
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      {block.subject} · {block.minutes} min
                    </div>
                    <div className="mt-1 text-sm text-slate-200">Enfoque: {block.focus}</div>
                    <p className="mt-2 text-xs text-slate-400">{block.rationale}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={getStudyBlockActionHref(block)}>
                        <Button size="sm">{getStudyBlockActionLabel(block)}</Button>
                      </Link>
                      {!done ? (
                        <Button type="button" size="sm" variant="secondary" onClick={() => markBlockDone(block.id)}>
                          {t.markDone}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <PassCloseCyclePanel onComplete={() => markBlockDone("close")} />
        </div>

        <div className="space-y-5">
          <PassModeMaterialPanel alerts={alerts} loading={materialLoading} />

          <PassModeRisksPanel risks={plan.subjectRisks} />

          <Card>
            <CardHeader>
              <CardTitle>{t.practiceTitle}</CardTitle>
              <CardDescription>{t.practiceHint}</CardDescription>
            </CardHeader>
            <div className="flex flex-col gap-2 px-6 pb-6">
              <Link href={buildPassModeFlashcardsPath(flashBlock?.subject ?? topSubject, flashBlock?.minutes)}>
                <Button variant="secondary" className="w-full">
                  {t.flashcardsCta}
                </Button>
              </Link>
              <Link href={buildProfessorSimulatorPath(topSubject)}>
                <Button variant="secondary" className="w-full">
                  {t.simulatorCta}
                  {profile.plan === "free" ? " · Premium" : ""}
                </Button>
              </Link>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.budgetTitle}</CardTitle>
              <CardDescription>{t.budgetMinutes(plan.dailyBudgetMinutes)} · {plan.planLabel}</CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <Progress value={plan.preparednessScore} />
              <div className="mt-3 text-sm text-slate-300">{t.preparedness(plan.preparednessScore)}</div>
              {plan.overloadNote ? <p className="mt-3 text-xs text-amber-100/90">{plan.overloadNote}</p> : null}
            </div>
          </Card>

          {profile.plan === "free" ? (
            <Card className="border-indigo-400/30 bg-gradient-to-br from-indigo-500/10 to-cyan-400/5">
              <CardHeader>
                <CardTitle>Desbloquea Premium</CardTitle>
                <CardDescription>
                  Recalibración diaria, simulador de profesor y kits de estudio profundos sin límite.
                </CardDescription>
              </CardHeader>
              <Button type="button" className="mx-6 mb-6 w-[calc(100%-3rem)]" onClick={() => router.push("/settings")}>
                Ver planes
              </Button>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
