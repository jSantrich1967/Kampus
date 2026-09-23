import type { UserRole } from "@/lib/schemas/profile";

export type Locale = "es";

export const navCopy = {
  es: {
    groups: {
      command: "Principal",
      learn: "Estudiar",
      evaluate: "Exámenes",
      work: "Colaborar",
      wellbeing: "Bienestar",
      teach: "Docencia",
      org: "Institución",
      system: "Sistema",
      classes: "Clases",
      social: "Comunidad",
      followup: "Seguimiento",
    },
    items: {
      today: "Hoy",
      passMode: "Modo aprobar",
      rescue: "Kit de estudios",
      flashcards: "Tarjetas",
      library: "Mis cuadernos",
      convertir: "Convertir material",
      studyPlan: "Mi plan",
      myWorks: "Mis trabajos",
      studentNotices: "Avisos",
      exams: "Exámenes",
      agendaCalendar: "Calendario",
      risk: "Radar académico",
      community: "Comunidad",
      collaborate: "Clases",
      classes: "Clases",
      rooms: "Aula virtual",
      myPresentations: "Mis exposiciones",
      myResearch: "Mis investigaciones",
      psychologist: "Psicólogo",
      diary: "Mi Diario",
      wellbeing: "Inicio bienestar",
      teaching: "Copiloto docente",
      reviewWorks: "Revisar trabajos",
      examGenerator: "Generador de exámenes",
      issueCertificates: "Emitir certificados",
      myCertificates: "Mis certificados",
      familyReport: "Reporte familiar",
      teacherReports: "Reportes a familias",
      teacherAlerts: "Alertas de estudiantes",
      teacherNotices: "Avisos a estudiantes",
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
  exams: "Evaluaciones",
  risk: "Radar académico",
};

export function navLabelForRole(role: UserRole, key: NavItemKey): string {
  if (role === "teacher") return teacherNavItemOverrides[key] ?? navCopy.es.items[key];
  return navCopy.es.items[key];
}

/** Grupos del menú docente: Enseñanza y Comunidad en vez de Docencia/Colaborar. */
export const teacherNavGroupOverrides: Partial<Record<string, string>> = {
  teach: "Enseñanza",
  evaluate: "Evaluación",
  social: "Comunidad",
};

export function navGroupLabelForRole(role: UserRole, groupId: string): string {
  const groups = navCopy.es.groups as Record<string, string>;
  if (role === "teacher") return teacherNavGroupOverrides[groupId] ?? groups[groupId];
  return groups[groupId];
};
