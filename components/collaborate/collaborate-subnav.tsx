"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { collaborateCopy, type CollaborateSubnavKey } from "@/lib/i18n/collaborate";
import { useKampus } from "@/components/kampus/kampus-provider";
import { cn } from "@/lib/cn";

const TABS: { key: CollaborateSubnavKey; href: string; label: string; teacher?: boolean }[] = [
  { key: "hub", href: "/collaborate", label: collaborateCopy.es.subnavHub },
  { key: "presentations", href: "/collaborate/exposiciones", label: collaborateCopy.es.subnavPresentations, teacher: true },
  { key: "research", href: "/collaborate/investigaciones", label: collaborateCopy.es.subnavResearch },
  { key: "studyRoom", href: "/collaborate/sala-estudio", label: collaborateCopy.es.subnavStudyRoom },
  { key: "classroom", href: "/collaborate/aula-virtual", label: collaborateCopy.es.subnavClassroom, teacher: true },
];

function activeTab(pathname: string): CollaborateSubnavKey {
  if (pathname.startsWith("/collaborate/exposiciones") || pathname.startsWith("/collaborate/presentations")) {
    return "presentations";
  }
  if (pathname.startsWith("/collaborate/investigaciones")) return "research";
  if (pathname.startsWith("/collaborate/sala-estudio")) return "studyRoom";
  if (pathname.startsWith("/collaborate/aula-virtual") || pathname.startsWith("/collaborate/rooms")) {
    return "classroom";
  }
  if (pathname === "/collaborate" || pathname === "/collaborate/") return "hub";
  return "hub";
}

export function CollaborateSubnav() {
  const pathname = usePathname() ?? "";
  const { profile } = useKampus();
  const t = collaborateCopy.es;
  const current = activeTab(pathname);
  // Los docentes solo ven las pestañas con vista docente (aula y exposiciones).
  const tabs = profile.role === "teacher" ? TABS.filter((tab) => tab.teacher) : TABS;

  return (
    <nav
      className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-1.5"
      aria-label={t.eyebrow}
    >
      {tabs.map((tab) => {
        const isActive = current === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "inline-flex min-h-11 touch-manipulation items-center rounded-xl px-3 py-2 text-sm font-medium transition",
              isActive
                ? "bg-indigo-500/25 text-white ring-1 ring-indigo-400/35"
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
