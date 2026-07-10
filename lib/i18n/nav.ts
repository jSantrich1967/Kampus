export type Locale = "es";

export const navCopy = {
  es: {
    groups: {
      command: "Hoy",
      learn: "Estudio",
      evaluate: "Evaluación",
      together: "Juntos",
      work: "Colaboración",
      wellbeing: "Bienestar",
      teach: "Docencia",
      org: "Institución",
      system: "Sistema",
    },
    items: {
      today: "Hoy",
      passMode: "Modo aprobar",
      rescue: "Kit de estudios del cuaderno",
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
