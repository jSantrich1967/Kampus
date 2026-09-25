import type { Locale } from "@/lib/i18n/nav";

export const passModeCopy: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    description: string;
    shareLabel: string;
    shareCopied: string;
    nextBlockTitle: string;
    nextBlockHint: string;
    nextBlockCta: string;
    markDone: string;
    missionProgress: (done: number, total: number, pct: number) => string;
    allDoneTitle: string;
    allDoneHint: string;
    sequenceTitle: string;
    sequenceHint: string;
    risksTitle: string;
    risksHint: string;
    materialTitle: string;
    materialHint: string;
    materialEmpty: string;
    budgetTitle: string;
    budgetMinutes: (min: number) => string;
    preparedness: (pct: number) => string;
    closeTitle: string;
    closeHint: string;
    closeErrorLabel: (n: number) => string;
    closeQuestionLabel: string;
    closeSave: string;
    closeSaved: string;
    closeComplete: string;
    fromKitBanner: (subject: string) => string;
    startQuiz: string;
    openNotebook: string;
    viewToday: string;
    quizDoneNext: string;
    riskHigh: string;
    riskMedium: string;
    riskLow: string;
    intensityTitle: string;
    intensityFull: string;
    intensityFullHint: string;
    intensityMinimal: string;
    intensityMinimalHint: string;
    practiceTitle: string;
    practiceHint: string;
    simulatorCta: string;
    flashcardsCta: string;
    backToPassMode: string;
    flashcardsTitle: string;
    flashcardsHint: (subject: string, minutes: number) => string;
    flashcardsFocus: (focus: string) => string;
    flashcardsFront: string;
    flashcardsBack: string;
    flashcardsReveal: string;
    flashcardsHide: string;
    flashcardsKnown: string;
    flashcardsReview: string;
    flashcardsDoneTitle: string;
    flashcardsDoneBody: (total: number, known: number) => string;
    flashcardsRepeat: string;
    simulatorTitle: string;
    simulatorHint: string;
    simulatorPremiumTitle: string;
    simulatorPremiumHint: string;
    simulatorPremiumCta: string;
    simulatorQuestion: (n: number, total: number) => string;
    simulatorRubricTitle: string;
    simulatorRubricProgress: (done: number, total: number) => string;
    simulatorFollowUp: string;
    simulatorPrev: string;
    simulatorNext: string;
    simulatorUnlockAll: string;
    overloadBannerTitle: string;
    overloadBannerBody: string;
    overloadSwitchMinimal: string;
    overloadKeepFull: string;
    overloadKeepMinimal: string;
    overloadAutoApplied: string;
  }
