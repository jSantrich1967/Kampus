"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { KampusLogo } from "@/components/brand/kampus-logo";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { navCopy, navLabelForRole, navGroupLabelForRole } from "@/lib/i18n/nav";
import { shellThemeFromRole } from "@/lib/layout/shell-theme";
import { filterNavForRole, type NavItem } from "@/lib/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/cn";
import { useOpenExamsCount } from "@/hooks/use-open-exams-count";
import { useCommunityUnreadReplyCount } from "@/hooks/use-community-unread-reply-count";
import { useDiaryCheckInStatus } from "@/hooks/use-diary-check-in-status";
import { useUpcomingPresentationsCount } from "@/hooks/use-upcoming-presentations-count";
import { useUpcomingVirtualSessions } from "@/hooks/use-upcoming-virtual-sessions";
import { usePendingStudentWorksCount } from "@/hooks/use-pending-student-works-count";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { communityCopy } from "@/lib/i18n/community";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";

type AppSidebarProps = {
  onNavigate?: () => void;
  luminaMode?: boolean;
};

export function AppSidebar({ onNavigate, luminaMode = false }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, authUserId } = useKampus();
  const t = navCopy.es;
  const planLabel = profile.plan === "premium" ? "Premium" : "Gratis";
  const roleLabel =
    profile.role === "student"
      ? "Estudiante"
      : profile.role === "teacher"
        ? "Docente"
        : profile.role === "learner"
          ? "Autodidacta"
          : "Institución";
  const groups = filterNavForRole(profile.role);
  const shellTheme = shellThemeFromRole(profile.role);
  const pendingResearchCount = usePendingStudentWorksCount();
  const openExamsCount = useOpenExamsCount();
  const upcomingPresentationsCount = useUpcomingPresentationsCount();
  const upcomingVirtualSessionsCount = useUpcomingVirtualSessions(24).count;
  const collaborateT = collaborateCopy.es;
  const communityUnreadReplies = useCommunityUnreadReplyCount();
  const communityT = communityCopy.es;
  const { hasCheckedInToday: diaryCheckedInToday, loading: diaryStatusLoading } = useDiaryCheckInStatus();
  const wellbeingT = wellbeingCopy.es;

  function pathMatchesNavItem(item: NavItem, pathname: string): boolean {
    if (item.key === "library" && pathname.startsWith("/study/notebook")) return true;
    if (item.key === "exams") {
      if (pathname.startsWith("/exams/calendar")) return false;
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    }
    if (item.key === "agendaCalendar") {
      return pathname === "/exams/calendar" || pathname.startsWith("/exams/calendar/");
    }
    if (item.key === "wellbeing") {
      return pathname === "/wellbeing";
    }
    if (item.key === "diary") {
      return pathname === "/wellbeing/diary" || pathname.startsWith("/wellbeing/diary/");
    }
    if (item.key === "psychologist") {
      return pathname === "/wellbeing/psychologist" || pathname.startsWith("/wellbeing/psychologist/");
    }
    if (item.key === "myPresentations" || item.key === "myResearch" || item.key === "rooms") {
      return pathname.startsWith("/collaborate");
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-6 pt-5">
        <Link href="/today" className="flex flex-col items-start gap-2">
          <KampusLogo variant="sidebar" />
          <div className={cn("text-[11px]", luminaMode ? "font-bold uppercase tracking-widest text-purple-400" : "text-slate-400")}>
            {profile.role === "teacher"
              ? "Espacio docente · feedback y aula"
              : profile.role === "institution"
                ? "Panel institución · cohorte"
                : luminaMode
                  ? "Lumina Studio"
                  : "Sistema operativo académico"}
          </div>
        </Link>
        <div className="mt-4 flex items-center gap-2">
          <Badge tone={profile.plan === "premium" ? "success" : "neutral"}>
            {planLabel}
          </Badge>
          <Badge tone="accent">{roleLabel}</Badge>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {groups.map((group) => (
          <div key={group.id}>
            <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {navGroupLabelForRole(profile.role, group.id)}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathMatchesNavItem(item, pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-11 touch-manipulation items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                      active && luminaMode && "kampus-lumina-nav-active font-medium text-purple-300",
                      active && !luminaMode && shellTheme === "student"
                        ? "bg-white/10 text-white shadow-inner shadow-indigo-500/20 ring-1 ring-indigo-400/25"
                        : null,
                      active && shellTheme === "faculty"
                        ? "bg-teal-500/12 text-white shadow-inner shadow-teal-500/15 ring-1 ring-teal-400/35"
                        : null,
                      active && shellTheme === "institution"
                        ? "bg-amber-500/12 text-white shadow-inner shadow-amber-500/15 ring-1 ring-amber-400/35"
                        : null,
                      !active && "text-slate-300 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="flex-1">{navLabelForRole(profile.role, item.key)}</span>
                    {item.href === "/teaching" || item.href === "/institution" ? (
                      <span
                        className="shrink-0 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200"
                        title={t.badges.comingSoon}
                      >
                        {t.badges.comingSoon}
                      </span>
                    ) : null}
                    {item.key === "exams" && openExamsCount > 0 ? (
                      <span
                        className="min-w-[1.25rem] rounded-full bg-amber-500/25 px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums text-amber-100 ring-1 ring-amber-400/35"
                        aria-label={
                          openExamsCount === 1
                            ? "1 examen abierto"
                            : `${openExamsCount} exámenes abiertos`
                        }
                      >
                        {openExamsCount > 99 ? "99+" : openExamsCount}
                      </span>
                    ) : null}
                    {item.key === "myResearch" && pendingResearchCount > 0 ? (
                      <span
                        className="min-w-[1.25rem] rounded-full bg-rose-500/25 px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums text-rose-100 ring-1 ring-rose-400/30"
                        aria-label={
                          pendingResearchCount === 1
                            ? "1 entrega pendiente en investigaciones"
                            : `${pendingResearchCount} entregas pendientes en investigaciones`
                        }
                      >
                        {pendingResearchCount > 99 ? "99+" : pendingResearchCount}
                      </span>
                    ) : null}
                    {item.key === "myPresentations" && upcomingPresentationsCount > 0 ? (
                      <span
                        className="min-w-[1.25rem] rounded-full bg-violet-500/25 px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums text-violet-100 ring-1 ring-violet-400/35"
                        aria-label={collaborateT.sidebarPresentationsBadge(upcomingPresentationsCount)}
                      >
                        {upcomingPresentationsCount > 99 ? "99+" : upcomingPresentationsCount}
                      </span>
                    ) : null}
                    {item.key === "rooms" && upcomingVirtualSessionsCount > 0 ? (
                      <span
                        className="min-w-[1.25rem] rounded-full bg-teal-500/25 px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums text-teal-100 ring-1 ring-teal-400/35"
                        aria-label={collaborateT.sidebarVirtualSessionBadge(upcomingVirtualSessionsCount)}
                      >
                        {upcomingVirtualSessionsCount > 99 ? "99+" : upcomingVirtualSessionsCount}
                      </span>
                    ) : null}
                    {item.key === "community" && communityUnreadReplies > 0 ? (
                      <span
                        className="min-w-[1.25rem] rounded-full bg-emerald-500/25 px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums text-emerald-100 ring-1 ring-emerald-400/35"
                        aria-label={communityT.sidebarUnreadReplies(communityUnreadReplies)}
                      >
                        {communityUnreadReplies > 99 ? "99+" : communityUnreadReplies}
                      </span>
                    ) : null}
                    {item.key === "diary" && !diaryStatusLoading && !diaryCheckedInToday ? (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-violet-400 ring-2 ring-violet-400/30"
                        aria-label={wellbeingT.sidebarPendingCheckIn}
                        title={wellbeingT.sidebarPendingCheckIn}
                      />
                    ) : null}
                    {item.premium && profile.plan === "free" ? (
                      <span className="text-[10px] font-semibold uppercase text-amber-200/90">{t.badges.premium}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 p-4">
        {luminaMode && profile.plan === "free" ? (
          <div className="mb-4 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 p-4">
            <p className="mb-3 text-xs leading-relaxed text-purple-300">
              Sincroniza tus apuntes en todos tus dispositivos.
            </p>
            <Link
              href="/settings"
              className="block min-h-11 w-full touch-manipulation rounded-lg bg-purple-600 py-2.5 text-center text-sm font-bold leading-none text-white transition-all hover:bg-purple-500"
            >
              Upgrade to Pro
            </Link>
          </div>
        ) : null}
        {isSupabaseConfigured() && authUserId ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={async () => {
              const supabase = createSupabaseBrowserClient();
              await supabase.auth.signOut();
              onNavigate?.();
              router.push("/login");
              router.refresh();
            }}
          >
            Cerrar sesión
          </Button>
        ) : (
          <div className="text-[11px] text-slate-500">Hecho para tu ritmo de estudio.</div>
        )}
      </div>
    </div>
  );
}
