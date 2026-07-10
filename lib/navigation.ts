import type { LucideIcon } from "lucide-react";
import {
  Building2,
  BookOpen,
  Calendar,
  CalendarDays,
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
} from "lucide-react";

import type { UserRole } from "@/lib/schemas/profile";
import type { NavItemKey } from "@/lib/i18n/nav";

export type NavItem = {
  href: string;
  key: NavItemKey;
  icon: LucideIcon;
  roles: UserRole[];
  premium?: boolean;
};

export type NavGroup = {
  id: "command" | "learn" | "evaluate" | "together" | "work" | "wellbeing" | "teach" | "org" | "system";
  items: NavItem[];
};

/**
 * Opinionated IA: fewer top-level destinations, stronger daily loop (Today → Pass Mode → study hub).
 */
export const navigationGroups: NavGroup[] = [
  {
    id: "command",
    items: [
      { href: "/today", key: "today", icon: LayoutDashboard, roles: ["student", "teacher", "institution", "learner"] },
    ],
  },
  {
    id: "learn",
    items: [
      { href: "/study/library", key: "library", icon: Library, roles: ["student", "teacher", "learner"] },
      { href: "/study/flashcards", key: "flashcards", icon: Layers3, roles: ["student", "teacher", "institution", "learner"] },
    ],
  },
  {
    id: "evaluate",
    items: [
      { href: "/exams", key: "exams", icon: CalendarDays, roles: ["student", "teacher", "learner"] },
      { href: "/exams/calendar", key: "agendaCalendar", icon: Calendar, roles: ["student", "teacher", "learner"] },
      { href: "/risk", key: "risk", icon: Radar, roles: ["student", "teacher", "institution", "learner"] },
      { href: "/pass-mode", key: "passMode", icon: Trophy, roles: ["student"], premium: true },
    ],
  },
  {
    id: "together",
    items: [{ href: "/community", key: "community", icon: Users, roles: ["student", "teacher", "learner"] }],
  },
  {
    id: "work",
    items: [
      { href: "/collaborate/aula-virtual", key: "rooms", icon: Video, roles: ["student", "teacher", "institution", "learner"] },
      { href: "/collaborate/exposiciones", key: "myPresentations", icon: Presentation, roles: ["student", "teacher", "institution", "learner"] },
      { href: "/collaborate/investigaciones", key: "myResearch", icon: Microscope, roles: ["student", "teacher", "institution", "learner"] },
    ],
  },
  {
    id: "wellbeing",
    items: [
      { href: "/wellbeing", key: "wellbeing", icon: Heart, roles: ["student", "teacher", "learner"] },
      { href: "/wellbeing/diary", key: "diary", icon: NotebookPen, roles: ["student", "teacher", "learner"] },
      { href: "/wellbeing/psychologist", key: "psychologist", icon: Stethoscope, roles: ["student", "teacher", "learner"] },
    ],
  },
  {
    id: "teach",
    items: [{ href: "/teaching", key: "teaching", icon: School, roles: ["teacher"] }],
  },
  {
    id: "org",
    items: [{ href: "/institution", key: "institution", icon: Building2, roles: ["institution"] }],
  },
  {
    id: "system",
    items: [
      { href: "/guide", key: "guide", icon: BookOpen, roles: ["student", "teacher", "institution", "learner"] },
      { href: "/settings", key: "settings", icon: Settings, roles: ["student", "teacher", "institution", "learner"] },
    ],
  },
];

export function filterNavForRole(role: UserRole): NavGroup[] {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((g) => g.items.length > 0);
}
