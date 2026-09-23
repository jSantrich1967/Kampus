import type { Locale } from "@/lib/i18n/nav";

export const todayCopy: Record<
  Locale,
  {
    greeting: (opts: { name: string; institution: string }) => string;
    tagline: string;
    passCta: string;
    rescueCta: string;
    deadlines: string;
    deadlinesHint: string;
    noDeadlines: string;
    addDeadlinesCta: string;
    riskTitle: string;
    sequenceTitle: string;
    preparedness: string;
    streak: string;
    continueTitle: string;
    continueBody: string;
    teacherTagline: string;
    teacherSequenceTitle: string;
    teacherPreparednessHint: string;
    teacherOverloadNote: string;
    teacherContinueTitle: string;
    teacherContinueBody: string;
    teacherContinueCta: string;
    teacherRiskTitle: string;
    teacherRiskDescription: string;
    teacherCopilotCta: string;
    teacherExamsCta: string;
    teacherCreateExamCta: string;
    teacherFirstSteps: {
      title: string;
      body: string;
      step1Title: string;
      step1Body: string;
      step1Cta: string;
      step2Title: string;
      step2Body: string;
      step2Cta: string;
      step3Title: string;
      step3Body: string;
      step3Cta: string;
    };
    teacherCalendarCta: string;
    teacherPresentationsCta: string;
    teacherGreeting: (args: { name?: string | null; institution?: string | null }) => string;
    teacherDeadlinesTitle: string;
    teacherDeadlinesHint: string;
    teacherSubjectsLabel: string;
    institutionTitle: string;
    institutionBody: string;
    quickQuiz: string;
    radar: string;
    premiumHint: string;
    authBypassChipLabel: string;
    authBypassChipSettings: string;
    authBypassChipDismiss: string;
    classTodayTitle: string;
    classTodayHint: string;
    classTodayLoading: string;
    noClassSchedule: string;
    addClassScheduleCta: string;
    noClassesToday: string;
    classStatusNow: string;
    classStatusPast: string;
    classStatusUpcoming: string;
    classNotesReady: string;
    classNotesMissing: string;
    reviewClassNotesCta: string;
    uploadAfterClassCta: string;
    prepareNotebookCta: string;
    openCalendarCta: string;
    materialAlertsTitle: string;
    materialAlertsHint: string;
    materialAllGood: string;
    openNotebooksCta: string;
    momentumTitle: string;
    streakDaysLabel: string;
    momentumWeekLabel: string;
    momentumDayStudied: string;
    momentumDayRest: string;
    momentumMissionProgress: string;
    communityDeadlineCta: (subject: string) => string;
    communityDeadlineHint: string;
  }