> = {
  es: {
    eyebrow: "Modo aprobar",
    title: "Menos estrés, más señal.",
    description: "Secuencia de estudio para hoy basada en urgencia, temas débiles y tiempo disponible.",
    shareLabel: "Compartir plan",
    shareCopied: "Copiado",
    nextBlockTitle: "Tu siguiente bloque",
    nextBlockHint: "Un paso a la vez — al terminar, marca hecho o deja que el quiz lo haga por ti.",
    nextBlockCta: "Empezar bloque",
    markDone: "Marcar como hecho",
    missionProgress: (done, total, pct) => `${done}/${total} bloques · ${pct}%`,
    allDoneTitle: "Plan de hoy completado",
    allDoneHint: "Repasa o descansa. Mañana Kampus recalibra con tu perfil.",
    sequenceTitle: "Secuencia completa",
    sequenceHint: "Bloques cortos con prioridad clara y enlace directo a la acción.",
    risksTitle: "Por qué este plan",
    risksHint: "Señales de riesgo por materia — estimación basada en tu perfil y fechas de examen.",
    materialTitle: "Material antes de practicar",
    materialHint: "Sin apuntes reales, el quiz usa contenido genérico y ayuda menos.",
    materialEmpty: "No hay alertas de material ahora. Sigue con tu secuencia.",
    budgetTitle: "Presupuesto diario",
    budgetMinutes: (min) => `${min} minutos`,
    preparedness: (pct) => `Preparación estimada: ${pct}%`,
    closeTitle: "Cierra el ciclo",
    closeHint: "Anota 3 errores para mañana y 1 pregunta para la próxima clase.",
    closeErrorLabel: (n) => `Error ${n} para corregir mañana`,
    closeQuestionLabel: "Pregunta para la próxima clase",
    closeSave: "Guardar cierre",
    closeSaved: "Cierre guardado",
    closeComplete: "Marcar cierre como hecho",
    fromKitBanner: (subject) => `Continúa desde tu kit de ${subject}. El plan prioriza esa materia.`,
    startQuiz: "Iniciar quiz de presión",
    openNotebook: "Abrir cuaderno con kit",
    viewToday: "Ver misión en Hoy",
    quizDoneNext: "Siguiente bloque del plan",
    riskHigh: "Alta",
    riskMedium: "Media",
    riskLow: "Baja",
    intensityTitle: "Intensidad del plan",
    intensityFull: "Plan completo",
    intensityFullHint: "Todos los bloques según tu tiempo semanal",
    intensityMinimal: "Plan mínimo (15 min)",
    intensityMinimalHint: "Tarjetas + foco + quiz express",
    practiceTitle: "Práctica avanzada",
    practiceHint: "Tarjetas del plan y simulador oral (Premium).",
    simulatorCta: "Simulador de profesor",
    flashcardsCta: "Tarjetas del plan",
    backToPassMode: "Volver a Modo aprobar",
    flashcardsTitle: "Tarjetas del plan",
    flashcardsHint: (subject, minutes) =>
      `${subject} · sprint de ${minutes} min anclado a tus temas débiles.`,
    flashcardsFocus: (focus) => (focus ? `Enfoque: ${focus}` : "Repaso activo del cuaderno"),
    flashcardsFront: "Pregunta",
    flashcardsBack: "Respuesta",
    flashcardsReveal: "Mostrar respuesta",
    flashcardsHide: "Ocultar respuesta",
    flashcardsKnown: "Lo sabía",
    flashcardsReview: "Repasar luego",
    flashcardsDoneTitle: "Sprint completado",
    flashcardsDoneBody: (total, known) =>
      `Repasaste ${total} tarjetas · marcaste ${known} como dominadas. Bloque flashcards hecho en tu misión.`,
    flashcardsRepeat: "Repetir mazo",
    simulatorTitle: "Simulador de profesor",
    simulatorHint: "Practica explicación oral con rúbrica — como un examen con el profe.",
    simulatorPremiumTitle: "Vista previa",
    simulatorPremiumHint: "Por ahora solo hay 1 pregunta. Las rondas completas no se venden todavía.",
    simulatorPremiumCta: "Vista previa",
    simulatorQuestion: (n, total) => `Pregunta ${n} de ${total}`,
    simulatorRubricTitle: "Autoevalúa tu respuesta oral",
    simulatorRubricProgress: (done, total) => `${done}/${total} criterios cubiertos`,
    simulatorFollowUp: "Seguimiento del profe:",
    simulatorPrev: "Anterior",
    simulatorNext: "Siguiente pregunta",
    simulatorUnlockAll: "Las otras preguntas no están disponibles todavía",
    overloadBannerTitle: "Mucha carga, poco tiempo",
    overloadBannerBody:
      "Activamos el plan mínimo de 15 min automáticamente. Puedes volver al plan completo si hoy tienes más tiempo.",
    overloadSwitchMinimal: "Usar plan mínimo (15 min)",
    overloadKeepFull: "Mantener plan completo",
    overloadKeepMinimal: "OK, plan mínimo",
    overloadAutoApplied: "Plan mínimo activado por tu carga de materias.",
  },
};

export function riskLabel(level: "low" | "medium" | "high", locale: Locale = "es"): string {
  const t = passModeCopy[locale];
  if (level === "high") return t.riskHigh;
  if (level === "medium") return t.riskMedium;
  return t.riskLow;
}
