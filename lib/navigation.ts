import type { LucideIcon } from "lucide-react";
import {
  Building2,
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarDays,
  FileUp,
  Heart,
  Layers3,
  LayoutDashboard,
  Library,
  LifeBuoy,
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
  GraduationCap,
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
  id: "command" | "learn" | "evaluate" | "work" | "wellbeing" | "teach" | "org" | "system" | "classes" | "social";
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
      { href: "/study/convertir", key: "convertir", icon: FileUp, roles: ["student", "learner"] },
      { href: "/study/plan", key: "studyPlan", icon: CalendarCheck, roles: ["student", "learner"] },
      { href: "/study/library/rescue", key: "rescue", icon: LifeBuoy, roles: ["student", "learner"] },
      { href: "/study/flashcards", key: "flashcards", icon: Layers3, roles: ["student", "institution", "learner"] },
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
    id: "work",
    items: [
      { href: "/community", key: "community", icon: Users, roles: ["student", "teacher", "learner"] },
      { href: "/collaborate", key: "collaborate", icon: GraduationCap, roles: ["student", "learner"] },
      { href: "/collaborate/aula-virtual", key: "classes", icon: Video, roles: ["teacher"] },
      { href: "/collaborate/aula-virtual", key: "rooms", icon: Video, roles: ["institution", "learner"] },
      { href: "/collaborate/exposiciones", key: "myPresentations", icon: Presentation, roles: ["institution", "learner"] },
      { href: "/collaborate/investigaciones", key: "myResearch", icon: Microscope, roles: ["institution", "learner"] },
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

/**
 * Menú estudiante simplificado: 9 destinos directos, sin herramientas
 * plegadas en el menú (siguen vivas dentro de sus pantallas).
 * Principal → Estudiar → Exámenes → Clases → Comunidad → Bienestar → Sistema.
 */
const studentNavStructure: Array<{ id: NavGroup["id"]; keys: NavItemKey[] }> = [
  { id: "command", keys: ["today"] },
  { id: "learn", keys: ["library", "flashcards"] },
  { id: "evaluate", keys: ["exams", "agendaCalendar"] },
  { id: "classes", keys: ["collaborate"] },
  { id: "social", keys: ["community"] },
  { id: "wellbeing", keys: ["wellbeing"] },
  { id: "system", keys: ["settings"] },
];

/**
 * Menú docente con estructura propia: no es el menú de estudiante maquillado.
 * Principal → Enseñanza → Evaluación → Comunidad → Sistema.
 */
const teacherNavStructure: Array<{ id: NavGroup["id"]; keys: NavItemKey[] }> = [
  { id: "command", keys: ["today"] },
  { id: "teach", keys: ["library", "classes"] },
  { id: "evaluate", keys: ["exams", "risk"] },
  { id: "social", keys: ["community"] },
  { id: "system", keys: ["settings"] },
];

function pickCurated(structure: Array<{ id: NavGroup["id"]; keys: NavItemKey[] }>): NavGroup[] {
  const byKey = new Map(navigationGroups.flatMap((g) => g.items).map((item) => [item.key, item]));
  return structure
    .map((group) => ({
      id: group.id,
      items: group.keys
        .map((key) => byKey.get(key))
        .filter((item): item is NavItem => Boolean(item)),
    }))
    .filter((g) => g.items.length > 0);
}

export function filterNavForRole(role: UserRole): NavGroup[] {
  if (role === "teacher") return pickCurated(teacherNavStructure);
  if (role === "student") return pickCurated(studentNavStructure);
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((g) => g.items.length > 0);
}
