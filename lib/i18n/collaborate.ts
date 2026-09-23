import type { Locale } from "@/lib/i18n/nav";

export const collaborateCopy: Record<
  Locale,
  {
    eyebrow: string;
    hubTitle: string;
    hubDescription: string;
    presentationsTitle: string;
    presentationsHint: string;
    presentationsCta: string;
    researchTitle: string;
    researchHint: string;
    researchCta: string;
    classroomTitle: string;
    classroomHint: string;
    classroomCta: string;
    subnavHub: string;
    subnavPresentations: string;
    subnavResearch: string;
    subnavClassroom: string;
    researchPageTitle: string;
    researchPageDescription: string;
    classroomPageTitle: string;
    classroomPageDescription: string;
    presentationsPageTitle: string;
    presentationsPageDescription: string;
    calendarCta: string;
    examsCta: string;
    todayPanelTitle: string;
    todayPanelHint: string;
    todayPendingWorks: (count: number) => string;
    todayUpcomingPresentations: (count: number) => string;
    todayOpenHubCta: string;
    todayWorksCta: string;
    todayPresentationsCta: string;
    sidebarPresentationsBadge: (count: number) => string;
    statPendingWorks: string;
    statUpcomingPresentations: string;
    studyRoomTitle: string;
    studyRoomHint: string;
    studyRoomCta: string;
    studyRoomPageTitle: string;
    studyRoomPageDescription: string;
    subnavStudyRoom: string;
    studyRoomSessionTitle: string;
    studyRoomSharedGoal: string;
    studyRoomAgenda: string;
    studyRoomFocus: string;
    studyRoomFocusHint: string;
    studyRoomSharedNotes: string;
    studyRoomSharedNotesHint: string;
    studyRoomInvite: string;
    studyRoomInviteCopied: string;
    studyRoomStart: string;
    studyRoomPause: string;
    studyRoomReset: string;
    studyRoomInviteFootnote: string;
    studyRoomNotesPlaceholder: string;
    nextFocusTitle: string;
    nextFocusHint: string;
    nextFocusCta: string;
    nextFocusToday: string;
    nextFocusDays: (days: number) => string;
    nextFocusOverdue: (days: number) => string;
    studyRoomCodeLabel: (code: string) => string;
    studyRoomSharedHint: string;
    aulaLinkedTitle: (course: string) => string;
    aulaLinkedHint: string;
    aulaBackCta: string;
    todayVirtualSessionTitle: string;
    todayVirtualSessionWhen: (hoursUntil: number) => string;
    todayVirtualSessionCta: string;
    sidebarVirtualSessionBadge: (count: number) => string;
    roadmapTitle: string;
    roadmapHint: string;
    deadlineNotifyTitle: string;
    deadlineNotifyHint: string;
    deadlineNotifyOn: string;
    deadlineNotifyOff: string;
    deadlineNotifyFootnote: string;
    studyRoomCloudActive: string;
    studyRoomCloudSyncing: string;
    studyRoomCloudRealtime: string;
    studyRoomCloudError: string;
    studyRoomCloudLogin: string;
    hubFeatureDeadlineNotify: string;
    hubFeatureStudyRoomCloud: string;
    hubFeatureStudyRoomRealtime: string;
    hubFeatureVirtualEnroll: string;
    hubFeatureDeadlineServerPush: string;
    deadlineServerPushTitle: string;
    deadlineServerPushHint: string;
    deadlineServerPushOn: string;
    deadlineServerPushOff: string;
    deadlineServerPushFootnote: string;
    deadlineServerPushLoginRequired: string;
    deadlineServerPushDenied: string;
    deadlineServerPushError: string;
    deadlineServerPushOnOk: string;
    deadlineServerPushOffOk: string;
    virtualClassEnroll: string;
    virtualClassEnrolling: string;
    virtualClassEnter: string;
    virtualClassNoSeats: string;
    virtualClassEmptyHint: string;
    studyRoomPresenceConnected: (count: number) => string;
    studyRoomPresenceAlone: string;
    studyRoomPresenceYou: string;
    hubFeatureStudyRoomPresence: string;
    hubFeatureRosterManage: string;
    hubFeatureVirtualClassCalendar: string;
    virtualClassNotifyTitle: string;
    virtualClassNotifyHint: string;
    virtualClassNotifyOn: string;
    virtualClassNotifyOff: string;
    virtualClassNotifyFootnote: string;
    rosterTitle: string;
    rosterHint: string;
    rosterEnrolledLabel: string;
    rosterSeatsLeft: string;
    rosterFull: string;
    rosterAddPlaceholderEmailOrUuid: string;
    rosterEmailNotFound: string;
    rosterAddCta: string;
    rosterRemoveCta: string;
    rosterEmpty: string;
    rosterLoading: string;
    rosterLoadError: string;
    rosterAddError: string;
    rosterRemoveError: string;
    rosterAlready: string;
    createSessionTitle: string;
    createSessionHint: string;
    createSessionCourse: string;
    createSessionProfessor: string;
    createSessionRoom: string;
    createSessionRoomPlaceholder: string;
    createSessionTopic: string;
    createSessionStarts: string;
    createSessionEnds: string;
    createSessionCapacity: string;
    createSessionJoinUrl: string;
    createSessionEmbedUrl: string;
    createSessionEmbedHint: string;
    createSessionOpenEnrollment: string;
    createSessionCta: string;
    createSessionOk: string;
    createSessionError: string;
    createSessionRequired: string;
    studyRoomChatTitle: string;
    studyRoomChatHint: string;
    studyRoomChatEmpty: string;
    studyRoomChatPlaceholder: string;
    studyRoomChatSend: string;
    exportIcsCta: string;
    exportIcsHint: string;
    exportIcsEmpty: string;
    hubFeatureCreateSession: string;
    hubFeatureStudyRoomChat: string;
    hubFeatureExportIcs: string;
    virtualClassVideoTitle: string;
    virtualClassVideoHint: string;
    virtualClassVideoProvider: (provider: string) => string;
    virtualClassVideoMeetZoomHint: string;
    virtualClassVideoEmpty: string;
    virtualClassVideoOpenCall: string;
    webcalTitle: string;
    webcalHint: string;
    webcalLoading: string;
    webcalCopy: string;
    webcalCopied: string;
    webcalRotate: string;
    webcalFootnote: string;
    webcalLoginRequired: string;
    webcalError: string;
    webcalCopyError: string;
    webcalRotatedOk: string;
    hubFeatureNativeVideo: string;
    hubFeatureRosterEmail: string;
    hubFeatureWebcal: string;
    breakoutTitle: string;
    breakoutHint: string;
    breakoutLabelPlaceholder: string;
    breakoutAddCta: string;
    breakoutEnterCta: string;
    breakoutEmpty: string;
    breakoutLoading: string;
    recordingTitle: string;
    recordingHintCreator: string;
    recordingHintStudent: string;
    recordingUrlPlaceholder: string;
    recordingSaveCta: string;
    recordingSavedOk: string;
    recordingSaveError: string;
    recordingWatchCta: string;
    recordingEmpty: string;
    scheduleLinkedBadge: (classDate: string) => string;
    createSessionFromScheduleHint: (classDate: string) => string;
    createSessionFromScheduleTopic: (classDate: string) => string;
    hubFeatureBreakout: string;
    hubFeatureRecording: string;
    hubFeatureScheduleSync: string;
    studyRoomAssistantTitle: string;
    studyRoomAssistantHint: string;
    studyRoomAssistantEmpty: string;
    studyRoomAssistantPlaceholder: string;
    studyRoomAssistantSend: string;
    studyRoomAssistantThinking: string;
    studyRoomAssistantBotLabel: string;
    studyRoomAssistantYouLabel: string;
    studyRoomAssistantFootnote: string;
    studyRoomAssistantError: string;
    studyRoomAssistantEmptyReply: string;
    transcriptTitle: string;
    transcriptHintCreator: string;
    transcriptHintStudent: string;
    transcriptUploadCta: string;
    transcriptUploading: string;
    transcriptUploadFootnote: string;
    transcriptEmptyState: string;
    transcriptOk: string;
    transcriptError: string;
    transcriptEmpty: string;
    transcriptUpdatedLabel: (when: string) => string;
    institutionAttendanceTitle: string;
    institutionAttendanceHint: string;
    institutionAttendanceLoading: string;
    institutionAttendanceError: string;
    institutionAttendanceEmpty: string;
    institutionAttendanceSessions: string;
    institutionAttendanceEnrolled: string;
    institutionAttendancePresent: string;
    institutionAttendanceRate: string;
    institutionAttendanceColCourse: string;
    institutionAttendanceColDate: string;
    institutionAttendanceColEnrolled: string;
    institutionAttendanceColPresent: string;
    institutionAttendanceColRate: string;
    hubFeatureStudyRoomAssistant: string;
    hubFeatureTranscript: string;
    hubFeatureInstitutionAttendance: string;
    breakoutHintIter11: string;
    breakoutVideoTitle: string;
    breakoutVideoUrlPlaceholder: string;
    breakoutVideoSaveCta: string;
    breakoutVideoOpenCall: string;
    breakoutVideoUnsupported: string;
    breakoutVideoInRoomTitle: string;
    lmsTitle: string;
    lmsHintCreator: string;
    lmsHintStudent: string;
    lmsProviderLabel: string;
    lmsProviderGeneric: string;
    lmsBaseUrlLabel: string;
    lmsBaseUrlPlaceholder: string;
    lmsCourseIdLabel: string;
    lmsCourseIdPlaceholder: string;
    lmsSaveIntegrationCta: string;
    lmsSaveCourseCta: string;
    lmsOpenCourseCta: (provider: string) => string;
    lmsEmptyHint: string;
    lmsIntegrationSavedOk: string;
    lmsCourseSavedOk: string;
    lmsIntegrationError: string;
    lmsInstitutionTitle: string;
    lmsInstitutionHint: string;
    lmsInstitutionLoading: string;
    lmsInstitutionSavedOk: string;
    lmsInstitutionFootnote: (provider: string) => string;
    participationTitle: string;
    participationHint: string;
    participationRealtime: string;
    participationActiveNow: string;
    participationActiveHint: string;
    participationTotal: string;
    participationTotalHint: string;
    participationStatusActive: string;
    participationStatusIdle: string;
    participationHeartbeats: (count: number) => string;
    participationEmpty: string;
    participationLoading: string;
    hubFeatureBreakoutVideo: string;
    hubFeatureLms: string;
    hubFeatureParticipationLive: string;
    classroomOnboardingTitle: string;
    classroomOnboardingHint: string;
    classroomFeatureVideo: string;
    classroomFeatureRoster: string;
    classroomFeatureBreakout: string;
    classroomFeatureRecording: string;
    classroomFeatureParticipation: string;
    classroomFeatureLms: string;
    classroomTeacherSteps: string;
    classroomStudentSteps: string;
    classroomStudentEmptyHint: string;
    classroomDemoCta: string;
    classroomDemoEnterCta: string;
    classroomDemoFootnote: string;
    classroomDemoCreatedOk: string;
    classroomDemoExistsOk: string;
    classroomDemoError: string;
    presentationsOnboardingTitle: string;
    presentationsOnboardingHint: string;
    presentationsFeatureTeam: string;
    presentationsFeatureScripts: string;
    presentationsFeatureRehearsal: string;
    presentationsFeatureRecord: string;
    presentationsFeatureTutor: string;
    presentationsFeatureCalendar: string;
    presentationsFeatureAula: string;
    presentationsSteps: string;
    presentationsLocalOnlyHint: string;
    presentationsDemoCta: string;
    presentationsDemoFootnote: string;
    presentationsDemoCreatedOk: string;
    presentationsDemoExistsOk: string;
    presentationsDemoLocalOk: string;
    presentationsDemoError: string;
    researchOnboardingTitle: string;
    researchOnboardingHint: string;
    researchFeatureCalendar: string;
    researchFeatureList: string;
    researchFeatureDone: string;
    researchFeatureNotify: string;
    researchFeatureStudyRoom: string;
    researchFeatureFilters: string;
    researchSteps: string;
    researchLocalOnlyHint: string;
    researchDemoCta: string;
    researchDemoFootnote: string;
    researchDemoCreatedOk: (count: number) => string;
    researchDemoExistsOk: string;
    researchDemoLocalOk: string;
    researchDemoError: string;
  }
