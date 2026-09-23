import type { UserRole } from "@/lib/schemas/profile";

export type Locale = "es";

export const navCopy = {
  es: {
    groups: {
      command: "Principal",
      learn: "Estudio",
      evaluate: "Evaluación",
      work: "Colaborar",
      wellbeing: "Bienestar",
      teach: "Docencia",
      org: "Institución",
      system: "Sistema",
    },
    items: {
      today: "Hoy",
      passMode: "Modo aprobar",
      rescue: "Kit de estudios",
      flashcards: "Tarjetas",
      library: "Mis cuadernos",
      exams: "Exámenes",
      agendaCalendar: "Mi calendario",
      risk: "Radar académico",
      community: "Comunidad",
      rooms: "Aula virtual",
      myPresentations: "Mis exposiciones",
      myResearch: "Mis investigaciones",
      psychologist: "Psicólogo",
      diary: "Mi Diario",
      wellbeing: "Inicio bienestar",
      teaching: "Copiloto docente",
      institution: "Panel institucional",
      settings: "Ajustes",
      guide: "Guía de Kampus",
    },
    badges: {
      premium: "Premium",
      beta: "Beta",
      comingSoon: "Pronto",
    },
  },
} as const;

export type NavItemKey = keyof typeof navCopy.es.items;

/**
 * Etiquetas sin posesivo para el rol docente: un profesor no tiene
 * "mis exposiciones", las revisa; no lleva "mi diario" de estudiante, etc.
 */
export const teacherNavItemOverrides: Partial<Record<NavItemKey, string>> = {
  library: "Cuadernos",
  agendaCalendar: "Calendario",
  myPresentations: "Exposiciones",
  myResearch: "Investigaciones",
  diary: "Diario",
};

export function navLabelForRole(role: UserRole, key: NavItemKey): string {
  if (role === "teacher") return teacherNavItemOverrides[key] ?? navCopy.es.items[key];
  return navCopy.es.items[key];
}

/** Para docentes, el grupo "Estudio" (material de clase) se llama "Material". */
export const teacherNavGroupOverrides: Partial<Record<string, string>> = {
  learn: "Material",
};

export function navGroupLabelForRole(role: UserRole, groupId: string): string {
  const groups = navCopy.es.groups as Record<string, string>;
  if (role === "teacher") return teacherNavGroupOverrides[groupId] ?? groups[groupId];
  return groups[groupId];
};
