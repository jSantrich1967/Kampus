"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { wellbeingCopy, type WellbeingSubnavKey } from "@/lib/i18n/wellbeing";
import { cn } from "@/lib/cn";

const TABS: { key: WellbeingSubnavKey; href: string; label: string }[] = [
  { key: "hub", href: "/wellbeing", label: wellbeingCopy.es.subnavHub },
  { key: "diary", href: "/wellbeing/diary", label: wellbeingCopy.es.subnavDiary },
  { key: "psychologist", href: "/wellbeing/psychologist", label: wellbeingCopy.es.subnavPsychologist },
];

function activeTab(pathname: string): WellbeingSubnavKey {
  if (pathname.startsWith("/wellbeing/diary")) return "diary";
  if (pathname.startsWith("/wellbeing/psychologist")) return "psychologist";
  if (pathname === "/wellbeing" || pathname === "/wellbeing/") return "hub";
  return "hub";
}

export function WellbeingSubnav() {
  const pathname = usePathname() ?? "";
  const t = wellbeingCopy.es;
  const current = activeTab(pathname);

  return (
    <nav
      className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-1.5"
      aria-label={t.eyebrow}
    >
      {TABS.map((tab) => {
        const isActive = current === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "inline-flex min-h-11 touch-manipulation items-center rounded-xl px-3 py-2 text-sm font-medium transition",
              isActive
                ? "bg-violet-500/25 text-white ring-1 ring-violet-400/35"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