> = {
  es: {
    eyebrow: "Colaborar",
    hubTitle: "Trabajo en equipo y entregas",
    hubDescription:
      "Exposiciones con ensayo, investigaciones con fecha límite y aula virtual — conectado a tu calendario académico.",
    presentationsTitle: "Mis exposiciones",
    presentationsHint: "Varios decks, guiones, ensayo con cronómetro y tutor IA.",
    presentationsCta: "Abrir exposiciones",
    researchTitle: "Mis investigaciones",
    researchHint: "Trabajos y entregas ordenados por fecha — sync con calendario.",
    researchCta: "Abrir investigaciones",
    classroomTitle: "Aula virtual",
    classroomHint: "Sesiones en vivo con tu grupo (según tu institución).",
    classroomCta: "Abrir aula virtual",
    subnavHub: "Inicio",
    subnavPresentations: "Exposiciones",
    subnavResearch: "Investigaciones",
    subnavClassroom: "Aula virtual",
    researchPageTitle: "Mis investigaciones",
    researchPageDescription:
      "Registra monografías, informes y entregas con fecha límite — sincronizadas con Mi calendario, filtros de urgencia y recordatorios de Colaboración.",
    classroomPageTitle: "Aula virtual",
    classroomPageDescription:
      "Sesiones en vivo con vídeo, roster, salas breakout, grabación, transcripción, LMS y participación en tiempo real.",
    presentationsPageTitle: "Mis exposiciones",
    presentationsPageDescription:
      "Varios decks en la nube, equipo con código de convocatoria, guiones, teleprompter, ensayo con cámara, transcripción y tutor IA — enlazado al calendario y al aula virtual.",
    calendarCta: "Mi calendario",
    examsCta: "Mis exámenes",
    todayPanelTitle: "Colaboración esta semana",
    todayPanelHint: "Entregas y exposiciones con fecha — evita sorpresas de última hora.",
    todayPendingWorks: (count) =>
      count === 1 ? "1 entrega pendiente en investigaciones" : `${count} entregas pendientes en investigaciones`,
    todayUpcomingPresentations: (count) =>
      count === 1 ? "1 exposición con fecha próxima" : `${count} exposiciones con fecha próxima`,
    todayOpenHubCta: "Ver colaboración",
    todayWorksCta: "Investigaciones",
    todayPresentationsCta: "Exposiciones",
    sidebarPresentationsBadge: (count) =>
      count === 1 ? "1 exposición con fecha próxima" : `${count} exposiciones con fecha próxima`,
    statPendingWorks: "Entregas pendientes",
    statUpcomingPresentations: "Exposiciones próximas",
    studyRoomTitle: "Sala de estudio",
    studyRoomHint: "Agenda compartida, meta, notas y temporizador para sesiones en equipo.",
    studyRoomCta: "Abrir sala de estudio",
    studyRoomPageTitle: "Sala de estudio",
    studyRoomPageDescription:
      "Organiza sesiones grupales: meta, agenda, notas y temporizador de enfoque. Invita con enlace.",
    subnavStudyRoom: "Sala de estudio",
    studyRoomSessionTitle: "Nombre de sesión",
    studyRoomSharedGoal: "Meta compartida",
    studyRoomAgenda: "Agenda (una línea por ítem)",
    studyRoomFocus: "Enfoque",
    studyRoomFocusHint: "Temporizador de sesión",
    studyRoomSharedNotes: "Notas compartidas",
    studyRoomSharedNotesHint: "Para acuerdos y bloqueos del equipo.",
    studyRoomInvite: "Invitar a la sala",
    studyRoomInviteCopied: "Copiado",
    studyRoomStart: "Iniciar",
    studyRoomPause: "Pausar",
    studyRoomReset: "Reiniciar",
    studyRoomInviteFootnote: "El enlace incluye parámetros de atribución para compartir.",
    studyRoomNotesPlaceholder: "Ej. ‘Nos atascamos en el ejercicio 3’…",
    nextFocusTitle: "Próximo plazo",
    nextFocusHint: "La entrega o exposición más cercana — abre el detalle o revisa el calendario.",
    nextFocusCta: "Abrir detalle",
    nextFocusToday: "Hoy",
    nextFocusDays: (days) => (days === 1 ? "Mañana" : `En ${days} días`),
    nextFocusOverdue: (days) => `Venció hace ${Math.abs(days)} d`,
    studyRoomCodeLabel: (code) => `Sala · ${code}`,
    studyRoomSharedHint:
      "Comparte el enlace con tu equipo: cada sala tiene su código y guarda agenda y notas por separado en este dispositivo.",
    aulaLinkedTitle: (course) => `Material de ${course}`,
    aulaLinkedHint: "Abriste el planificador desde el aula virtual — el deck vinculado se selecciona automáticamente.",
    aulaBackCta: "Volver al aula virtual",
    todayVirtualSessionTitle: "Clase virtual pronto",
    todayVirtualSessionWhen: (hours) =>
      hours <= 1 ? "Empieza en menos de 1 hora" : hours <= 24 ? `Empieza en ~${Math.round(hours)} h` : "Próxima sesión",
    todayVirtualSessionCta: "Entrar a la sesión",
    sidebarVirtualSessionBadge: (count) =>
      count === 1 ? "1 clase virtual en las próximas 24 h" : `${count} clases virtuales en las próximas 24 h`,
    roadmapTitle: "Próximamente en colaboración",
    roadmapHint:
      "Moderación de chat en sala, roles de co-docente y exportación SCORM de materiales de clase.",
    deadlineNotifyTitle: "Recordatorio de entregas",
    deadlineNotifyHint: "Aviso del navegador cuando una investigación o exposición vence hoy o mañana.",
    deadlineNotifyOn: "Activar recordatorio",
    deadlineNotifyOff: "Desactivar recordatorio",
    deadlineNotifyFootnote: "Máximo un aviso al día. Requiere permiso de notificaciones.",
    studyRoomCloudActive: "Sala sincronizada en la nube — tu equipo ve los mismos cambios al compartir el código.",
    studyRoomCloudSyncing: "Guardando en la nube…",
    studyRoomCloudRealtime: "Tiempo real activo — los cambios de tu equipo aparecen al instante.",
    studyRoomCloudError: "Error de sync",
    studyRoomCloudLogin: "Inicia sesión para sincronizar la sala con tu equipo.",
    hubFeatureDeadlineNotify: "Aviso entregas",
    hubFeatureStudyRoomCloud: "Sala en nube",
    hubFeatureStudyRoomRealtime: "Sala tiempo real",
    hubFeatureVirtualEnroll: "Inscripción aula",
    hubFeatureDeadlineServerPush: "Push entregas",
    deadlineServerPushTitle: "Push desde el servidor",
    deadlineServerPushHint:
      "Recibe el aviso aunque no tengas la pestaña abierta (cron diario con entregas de hoy o mañana).",
    deadlineServerPushOn: "Activar push servidor",
    deadlineServerPushOff: "Desactivar push servidor",
    deadlineServerPushFootnote: "Usa las mismas claves VAPID que Bienestar. Requiere CRON_SECRET y migración Iter 5.",
    deadlineServerPushLoginRequired: "Inicia sesión para activar push de entregas.",
    deadlineServerPushDenied: "Permiso de notificaciones denegado.",
    deadlineServerPushError: "No se pudo registrar la suscripción push.",
    deadlineServerPushOnOk: "Push de entregas activado.",
    deadlineServerPushOffOk: "Push de entregas desactivado.",
    virtualClassEnroll: "Inscribirme",
    virtualClassEnrolling: "Inscribiendo…",
    virtualClassEnter: "Entrar al aula",
    virtualClassNoSeats: "Sin cupo",
    virtualClassEmptyHint:
      "Explora sesiones con inscripción abierta o pide al docente que te agregue al roster.",
    studyRoomPresenceConnected: (count) =>
      count === 1 ? "1 persona conectada en la sala" : `${count} personas conectadas en la sala`,
    studyRoomPresenceAlone: "Estás solo en la sala — comparte el enlace para que se unan.",
    studyRoomPresenceYou: "(tú)",
    hubFeatureStudyRoomPresence: "Presencia sala",
    hubFeatureRosterManage: "Roster docente",
    hubFeatureVirtualClassCalendar: "Clase en calendario",
    virtualClassNotifyTitle: "Recordatorio de clase virtual",
    virtualClassNotifyHint: "Aviso del navegador ~1 hora antes de una sesión en la que estás inscrito.",
    virtualClassNotifyOn: "Activar aviso de clase",
    virtualClassNotifyOff: "Desactivar aviso de clase",
    virtualClassNotifyFootnote: "Máximo un aviso por sesión y día. También verás la clase en Mi calendario.",
    rosterTitle: "Lista de alumnos (docente)",
    rosterHint: "Añade alumnos por correo (cuenta Kampus) o por UUID de usuario.",
    rosterEnrolledLabel: "inscritos",
    rosterSeatsLeft: "cupos libres",
    rosterFull: "Sin cupo",
    rosterAddPlaceholderEmailOrUuid: "correo@ejemplo.com o UUID del estudiante",
    rosterEmailNotFound: "No encontramos un usuario con ese correo.",
    rosterAddCta: "Añadir alumno",
    rosterRemoveCta: "Quitar",
    rosterEmpty: "Nadie inscrito aún — comparte la sesión o añade alumnos manualmente.",
    rosterLoading: "Cargando roster…",
    rosterLoadError: "No se pudo cargar el roster.",
    rosterAddError: "No se pudo añadir al alumno.",
    rosterRemoveError: "No se pudo quitar al alumno.",
    rosterAlready: "Ese alumno ya está inscrito.",
    createSessionTitle: "Crear sesión de aula virtual",
    createSessionHint: "Programa una clase en vivo — tus alumnos podrán inscribirse si abres el cupo.",
    createSessionCourse: "Asignatura / curso",
    createSessionProfessor: "Nombre del docente",
    createSessionRoom: "Aula / sala",
    createSessionRoomPlaceholder: "Ej. Aula 204 · Zoom",
    createSessionTopic: "Tema de la clase",
    createSessionStarts: "Inicio",
    createSessionEnds: "Fin",
    createSessionCapacity: "Cupo máximo",
    createSessionJoinUrl: "Enlace videollamada (Meet, Zoom, YouTube…)",
    createSessionEmbedUrl: "URL embed (opcional)",
    createSessionEmbedHint: "Si dejas vacío el embed, YouTube/Vimeo se detectan desde el enlace de unión.",
    createSessionOpenEnrollment: "Permitir inscripción abierta (hasta llenar cupo)",
    createSessionCta: "Publicar sesión",
    createSessionOk: "Sesión creada — ya aparece en el listado.",
    createSessionError: "No se pudo crear la sesión.",
    createSessionRequired: "Completa curso, docente e inicio.",
    studyRoomChatTitle: "Chat de la sala",
    studyRoomChatHint: "Mensajes cortos en tiempo real — ideal para dudas rápidas del equipo.",
    studyRoomChatEmpty: "Aún no hay mensajes. Escribe el primero.",
    studyRoomChatPlaceholder: "Escribe un mensaje…",
    studyRoomChatSend: "Enviar",
    exportIcsCta: "Descargar .ics",
    exportIcsHint: "Importa tus clases inscritas en Google Calendar, Outlook o Apple Calendar.",
    exportIcsEmpty: "No hay clases para exportar.",
    hubFeatureCreateSession: "Crear sesión",
    hubFeatureStudyRoomChat: "Chat sala",
    hubFeatureExportIcs: "Export .ics",
    virtualClassVideoTitle: "Clase en vivo",
    virtualClassVideoHint: "Vídeo embebido cuando la plataforma lo permite (YouTube, Vimeo…).",
    virtualClassVideoProvider: (provider) => `Reproductor ${provider}`,
    virtualClassVideoMeetZoomHint:
      "Google Meet y Zoom no permiten incrustar la llamada aquí — usa el botón para abrir la videollamada.",
    virtualClassVideoEmpty: "Aún no hay enlace de vídeo en esta sesión.",
    virtualClassVideoOpenCall: "Abrir videollamada",
    webcalTitle: "Suscripción webcal",
    webcalHint: "Tu calendario externo se actualiza solo con las clases en las que estás inscrito.",
    webcalLoading: "Generando enlace de suscripción…",
    webcalCopy: "Copiar enlace webcal",
    webcalCopied: "Copiado",
    webcalRotate: "Regenerar enlace",
    webcalFootnote: "Pega el enlace en Google Calendar → Añadir calendario → Desde URL. Requiere SUPABASE_SERVICE_ROLE_KEY en el servidor.",
    webcalLoginRequired: "Inicia sesión para obtener tu feed webcal.",
    webcalError: "No se pudo cargar el feed webcal.",
    webcalCopyError: "No se pudo copiar al portapapeles.",
    webcalRotatedOk: "Enlace regenerado — actualiza la suscripción en tu calendario.",
    hubFeatureNativeVideo: "Vídeo nativo",
    hubFeatureRosterEmail: "Roster email",
    hubFeatureWebcal: "Webcal",
    breakoutTitle: "Salas breakout",
    breakoutHint: "Grupos pequeños en salas de estudio — el docente crea salas y el equipo entra con un clic.",
    breakoutLabelPlaceholder: "Ej. Grupo A, Tema 2…",
    breakoutAddCta: "Crear sala",
    breakoutEnterCta: "Entrar",
    breakoutEmpty: "Aún no hay salas breakout. El docente puede crearlas durante la clase.",
    breakoutLoading: "Cargando salas…",
    recordingTitle: "Grabación de la clase",
    recordingHintCreator: "Pega el enlace a la grabación (Drive, YouTube, plataforma de tu centro de estudios).",
    recordingHintStudent: "Disponible cuando el docente publique el enlace.",
    recordingUrlPlaceholder: "https://…",
    recordingSaveCta: "Guardar enlace",
    recordingSavedOk: "Enlace de grabación guardado.",
    recordingSaveError: "No se pudo guardar la grabación.",
    recordingWatchCta: "Ver grabación",
    recordingEmpty: "Sin grabación publicada todavía.",
    scheduleLinkedBadge: (classDate) => `Vinculada al horario · ${classDate}`,
    createSessionFromScheduleHint: (classDate) =>
      `Datos precargados desde tu horario académico (${classDate}). Revisa y publica.`,
    createSessionFromScheduleTopic: (classDate) => `Clase del ${classDate}`,
    hubFeatureBreakout: "Breakout",
    hubFeatureRecording: "Grabación",
    hubFeatureScheduleSync: "Sync horario",
    studyRoomAssistantTitle: "Asistente IA de estudio",
    studyRoomAssistantHint:
      "Pide ayuda con la agenda, desbloquea dudas o pide un plan de repaso — usa el contexto de tu sala.",
    studyRoomAssistantEmpty: "Pregunta algo sobre la meta, la agenda o un concepto que os atasque.",
    studyRoomAssistantPlaceholder: "Ej. ¿Cómo repartimos la agenda en 45 min?",
    studyRoomAssistantSend: "Enviar",
    studyRoomAssistantThinking: "Pensando…",
    studyRoomAssistantBotLabel: "Tutor IA",
    studyRoomAssistantYouLabel: "Tú",
    studyRoomAssistantFootnote: "Apoyo pedagógico — no sustituye al docente ni resuelve evaluaciones por ti.",
    studyRoomAssistantError: "No se pudo obtener respuesta del asistente.",
    studyRoomAssistantEmptyReply: "Respuesta vacía del asistente.",
    transcriptTitle: "Transcripción de la clase",
    transcriptHintCreator: "Sube un fragmento de audio de la sesión para generar texto automático (OpenAI).",
    transcriptHintStudent: "Texto generado por el docente a partir de la grabación o audio de clase.",
    transcriptUploadCta: "Subir audio y transcribir",
    transcriptUploading: "Transcribiendo…",
    transcriptUploadFootnote: "Formatos audio o webm/mp4 cortos. Cuota diaria limitada.",
    transcriptEmptyState: "Aún no hay transcripción — sube audio cuando termine la clase.",
    transcriptOk: "Transcripción guardada.",
    transcriptError: "No se pudo transcribir el audio.",
    transcriptEmpty: "La transcripción llegó vacía.",
    transcriptUpdatedLabel: (when) => `Actualizada · ${when}`,
    institutionAttendanceTitle: "Asistencia aula virtual",
    institutionAttendanceHint:
      "Sesiones de los últimos 30 días: inscritos vs. quienes abrieron la página de la clase (señal de presencia).",
    institutionAttendanceLoading: "Cargando asistencia virtual…",
    institutionAttendanceError: "No se pudo cargar el resumen de asistencia.",
    institutionAttendanceEmpty: "Sin sesiones virtuales recientes con datos de asistencia.",
    institutionAttendanceSessions: "Sesiones",
    institutionAttendanceEnrolled: "Inscritos",
    institutionAttendancePresent: "Presentes",
    institutionAttendanceRate: "Tasa media",
    institutionAttendanceColCourse: "Curso",
    institutionAttendanceColDate: "Fecha",
    institutionAttendanceColEnrolled: "Inscritos",
    institutionAttendanceColPresent: "Presentes",
    institutionAttendanceColRate: "Tasa",
    hubFeatureStudyRoomAssistant: "Tutor IA sala",
    hubFeatureTranscript: "Transcripción",
    hubFeatureInstitutionAttendance: "Asistencia instit.",
    breakoutHintIter11:
      "Grupos pequeños con sala de estudio y vídeo en vivo (YouTube/Vimeo embebido o enlace Meet/Zoom).",
    breakoutVideoTitle: "Vídeo en vivo",
    breakoutVideoUrlPlaceholder: "https://meet.google.com/… o YouTube/Vimeo",
    breakoutVideoSaveCta: "Guardar vídeo",
    breakoutVideoOpenCall: "Abrir videollamada",
    breakoutVideoUnsupported: "Enlace de vídeo no embebible — usa el botón para abrir.",
    breakoutVideoInRoomTitle: "Vídeo en vivo del breakout",
    lmsTitle: "Enlace al LMS",
    lmsHintCreator: "Configura Moodle/Canvas y el id de curso para deep-link desde esta sesión.",
    lmsHintStudent: "Abre el curso en la plataforma de tu centro de estudios.",
    lmsProviderLabel: "Plataforma",
    lmsProviderGeneric: "Otro LMS",
    lmsBaseUrlLabel: "URL base del campus",
    lmsBaseUrlPlaceholder: "https://campus.universidad.edu",
    lmsCourseIdLabel: "Id de curso en el LMS",
    lmsCourseIdPlaceholder: "Ej. 42 o BIO-101",
    lmsSaveIntegrationCta: "Guardar integración LMS",
    lmsSaveCourseCta: "Guardar id de curso",
    lmsOpenCourseCta: (provider) => `Abrir curso en ${provider}`,
    lmsEmptyHint: "Guarda la URL base y el id de curso para habilitar el enlace.",
    lmsIntegrationSavedOk: "Integración LMS guardada.",
    lmsCourseSavedOk: "Id de curso guardado en la sesión.",
    lmsIntegrationError: "No se pudo guardar la integración LMS.",
    lmsInstitutionTitle: "Integración LMS institucional",
    lmsInstitutionHint:
      "URL base por defecto para docentes de tu institución — los cursos usan el id externo por sesión.",
    lmsInstitutionLoading: "Cargando configuración LMS…",
    lmsInstitutionSavedOk: "LMS institucional guardado.",
    lmsInstitutionFootnote: (provider) =>
      `Los docentes pueden vincular cada sesión virtual con un id de curso en ${provider}.`,
    participationTitle: "Participación en vivo",
    participationHint:
      "Señales en tiempo real mientras los alumnos tienen abierta la página de la sesión (heartbeat cada ~25 s).",
    participationRealtime: "Tiempo real",
    participationActiveNow: "Activos ahora",
    participationActiveHint: "Visto en los últimos 90 segundos",
    participationTotal: "Participantes",
    participationTotalHint: "Quienes abrieron la sesión al menos una vez",
    participationStatusActive: "En línea",
    participationStatusIdle: "Inactivo",
    participationHeartbeats: (count) => `${count} pulsos`,
    participationEmpty: "Aún no hay participantes — comparte el enlace de la sesión.",
    participationLoading: "Midiendo participación…",
    hubFeatureBreakoutVideo: "Breakout vídeo",
    hubFeatureLms: "LMS",
    hubFeatureParticipationLive: "Participación live",
    classroomOnboardingTitle: "Tu aula virtual en Kampus",
    classroomOnboardingHint:
      "Aquí publicas clases, los alumnos se inscriben y dentro de cada sesión tienes vídeo, breakout, roster y más.",
    classroomFeatureVideo: "Vídeo embebido (YouTube/Vimeo)",
    classroomFeatureRoster: "Roster e inscripción abierta",
    classroomFeatureBreakout: "Salas breakout con vídeo",
    classroomFeatureRecording: "Grabación y transcripción",
    classroomFeatureParticipation: "Participación en vivo",
    classroomFeatureLms: "Enlace al LMS",
    classroomTeacherSteps:
      "1) Crea una sesión (o usa la demo) · 2) Comparte el enlace · 3) Entra y prueba vídeo, breakout y roster.",
    classroomStudentSteps:
      "Inscríbete en una sesión con cupo libre y pulsa «Entrar al aula» para ver el vídeo, materiales y breakout.",
    classroomStudentEmptyHint:
      "Si no ves sesiones, pide a tu docente que publique una clase o que active la inscripción abierta.",
    classroomDemoCta: "Crear clase demo",
    classroomDemoEnterCta: "Entrar a la demo",
    classroomDemoFootnote: "La demo incluye vídeo de ejemplo y empieza en ~15 minutos. Requiere migraciones de Colaboración.",
    classroomDemoCreatedOk: "Clase demo creada — ya aparece en el listado.",
    classroomDemoExistsOk: "Ya tenías una demo — puedes entrar directamente.",
    classroomDemoError: "No se pudo crear la demo. ¿Aplicaste las migraciones en Supabase?",
    presentationsOnboardingTitle: "Tu espacio de exposiciones",
    presentationsOnboardingHint:
      "Planifica en equipo antes de la clase en vivo: guiones, ensayo y feedback de IA en un solo lugar.",
    presentationsFeatureTeam: "Equipo + código convocatoria",
    presentationsFeatureScripts: "Secciones y guiones",
    presentationsFeatureRehearsal: "Cronómetro de ensayo",
    presentationsFeatureRecord: "Grabación + transcripción",
    presentationsFeatureTutor: "Tutor IA (feedback)",
    presentationsFeatureCalendar: "Fecha en Mi calendario",
    presentationsFeatureAula: "Enlace al aula virtual",
    presentationsSteps:
      "1) Carga la demo o crea un deck · 2) Invita al equipo con el enlace · 3) Ensaya con cámara · 4) Pide feedback al tutor IA.",
    presentationsLocalOnlyHint:
      "Sin Supabase los datos quedan solo en este navegador. Inicia sesión para sincronizar entre dispositivos.",
    presentationsDemoCta: "Cargar exposición demo",
    presentationsDemoFootnote: "La demo trae equipo, secciones, preguntas del jurado y fecha en calendario dentro de 7 días.",
    presentationsDemoCreatedOk: "Exposición demo creada — revisa el deck activo abajo.",
    presentationsDemoExistsOk: "Ya tenías la demo — seleccionada en el listado.",
    presentationsDemoLocalOk: "Plantilla de ejemplo cargada en este dispositivo.",
    presentationsDemoError: "No se pudo crear la demo. Revisa Supabase (tabla user_presentation_decks).",
    researchOnboardingTitle: "Tus entregas e investigaciones",
    researchOnboardingHint:
      "Centraliza plazos de monografías, informes y trabajos — lo mismo que ves en Evaluación → Mi calendario.",
    researchFeatureCalendar: "Sync con Mi calendario",
    researchFeatureList: "Lista por fecha límite",
    researchFeatureDone: "Marcar como entregado",
    researchFeatureNotify: "Recordatorio de entregas",
    researchFeatureStudyRoom: "Sala de estudio (equipo)",
    researchFeatureFilters: "Filtros: vencidas / semana",
    researchSteps:
      "1) Carga la demo o añade una entrega · 2) Revisa en Mi calendario · 3) Marca entregado al terminar · 4) Activa avisos en Colaboración.",
    researchLocalOnlyHint:
      "Sin Supabase los trabajos quedan solo en este navegador. Inicia sesión para sincronizar entre dispositivos.",
    researchDemoCta: "Cargar entregas demo",
    researchDemoFootnote: "La demo añade 3 entregas de ejemplo con plazos distintos (incluye una urgente).",
    researchDemoCreatedOk: (count) =>
      count === 1 ? "1 entrega demo añadida." : `${count} entregas demo añadidas — mira la lista.`,
    researchDemoExistsOk: "Ya tenías entregas demo en tu cuenta.",
    researchDemoLocalOk: "Entregas demo guardadas en este dispositivo.",
    researchDemoError: "No se pudo crear la demo. Revisa Supabase (tabla student_works).",
  },
};

export type CollaborateSubnavKey = "hub" | "presentations" | "research" | "studyRoom" | "classroom";
