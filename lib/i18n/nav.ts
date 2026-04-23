export type Locale = "es";

export const navCopy = {
  es: {
    groups: {
      command: "Hoy",
      learn: "Estudiar",
      evaluate: "Evaluación",
      together: "Juntos",
      work: "Colaboración",
      teach: "Docencia",
      org: "Institución",
      system: "Sistema",
    },
    items: {
      today: "Hoy",
      passMode: "Modo aprobar",
      rescue: "Rescate de clase",
      flashcards: "Tarjetas",
      library: "Biblioteca IA",
      exams: "Exámenes",
      risk: "Radar académico",
      community: "Comunidad",
      rooms: "Salas de estudio",
      presentations: "Exposición grupal",
      teaching: "Copiloto docente",
      institution: "Panel institucional",
      settings: "Ajustes",
    },
    badges: {
      premium: "Premium",
      beta: "Beta",
    },
  },
} as const;

export type NavItemKey = keyof typeof navCopy.es.items;
