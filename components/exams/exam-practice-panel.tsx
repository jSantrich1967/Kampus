"use client";

import Link from "next/link";
import { Brain, Layers, Zap } from "lucide-react";

import { buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { examsCopy } from "@/lib/i18n/exams";
import { buildPassModeSubjectHref } from "@/lib/today/block-action-href";
import { buildPassModeFlashcardsPath } from "@/lib/study/plan-flashcards";
import { buildPressureQuizPath } from "@/lib/study/pressure-quiz";

type ExamPracticePanelProps = {
  subject: string;
  compact?: boolean;
};

export function ExamPracticePanel({ subject, compact = false }: ExamPracticePanelProps) {
  const t = examsCopy.es;
  const quizHref = buildPressureQuizPath(subject, 10);
  const flashcardsHref = buildPassModeFlashcardsPath(subject, 8);
  const passModeHref = buildPassModeSubjectHref(subject);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href={quizHref} className={buttonClasses({ variant: "secondary", size: "sm", className: "gap-2" })}>
            <Zap className="h-3.5 w-3.5" aria-hidden />
            {t.practiceQuizCta}
          </Link>
        <Link href={flashcardsHref} className={buttonClasses({ variant: "secondary", size: "sm", className: "gap-2" })}>
            <Layers className="h-3.5 w-3.5" aria-hidden />
            {t.practiceFlashcardsCta}
          </Link>
        <Link href={passModeHref} className={buttonClasses({ variant: "ghost", size: "sm", className: "gap-2" })}>
            <Brain className="h-3.5 w-3.5" aria-hidden />
            {t.practicePassModeCta}
          </Link>
      </div>
    );
  }

  return (
    <Card className="border-indigo-400/20 bg-indigo-500/[0.06]">
      <CardHeader>
        <CardTitle className="text-base">{t.practiceTitle}</CardTitle>
        <CardDescription>{t.practiceHint}</CardDescription>
      </CardHeader>
      <div className="flex flex-wrap gap-2 px-6 pb-6">
        <Link href={quizHref} className={buttonClasses({ size: "sm", className: "gap-2" })}>
            <Zap className="h-4 w-4" aria-hidden />
            {t.practiceQuizCta}
          </Link>
        <Link href={flashcardsHref} className={buttonClasses({ variant: "secondary", size: "sm", className: "gap-2" })}>
            <Layers className="h-4 w-4" aria-hidden />
            {t.practiceFlashcardsCta}
          </Link>
        <Link href={passModeHref} className={buttonClasses({ variant: "ghost", size: "sm", className: "gap-2" })}>
            <Brain className="h-4 w-4" aria-hidden />
            {t.practicePassModeCta}
          </Link>
      </div>
    </Card>
  );
}
