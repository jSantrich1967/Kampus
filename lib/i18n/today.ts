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
    teacherTitle: string;
    teacherBody: string;
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
    rescueCta: "Rescatar una clase",
    deadlines: "Urgencias del calendario",
    noDeadlines: "Agrega fechas de examen en ajustes para activar urgencia inteligente.",
    riskTitle: "Riesgo por materia",
    sequenceTitle: "Tu primer bloque hoy",
    preparedness: "Preparación estimada",
    streak: "Racha",
    continueTitle: "Continúa donde quedaste",
    continueBody: "Retoma el último flujo de práctica o rescate.",
    teacherTitle: "Atajos de docente",
    teacherBody: "Publica feedback más rápido y detecta patrones de error.",
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
