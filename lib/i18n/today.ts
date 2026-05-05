import type { Locale } from "@/lib/i18n/nav";

export const todayCopy: Record<
  Locale,
  {
    greeting: (opts: { name: string; institution: string }) => string;
    tagline: string;
    passCta: string;
    rescueCta: string;
    deadlines: string;
    noDeadlines: string;
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
    teacherCalendarCta: string;
    teacherPresentationsCta: string;
    institutionTitle: string;
    institutionBody: string;
    quickQuiz: string;
    radar: string;
    premiumHint: string;
    authBypassChipLabel: string;
    authBypassChipSettings: string;
    authBypassChipDismiss: string;
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
    noDeadlines: "Agrega fechas de examen en ajustes para activar urgencia inteligente.",
    riskTitle: "Riesgo por materia",
    sequenceTitle: "Tu primer bloque hoy",
    preparedness: "Preparación estimada",
    streak: "Racha",
    continueTitle: "Continúa donde quedaste",
    continueBody: "Abre tus cuadernos para retomar material y lanzar kit de estudios o práctica desde ahí.",
    teacherTagline: "Prioriza enseñanza, evaluación y claridad para tu alumnado.",
    teacherSequenceTitle: "Tu enfoque docente hoy",
    teacherPreparednessHint: "Balance heurístico entre fechas de evaluación y carga declarada (ajusta en Ajustes).",
    teacherOverloadNote:
      "Tu disponibilidad semanal declarada es ajustada frente al número de materias: prioriza bloques cortos y revisa fechas en el Copiloto.",
    teacherContinueTitle: "Presentaciones y aula",
    teacherContinueBody: "Retoma exposiciones o el aula virtual desde un solo acceso.",
    teacherContinueCta: "Ir a exposiciones",
    teacherRiskTitle: "Seguimiento por materia",
    teacherRiskDescription: "Prioriza feedback, rúbricas y fechas donde hay más presión docente.",
    teacherCopilotCta: "Abrir Copiloto docente",
    teacherExamsCta: "Flujo de exámenes",
    teacherCalendarCta: "Calendario",
    teacherPresentationsCta: "Exposiciones",
    institutionTitle: "Salud académica del cohorte",
    institutionBody: "Riesgo agregado y señales de engagement en un solo vistazo.",
    quickQuiz: "Quiz rápido",
    radar: "Ver radar",
    premiumHint: "Premium desbloquea recalculo diario completo y simulador de profesor.",
    authBypassChipLabel: "Modo demo: no exigimos iniciar sesión",
    authBypassChipSettings: "Más en Ajustes",
    authBypassChipDismiss: "Ocultar",
  },
};
