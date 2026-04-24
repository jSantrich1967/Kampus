"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { KampusLogo } from "@/components/brand/kampus-logo";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { navCopy } from "@/lib/i18n/nav";
import { filterNavForRole, type NavItem } from "@/lib/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/cn";

type AppSidebarProps = {
  onNavigate?: () => void;
};

export function AppSidebar({ onNavigate }: AppSidebarProps) {
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

  function pathMatchesNavItem(item: NavItem, pathname: string): boolean {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
    if (item.key === "library" && pathname.startsWith("/study/notebook")) return true;
    return false;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-8">
        <Link href="/today" className="flex flex-col gap-2" onClick={onNavigate}>
          <KampusLogo variant="sidebar" />
          <div className="text-[11px] text-slate-400">Sistema operativo académico</div>
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
              {t.groups[group.id]}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathMatchesNavItem(item, pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                      active
                        ? "bg-white/10 text-white shadow-inner shadow-indigo-500/20 ring-1 ring-indigo-400/25"
                        : "text-slate-300 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="flex-1">{t.items[item.key]}</span>
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
          <div className="text-[11px] text-slate-500">Hecho para el ritmo real del semestre.</div>
        )}
      </div>
    </div>
  );
}
