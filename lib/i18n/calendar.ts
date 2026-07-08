import type { Locale } from "@/lib/i18n/nav";

export const calendarCopy: Record<
  Locale,
  {
    todayFocusTitle: string;
    todayFocusHint: string;
    todayClassesTitle: string;
    noClassesToday: string;
    noSchedule: string;
    addScheduleCta: string;
    nearestExamTitle: string;
    nearestExamHint: (subject: string, days: number) => string;
    nearestExamCta: string;
    passModeCta: string;
    classClickHint: string;
    classNotesReady: string;
    classNotesMissing: string;
    diagnosticsSummary: string;
    viewMonth: string;
    viewWeek: string;
    viewCompact: string;
    goToday: string;
    saveCancellation: string;
    workDeepLinkHint: string;
    compactHint: string;
    compactEmpty: string;
    compactOpen: string;
    dragHint: string;
    dropHint: string;
    rescheduleError: string;
    communityExamCta: string;
    calendarPresentationCta: string;
    calendarStudyRoomCta: string;
    virtualClassLabel: string;
    calendarVirtualClassCta: string;
  }
> = {
  es: {
    todayFocusTitle: "Hoy en tu calendario",
    todayFocusHint: "Lo más urgente de hoy — clases y exámenes cercanos.",
    todayClassesTitle: "Clases de hoy",
    noClassesToday: "Hoy no tienes clases en tu horario.",
    noSchedule: "Configura tu horario abajo para ver clases aquí y en Hoy.",
    addScheduleCta: "Añadir clase al horario",
    nearestExamTitle: "Examen más cercano",
    nearestExamHint: (subject, days) =>
      days === 0
        ? `${subject} — ¡es hoy!`
        : days === 1
          ? `${subject} — mañana`
          : `${subject} — en ${days} días`,
    nearestExamCta: "Abrir examen",
    passModeCta: "Modo aprobar",
    classClickHint: "Clic en clase = seleccionar · Ctrl+clic = abrir cuaderno",
    classNotesReady: "Apuntes listos",
    classNotesMissing: "Sin apuntes",
    diagnosticsSummary: "Diagnóstico técnico (OCR)",
    viewMonth: "Mes",
    viewWeek: "Semana",
    viewCompact: "Agenda",
    goToday: "Hoy",
    saveCancellation: "Guardar suspensión",
    workDeepLinkHint: "Abrir entrega concreta desde el calendario",
    compactHint: "Próximas 3 semanas — vista compacta. Arrastra exámenes, trabajos y exposiciones a otra fecha en Mes o Semana.",
    compactEmpty: "No hay eventos en las próximas 3 semanas.",
    compactOpen: "Abrir",
    dragHint: "Arrastra exámenes, trabajos y exposiciones a otro día",
    dropHint: "Suelta aquí para cambiar la fecha",
    rescheduleError: "No se pudo mover el evento.",
    communityExamCta: "Preguntar en comunidad",
    calendarPresentationCta: "Ensayo",
    calendarStudyRoomCta: "Sala de estudio",
    virtualClassLabel: "Clase virtual",
    calendarVirtualClassCta: "Aula virtual",
  },
};
