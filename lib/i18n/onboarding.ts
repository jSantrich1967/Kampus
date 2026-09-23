import type { Locale } from "@/lib/i18n/nav";

export const onboardingCopy: Record<
  Locale,
  {
    brand: string;
    heroTitle: string;
    heroSubtitle: string;
    progress: (current: number, total: number) => string;
    roles: { student: string; teacher: string; institution: string; learner: string };
    fields: {
      name: string;
      university: string;
      major: string;
      semester: string;
      subjects: string;
      subjectsHint: string;
      exams: string;
      addExam: string;
      weakTopics: string;
      weakHint: string;
      missedClasses: string;
      weeklyHours: string;
      language: string;
      community: string;
      goals: string;
    };
    actions: { back: string; next: string; finish: string };
    review: string;
    chips: { add: string; removeAria: string };
  }
> = {
  es: {
    brand: "Kampus",
    heroTitle: "Tu período, con un plan que sí se puede cumplir.",
    heroSubtitle: "En 3 minutos configuramos tu ritmo, tus riesgos y tus próximos pasos.",
    progress: (c, t) => `Paso ${c} de ${t}`,
    roles: {
      student: "Estudiante",
      teacher: "Docente",
      institution: "Institución",
      learner: "Autodidacta",
    },
    fields: {
      name: "Tu nombre (opcional)",
      university: "Institución (opcional)",
      major: "Carrera / programa",
      semester: "Período",
      subjects: "Materias actuales",
      subjectsHint: "Agrega cada materia y presiona Enter.",
      exams: "Próximos exámenes (opcional)",
      addExam: "Agregar fecha",
      weakTopics: "Temas donde te sientes más flojo",
      weakHint: "Ej.: integrales, nomenclatura orgánica, casos de examen…",
      missedClasses: "Clases perdidas (aprox.)",
      weeklyHours: "Horas de estudio disponibles por semana",
      language: "Idioma preferido",
      community: "Quiero recomendaciones de comunidad y grupos",
      goals: "Meta de este mes",
    },
    actions: { back: "Atrás", next: "Siguiente", finish: "Entrar a Kampus" },
    review: "Revisa y confirma — esto alimenta tu Hoy y tu Modo aprobar.",
    chips: { add: "Añadir", removeAria: "Quitar" },
  },
};