> = {
  es: {
    greeting: ({ name, institution }) => {
      const who = name?.trim() ? `, ${name.trim()}` : "";
      return institution ? `Hola${who} — impulsemos tu semana en ${institution}.` : `Hola${who} — impulsemos tu semana.`;
    },
    tagline: "Tu siguiente mejor paso, sin ruido.",
    passCta: "Abrir Modo aprobar",
    rescueCta: "Kit de estudios del cuaderno",
    deadlines: "Urgencias del calendario",
    deadlinesHint: "Exámenes más cercanos — prioriza estas materias en tu misión de hoy.",
    noDeadlines: "Añade fechas de examen en tu calendario para activar urgencia inteligente.",
    addDeadlinesCta: "Abrir calendario académico",
    riskTitle: "Riesgo por materia",
    sequenceTitle: "Tu primer bloque hoy",
    preparedness: "Preparación estimada",
    streak: "Racha",
    continueTitle: "Continúa donde quedaste",
    continueBody: "Abre tus cuadernos para retomar material y lanzar kit de estudios o práctica desde ahí.",
    teacherTagline: "Prioriza enseñanza, evaluación y claridad para tu alumnado.",
    teacherGreeting: ({ name, institution }) => {
      const who = name?.trim() ? `, ${name.trim()}` : "";
      return institution ? `Hola${who} — tu aula en ${institution}.` : `Hola${who} — tu semana docente.`;
    },
    teacherDeadlinesTitle: "Próximas evaluaciones",
    teacherDeadlinesHint: "Exámenes y entregas que debes aplicar o calificar.",
    teacherSubjectsLabel: "Materias a tu cargo",
    teacherSequenceTitle: "Tu enfoque docente hoy",
    teacherPreparednessHint: "Balance entre tus fechas de evaluación y tu carga declarada (ajústala en Ajustes).",
    teacherOverloadNote:
      "Tu disponibilidad semanal declarada es ajustada frente al número de materias: prioriza bloques cortos y revisa fechas en el Copiloto.",
    teacherContinueTitle: "Presentaciones y aula",
    teacherContinueBody: "Retoma exposiciones o el aula virtual desde un solo acceso.",
    teacherContinueCta: "Ir a exposiciones",
    teacherRiskTitle: "Seguimiento por materia",
    teacherRiskDescription: "Prioriza feedback, rúbricas y fechas donde hay más presión docente.",
    teacherCopilotCta: "Abrir Copiloto docente",
    teacherExamsCta: "Evaluaciones",
    teacherCreateExamCta: "Crear examen",
    teacherFirstSteps: {
      title: "Tus primeros pasos",
      body: "Tres acciones para poner tu curso en marcha. Empieza por la primera.",
      step1Title: "Crea tu primer examen",
      step1Body: "El generador lo arma por ti: materia, tema y dificultad.",
      step1Cta: "Crear examen",
      step2Title: "Programa tu primera clase",
      step2Body: "Agenda tu aula virtual con fecha, hora y enlace.",
      step2Cta: "Programar clase",
      step3Title: "Abre el copiloto docente",
      step3Body: "Rúbricas, corrección con IA y publicación de notas.",
      step3Cta: "Abrir copiloto",
    },
    teacherCalendarCta: "Calendario",
    teacherPresentationsCta: "Exposiciones",
    institutionTitle: "Salud académica del grupo",
    institutionBody: "Riesgo agregado y señales de engagement en un solo vistazo.",
    quickQuiz: "Quiz rápido",
    radar: "Ver radar",
    premiumHint: "Premium desbloquea recalculo diario completo y simulador de profesor.",
    authBypassChipLabel: "Modo demo: no exigimos iniciar sesión",
    authBypassChipSettings: "Más en Ajustes",
    authBypassChipDismiss: "Ocultar",
    classTodayTitle: "Clase de hoy",
    classTodayHint: "Tu horario conectado con cuadernos y material de clase.",
    classTodayLoading: "Cargando horario…",
    noClassSchedule: "Aún no tienes horario de clases. Añádelo en Mi calendario para ver qué toca hoy.",
    addClassScheduleCta: "Configurar horario",
    noClassesToday: "Hoy no tienes clases en tu horario. Aprovecha para repasar o avanzar en tu misión.",
    classStatusNow: "Ahora",
    classStatusPast: "Terminada",
    classStatusUpcoming: "Próxima",
    classNotesReady: "Apuntes listos",
    classNotesMissing: "Sin apuntes",
    reviewClassNotesCta: "Repasar apuntes",
    uploadAfterClassCta: "Subir apuntes",
    prepareNotebookCta: "Preparar cuaderno",
    openCalendarCta: "Calendario",
    materialAlertsTitle: "Material pendiente",
    materialAlertsHint: "Sin apuntes reales, el quiz no puede ayudarte del todo.",
    materialAllGood: "Tus cuadernos tienen material y las clases de hoy están cubiertas.",
    openNotebooksCta: "Ver mis cuadernos",
    momentumTitle: "Tu momentum",
    streakDaysLabel: "días de racha",
    momentumWeekLabel: "Últimos 7 días",
    momentumDayStudied: "Día con estudio",
    momentumDayRest: "Sin bloques completados",
    momentumMissionProgress: "Misión de hoy",
    communityDeadlineCta: (subject) => `Preguntar en ${subject}`,
    communityDeadlineHint: "Tu examen está cerca — pide una explicación a compañeros en el canal del examen.",
  },
};
