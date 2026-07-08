import type { Locale } from "@/lib/i18n/nav";

export const pressureQuizCopy: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    description: (subject: string, minutes: number) => string;
    backToPlan: string;
    loadingTitle: string;
    loadingHint: (subject: string) => string;
    errorTitle: string;
    retry: string;
    openNotebook: string;
    readyTitle: string;
    readySource: (label: string) => string;
    demoSourceWarning: string;
    readyRules: (count: number, minutes: number) => string[];
    classesTitle: string;
    startQuiz: string;
    viewNotes: string;
    questionProgress: (current: number, total: number) => string;
    confirmAnswer: string;
    correct: string;
    incorrect: string;
    reviewClass: string;
    seeResults: string;
    nextQuestion: string;
    resultsTitle: string;
    resultsExcellent: string;
    resultsGood: string;
    resultsWeak: string;
    resultsByClass: string;
    reviewMissed: string;
    repeatQuiz: string;
    missionBanner: (planLabel: string) => string;
    materialWarning: string;
    uploadMaterialCta: string;
  }
> = {
  es: {
    eyebrow: "Modo aprobar",
    title: "Quiz de control de presión",
    description: (subject, minutes) =>
      `${subject} · ${minutes} min · preguntas desde tu cuaderno y clases vinculadas`,
    backToPlan: "Volver al plan",
    loadingTitle: "Preparando quiz…",
    loadingHint: (subject) => `Leyendo apuntes de «${subject}» y generando preguntas.`,
    errorTitle: "No se pudo cargar el quiz",
    retry: "Reintentar",
    openNotebook: "Abrir cuaderno",
    readyTitle: "Listo para empezar",
    readySource: (label) => `Fuente: ${label}`,
    demoSourceWarning:
      "Sin apuntes reales en el cuaderno — las preguntas serán genéricas. Sube PDFs para practicar con material de clase.",
    readyRules: (count, minutes) => [
      `${count} preguntas de opción múltiple`,
      `Cronómetro: ${minutes} minutos (como en tu plan del día)`,
      "Sin ver respuestas hasta que elijas una opción",
    ],
    classesTitle: "Clases en este quiz",
    startQuiz: "Iniciar quiz",
    viewNotes: "Ver apuntes del cuaderno",
    questionProgress: (current, total) => `Pregunta ${current} / ${total}`,
    confirmAnswer: "Confirmar respuesta",
    correct: "Correcta",
    incorrect: "Incorrecta",
    reviewClass: "Repasar esta clase",
    seeResults: "Ver resultados",
    nextQuestion: "Siguiente",
    resultsTitle: "Resultados",
    resultsExcellent: "Excelente bajo presión. Repasa mañana con un bloque más corto.",
    resultsGood: "Buen ritmo. Revisa las incorrectas en el cuaderno antes del examen.",
    resultsWeak: "Enfócate en las clases recientes del cuaderno y repite el quiz en unos días.",
    resultsByClass: "Resultado por clase",
    reviewMissed: "Repasa lo que fallaste",
    repeatQuiz: "Repetir quiz",
    missionBanner: (planLabel) => `Bloque del plan: ${planLabel}`,
    materialWarning: "Sube apuntes a tu cuaderno para que el quiz refleje tus clases reales.",
    uploadMaterialCta: "Subir material",
  },
};
