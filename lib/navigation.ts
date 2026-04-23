import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarDays,
  Compass,
  Layers3,
  LayoutDashboard,
  Library,
  Presentation,
  Radar,
  School,
  Settings,
  Sparkles,
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
  id: "command" | "learn" | "evaluate" | "together" | "work" | "teach" | "org" | "system";
  items: NavItem[];
};

/**
 * Opinionated IA: fewer top-level destinations, stronger daily loop (Today → Pass Mode → Rescue).
 */
export const navigationGroups: NavGroup[] = [
  {
    id: "command",
    items: [
      { href: "/today", key: "today", icon: LayoutDashboard, roles: ["student", "teacher", "institution"] },
      { href: "/pass-mode", key: "passMode", icon: Compass, roles: ["student"], premium: true },
    ],
  },
  {
    id: "learn",
    items: [
      { href: "/rescue", key: "rescue", icon: Sparkles, roles: ["student", "teacher"] },
      { href: "/study/flashcards", key: "flashcards", icon: Layers3, roles: ["student", "teacher"] },
      { href: "/study/library", key: "library", icon: Library, roles: ["student", "teacher"] },
    ],
  },
  {
    id: "evaluate",
    items: [
      { href: "/exams", key: "exams", icon: CalendarDays, roles: ["student", "teacher"] },
      { href: "/risk", key: "risk", icon: Radar, roles: ["student", "teacher", "institution"] },
    ],
  },
  {
    id: "together",
    items: [{ href: "/community", key: "community", icon: Users, roles: ["student", "teacher"] }],
  },
  {
    id: "work",
    items: [
      { href: "/collaborate/rooms", key: "rooms", icon: Video, roles: ["student", "teacher"] },
      { href: "/collaborate/presentations", key: "presentations", icon: Presentation, roles: ["student", "teacher"] },
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
    items: [{ href: "/settings", key: "settings", icon: Settings, roles: ["student", "teacher", "institution"] }],
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
