"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  Calendar,
  CalendarDays,
  Building2,
  Heart,
  Layers3,
  LayoutDashboard,
  Library,
  Microscope,
  Presentation,
  Radar,
  School,
  Settings,
  Stethoscope,
  NotebookPen,
  Trophy,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { guideCopy, type GuideSectionId } from "@/lib/i18n/guide";
import { navCopy } from "@/lib/i18n/nav";
import type { NavGroup } from "@/lib/navigation";

const SECTION_ICONS: Record<GuideSectionId, LucideIcon> = {
  today: LayoutDashboard,
  library: Library,
  flashcards: Layers3,
  exams: CalendarDays,
  agendaCalendar: Calendar,
  risk: Radar,
  passMode: Trophy,
  community: Users,
  rooms: Video,
  myPresentations: Presentation,
  myResearch: Microscope,
  wellbeing: Heart,
  diary: NotebookPen,
  psychologist: Stethoscope,
  teaching: School,
  institution: Building2,
  settings: Settings,
};

const GROUP_ORDER: NavGroup["id"][] = [
  "command",
  "learn",
  "evaluate",
  "work",
  "wellbeing",
  "teach",
  "org",
  "system",
];

const SECTION_GROUP: Record<GuideSectionId, NavGroup["id"]> = {
  today: "command",
  library: "learn",
  flashcards: "learn",
  exams: "evaluate",
  agendaCalendar: "evaluate",
  risk: "evaluate",
  passMode: "evaluate",
  community: "work",
  rooms: "work",
  myPresentations: "work",
  myResearch: "work",
  wellbeing: "wellbeing",
  diary: "wellbeing",
  psychologist: "wellbeing",
  teaching: "teach",
  institution: "org",
  settings: "system",
};

export function AppGuideHub() {
  const { profile } = useKampus();
  const t = guideCopy.es;
  const navT = navCopy.es;
  const [groupFilter, setGroupFilter] = useState<NavGroup["id"] | "all">("all");

  const sections = (() => {
    const entries = Object.entries(t.sections) as [GuideSectionId, (typeof t.sections)[GuideSectionId]][];
    return entries
      .filter(([, section]) => section.roles.includes(profile.role))
      .sort((a, b) => {
        const ga = GROUP_ORDER.indexOf(SECTION_GROUP[a[0]]);
        const gb = GROUP_ORDER.indexOf(SECTION_GROUP[b[0]]);
        return ga - gb;
      });
  })();

  const filtered =
    groupFilter === "all" ? sections : sections.filter(([id]) => SECTION_GROUP[id] === groupFilter);

  const visibleGroups = (() => {
    const set = new Set(sections.map(([id]) => SECTION_GROUP[id]));
    return GROUP_ORDER.filter((g) => set.has(g));
  })();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <Card className="border-indigo-400/25 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-300" aria-hidden />
            {t.introTitle}
          </CardTitle>
          <CardDescription className="text-slate-300">{t.introBody}</CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            "rounded-full px-3 py-1 text-xs ring-1 transition",
            groupFilter === "all"
              ? "bg-indigo-500/25 text-indigo-100 ring-indigo-400/40"
              : "bg-slate-950/60 text-slate-300 ring-white/10 hover:bg-white/5",
          )}
          onClick={() => setGroupFilter("all")}
        >
          {t.groupFilterAll}
        </button>
        {visibleGroups.map((groupId) => (
          <button
            key={groupId}
            type="button"
            className={cn(
              "rounded-full px-3 py-1 text-xs ring-1 transition",
              groupFilter === groupId
                ? "bg-indigo-500/25 text-indigo-100 ring-indigo-400/40"
                : "bg-slate-950/60 text-slate-300 ring-white/10 hover:bg-white/5",
            )}
            onClick={() => setGroupFilter(groupId)}
          >
            {navT.groups[groupId]}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {filtered.map(([id, section]) => {
          const Icon = SECTION_ICONS[id];
          return (
            <Card key={id} className="flex flex-col">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 shrink-0 text-indigo-300" aria-hidden />
                    {section.title}
                  </CardTitle>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="neutral">{navT.groups[SECTION_GROUP[id]]}</Badge>
                    {section.premium ? <Badge tone="accent">{t.labels.premium}</Badge> : null}
                  </div>
                </div>
              </CardHeader>

              <div className="flex flex-1 flex-col gap-4 px-5 pb-5 text-sm text-slate-200">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t.labels.objective}
                  </div>
                  <p className="mt-1">{section.objective}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t.labels.howItWorks}
                  </div>
                  <p className="mt-1 text-slate-300">{section.howItWorks}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t.labels.benefits}
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                    {section.benefits.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100/90">
                  <span className="font-semibold text-amber-200">{t.labels.tip}: </span>
                  {section.tip}
                </div>
                <Link href={section.href} className={buttonClasses({ size: "sm", variant: "secondary", className: "mt-auto w-fit" })}>
                  {t.labels.openSection}
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
