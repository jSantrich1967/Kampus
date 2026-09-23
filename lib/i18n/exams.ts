import type { Locale } from "@/lib/i18n/nav";

export const examsCopy: Record<
  Locale,
  {
    eyebrow: string;
    listTitle: string;
    listDescriptionCloud: string;
    listDescriptionLocal: string;
    calendarCta: string;
    passModeCta: string;
    backTodayCta: string;
    loginHint: string;
    loading: string;
    loadingExam: string;
    empty: string;
    openBadge: string;
    closedBadge: string;
    openCta: string;
    dueOn: (date: string) => string;
    daysLeft: (days: number) => string;
    daysOverdue: (days: number) => string;
    estimatedTime: (time: string) => string;
    nextExamTitle: string;
    nextExamHint: string;
    nextExamCta: string;
    practiceTitle: string;
    practiceHint: string;
    practiceQuizCta: string;
    practiceFlashcardsCta: string;
    practicePassModeCta: string;
    materialTitle: string;
    materialHint: string;
    materialEmpty: string;
    materialNotebookCta: string;
    materialCalendarCta: string;
    materialUploadCta: string;
    detailBack: string;
    respondTab: string;
    attemptsTab: string;
    submitTitle: string;
    submitHint: string;
    submitDemoWarning: string;
    submitCta: string;
    submitClosed: string;
    attemptsTitle: string;
    attemptsDescriptionCloud: string;
    attemptsDescriptionLocal: string;
    attemptsEmpty: string;
    attemptsLoading: string;
    attemptSubmitted: (when: string) => string;
    attemptGraded: string;
    attemptSent: string;
    attemptLast: string;
    attemptNoFeedback: string;
    strengths: string;
    improvements: string;
    notFoundTitle: string;
    notFoundHint: string;
    loadErrorTitle: string;
    backList: string;
    postSubmitPracticeTitle: string;
    postSubmitPracticeHint: string;
    timerTitle: string;
    timerHint: string;
    timerSuggested: (min: number, max: number) => string;
    timerStart: string;
    timerPause: string;
    timerReset: string;
    timerOverSuggested: string;
    materialLoading: string;
    materialReady: (summary: string, linked: number) => string;
    materialPages: (count: number) => string;
    materialLinked: (count: number) => string;
    materialUnlinked: string;
    calendarPassModeCta: string;
    communitySubjectCta: string;
    communityExamCta: string;
  }
> = {
  es: {
    eyebrow: "Evaluación",
    listTitle: "Mis exámenes",
    listDescriptionCloud: "Tus exámenes e intentos se guardan en tu cuenta.",
    listDescriptionLocal: "Modo demo local en este navegador si no hay sesión.",
    calendarCta: "Mi calendario",
    passModeCta: "Modo aprobar",
    backTodayCta: "Volver a Hoy",
    loginHint: "Inicia sesión para cargar exámenes desde la nube.",
    loading: "Cargando exámenes…",
    loadingExam: "Cargando examen…",
    empty: "No hay exámenes abiertos todavía. Revisa tu calendario o espera a que el profe publique uno.",
    openBadge: "ABIERTO",
    closedBadge: "CERRADO",
    openCta: "Abrir",
    dueOn: (date) => `vence ${date}`,
    daysLeft: (days) => `${days} día${days === 1 ? "" : "s"}`,
    daysOverdue: (days) => `hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`,
    estimatedTime: (time) => `~${time}`,
    nextExamTitle: "Tu siguiente examen",
    nextExamHint: "Prioriza esta materia en Modo aprobar y repasa con el quiz de presión.",
    nextExamCta: "Responder ahora",
    practiceTitle: "Practicar antes del examen",
    practiceHint: "Refuerza la materia con herramientas del plan de estudio.",
    practiceQuizCta: "Quiz de presión",
    practiceFlashcardsCta: "Tarjetas del plan",
    practicePassModeCta: "Modo aprobar",
    materialTitle: "Material recomendado",
    materialHint: "Repasa apuntes y clases vinculadas antes de enviar el intento.",
    materialEmpty: "Sin apuntes detectados — el quiz usará material genérico.",
    materialNotebookCta: "Abrir cuaderno",
    materialCalendarCta: "Ver en calendario",
    materialUploadCta: "Subir apuntes",
    detailBack: "Volver a exámenes",
    respondTab: "Responder ahora",
    attemptsTab: "Mis intentos",
    submitTitle: "Enviar intento",
    submitHint: "Responde en tus palabras. Cada pregunta necesita al menos 4 caracteres.",
    submitDemoWarning:
      "En este demo la nota se ajusta según la extensión de la respuesta — no evalúa el contenido real ni sustituye la corrección de un profesor.",
    submitCta: "Enviar",
    submitClosed: "Este examen está cerrado. No se aceptan nuevos intentos.",
    attemptsTitle: "Tus intentos",
    attemptsDescriptionCloud: "Historial guardado en tu cuenta.",
    attemptsDescriptionLocal: "Historial local en tu navegador.",
    attemptsEmpty: "Aún no enviaste ningún intento.",
    attemptsLoading: "Cargando intentos…",
    attemptSubmitted: (when) => `Enviado: ${when}`,
    attemptGraded: "CALIFICADO",
    attemptSent: "ENVIADO",
    attemptLast: "Último intento enviado.",
    attemptNoFeedback: "Aún sin feedback.",
    strengths: "Fortalezas",
    improvements: "Mejoras",
    notFoundTitle: "Examen no encontrado",
    notFoundHint: "Puede que haya cambiado el id o no tengas acceso.",
    loadErrorTitle: "No se pudo cargar",
    backList: "Volver",
    postSubmitPracticeTitle: "Sigue practicando",
    postSubmitPracticeHint: "Refuerza lo aprendido antes del día del examen.",
    timerTitle: "Cronómetro sugerido",
    timerHint: " Solo orientativo — no envía el examen automáticamente.",
    timerSuggested: (min, max) =>
      min === max ? `Tiempo sugerido: ${min} min.` : `Tiempo sugerido: ${min}–${max} min.`,
    timerStart: "Iniciar",
    timerPause: "Pausar",
    timerReset: "Reiniciar",
    timerOverSuggested: "Pasaste el tiempo sugerido",
    materialLoading: "Comprobando apuntes en tu cuaderno…",
    materialReady: (summary, linked) =>
      linked > 0
        ? `${summary} — listo para practicar con material real.`
        : `${summary} — sube o vincula clases para mejorar el quiz.`,
    materialPages: (count) => `${count} apunte${count === 1 ? "" : "s"}`,
    materialLinked: (count) => `${count} vinculado${count === 1 ? "" : "s"} a clase`,
    materialUnlinked: "Sin vincular a clases",
    calendarPassModeCta: "Modo aprobar",
    communitySubjectCta: "Comunidad de la materia",
    communityExamCta: "Canal del examen",
  },
};
