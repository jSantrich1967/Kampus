import type { Locale } from "@/lib/i18n/nav";

export const wellbeingCopy: Record<
  Locale,
  {
    eyebrow: string;
    hubTitle: string;
    hubDescription: string;
    diaryCardTitle: string;
    diaryCardHint: string;
    diaryCardCta: string;
    psychologistCardTitle: string;
    psychologistCardHint: string;
    psychologistCardCta: string;
    streakLabel: (days: number) => string;
    checkedInToday: string;
    notCheckedInToday: string;
    diaryEyebrow: string;
    diaryTitle: string;
    diaryDescription: string;
    psychologistEyebrow: string;
    psychologistTitle: string;
    psychologistDescription: string;
    todayPanelTitle: string;
    todayPanelHint: string;
    todayCheckInCta: string;
    todayCheckedInCta: string;
    todayStreak: (days: number) => string;
    todayStressCta: string;
    todayStressHint: (subject: string, days: number) => string;
    sidebarPendingCheckIn: string;
    syncInProgress: string;
    syncLoading: string;
    syncMergedBanner: (count: number) => string;
    syncOfflineHint: string;
    hubSyncHint: string;
    hubFeatureOffline: string;
    hubFeatureCloudChat: string;
    hubFeatureInsights14d: string;
    hubFeatureCheckInReminder: string;
    diaryCardHintOffline: string;
    psychologistCardHintCloud: string;
    subnavHub: string;
    subnavDiary: string;
    subnavPsychologist: string;
    roadmapTitle: string;
    roadmapHint: string;
    insightsEntries7d: string;
    insightsEntries7dHint: string;
    insightsStreak: string;
    insightsEnergy7d: string;
    insightsEnergyScale: string;
    insightsEnergyScale14d: string;
    insightsNotEnoughData: string;
    insightsMoodTrend: string;
    insightsTrendUp: string;
    insightsTrendDown: string;
    insightsTrendStable: string;
    insightsTrendUnknown: string;
    insightsTodayCheckIn: string;
    insightsLowMoodTitle: string;
    insightsLowMoodHint: string;
    insightsTalkCta: string;
    todayInsightMood: (mood: string, energy: number) => string;
    todayOpenWellbeingCta: string;
    examStressCta: string;
    psychologistExamBanner: (subject: string, days: number) => string;
    psychologistSuggestedPrompt: string;
    psychologistQuotaHint: (used: number, limit: number) => string;
    psychologistQuotaExceeded: string;
    psychologistChatRestored: string;
    psychologistChatCloudSynced: string;
    pendingQueueBanner: (count: number) => string;
    pendingQueueFlushed: (count: number) => string;
    offlineSaveHint: string;
    checkInReminderTitle: string;
    checkInReminderHint: string;
    checkInReminderCta: string;
    checkInReminderDismiss: string;
    insightsEntries14d: string;
    insightsEnergy14d: string;
    insightsWeekCompareBetter: string;
    insightsWeekCompareWorse: string;
    insightsWeekCompareSame: string;
    insightsWeekCompareUnknown: string;
    exportTitle: string;
    exportRangeLabel: (range: 7 | 14 | 30 | "all") => string;
    exportEmptyHint: string;
    exportError: string;
    exportPrivacyHint: string;
    humanSupportTitle: string;
    humanSupportHint: string;
    humanSupportOpen: string;
    humanSupportCompactTitle: string;
    humanSupportCompactHint: string;
    humanSupportEmergencyCta: string;
    humanSupportSeeAll: string;
    browserNotifyTitle: string;
    browserNotifyHint: string;
    browserNotifyDenied: string;
    browserNotifyOn: string;
    browserNotifyOff: string;
    browserNotifyBody: string;
    riskBridgeRadarTitle: string;
    riskBridgeInsightsTitle: string;
    riskBridgeHint: string;
    riskBridgeWellbeingCta: string;
    riskBridgeRadarCta: string;
    riskLevelOk: string;
    riskLevelWatch: string;
    riskLevelElevated: string;
    hubFeatureExportPdf: string;
    hubFeatureRadarBridge: string;
    hubFeatureHumanSupport: string;
    hubFeaturePwa: string;
    hubFeatureCounselorShare: string;
    hubFeatureInstitutionPulse: string;
    pwaTitle: string;
    pwaHint: string;
    pwaInstalledHint: string;
    pwaInstallCta: string;
    pwaInstalledFlash: string;
    pwaRemindersOn: string;
    pwaRemindersOff: string;
    pwaLimitHint: string;
    counselorShareTitle: string;
    counselorShareHint: string;
    counselorShareCopy: string;
    counselorShareCopied: string;
    counselorShareEmail: string;
    counselorShareLink: string;
    counselorSharePrivacy: string;
    institutionOptInTitle: string;
    institutionOptInHint: string;
    institutionOptInOn: string;
    institutionOptInOff: string;
    institutionOptInOk: string;
    institutionOptOutOk: string;
    institutionOptInError: string;
    institutionOptInNoUniversity: string;
    institutionOptInLocalOnly: string;
    institutionPulseTitle: string;
    institutionPulseHint: string;
    institutionPulseLoading: string;
    institutionPulseError: string;
    institutionPulseEmpty: string;
    institutionPulseSample: string;
    institutionPulseSampleHint: string;
    institutionPulseAvgEntries: string;
    institutionPulseAvgEntriesHint: string;
    institutionPulseAvgEnergy: string;
    institutionPulseAvgEnergyHint: string;
    institutionPulseSignals: string;
    institutionPulseSignalsHint: (watch: number, elevated: number) => string;
    hubFeatureServerPush: string;
    hubFeatureCounselorSigned: string;
    hubFeatureInstitutionDash: string;
    serverPushTitle: string;
    serverPushHint: string;
    serverPushOn: string;
    serverPushOff: string;
    serverPushOnOk: string;
    serverPushOffOk: string;
    serverPushError: string;
    serverPushLoginRequired: string;
    serverPushCronHint: string;
    counselorShareSigning: string;
    counselorShareSignedHint: string;
    counselorShareUnsignedHint: string;
    counselorShareLoginForSign: string;
    counselorVerifyLink: string;
    counselorVerifyTitle: string;
    counselorVerifyHint: string;
    counselorVerifyPlaceholder: string;
    counselorVerifyCta: string;
    counselorVerifyOk: string;
    counselorVerifyFail: string;
    counselorVerifySignedAt: string;
    counselorVerifyPageTitle: string;
    counselorVerifyPageHint: string;
    institutionDashTitle: string;
    institutionDashHint: string;
    institutionDashLoading: string;
    institutionDashError: string;
    institutionDashEmpty: string;
    institutionDashParticipation: string;
    institutionDashAvgLowMood: string;
    institutionDashAvgLowMoodHint: string;
    institutionDashAvgStress: string;
    institutionDashAvgStressHint: string;
    institutionDashActiveSignals: string;
    institutionDashRiskMix: string;
    institutionDashEnergyTrend: string;
    hubFeatureCounselorAlert: string;
    hubFeatureUniversityServices: string;
    hubFeatureFhirExport: string;
    counselorAlertTitle: string;
    counselorAlertHint: string;
    counselorAlertAutoOn: string;
    counselorAlertAutoOff: string;
    counselorAlertManualCta: string;
    counselorAlertManualOk: string;
    counselorAlertDuplicate: string;
    counselorAlertError: string;
    counselorAlertLoginRequired: string;
    counselorAlertPrivacy: string;
    counselorAlertActiveSignal: (level: string, score: number) => string;
    counselorAlertInstitutionTitle: string;
    counselorAlertInstitutionHint: string;
    counselorAlertInstitutionLoading: string;
    counselorAlertInstitutionError: string;
    counselorAlertInstitutionEmpty: string;
    counselorAlertInstitutionTotal: string;
    counselorAlertInstitutionTotalHint: string;
    counselorAlertInstitutionWatchHint: string;
    counselorAlertInstitutionElevatedHint: string;
    counselorAlertInstitutionAuto: string;
    counselorAlertInstitutionAutoHint: (manual: number) => string;
    universityServicesTitle: string;
    universityServicesHint: string;
    universityServicesHintMatched: (name: string) => string;
    universityServicesDisclaimer: string;
    fhirExportTitle: string;
    fhirExportIncludeNarrative: string;
    fhirExportRangeLabel: (range: 7 | 14 | 30 | "all") => string;
    fhirExportEmptyHint: string;
    fhirExportError: string;
    fhirExportPrivacyHint: string;
    institutionIntegrationTitle: string;
    institutionIntegrationHint: string;
    institutionIntegrationWebhookTitle: string;
    institutionIntegrationWebhookHint: string;
    institutionIntegrationCsvCta: string;
    institutionIntegrationCsvOk: string;
    institutionIntegrationCsvEmpty: string;
    institutionIntegrationCsvError: string;
  }
> = {
  es: {
    eyebrow: "Bienestar",
    hubTitle: "Tu espacio de cuidado",
    hubDescription:
      "Diario privado y apoyo emocional con IA — integrado en tu semana de estudio, sin presión de rendimiento.",
    diaryCardTitle: "Mi Diario",
    diaryCardHint: "Check-in de ánimo, gratitud breve e intención para mañana.",
    diaryCardHintOffline: "Check-in de ánimo con cola offline — escribe aunque no haya red.",
    diaryCardCta: "Abrir diario",
    psychologistCardTitle: "Apoyo emocional",
    psychologistCardHint: "Habla de estrés, sueño o exámenes. No sustituye terapia clínica.",
    psychologistCardHintCloud: "Habla de estrés o exámenes. La conversación se guarda en tu cuenta.",
    psychologistCardCta: "Iniciar conversación",
    streakLabel: (days) => (days === 1 ? "1 día de racha" : `${days} días de racha`),
    checkedInToday: "Ya escribiste hoy — buen ritual.",
    notCheckedInToday: "Aún no hay entrada de hoy.",
    diaryEyebrow: "Bienestar",
    diaryTitle: "Mi Diario",
    diaryDescription:
      "Un ritual privado para ordenar el día: ánimo, gratitud breve, reflexión con pregunta guía e intención para mañana.",
    psychologistEyebrow: "Bienestar",
    psychologistTitle: "Apoyo emocional (no es terapia clínica)",
    psychologistDescription:
      "Espacio para hablar de estrés, ánimo, estudios o lo que te preocupa, con IA en estilo psicoeducativo prudente.",
    todayPanelTitle: "Bienestar hoy",
    todayPanelHint: "Un minuto de check-in mejora foco y reduce rumiación antes de estudiar.",
    todayCheckInCta: "Escribir en mi diario",
    todayCheckedInCta: "Ver entrada de hoy",
    todayStreak: (days) => (days === 0 ? "Empieza tu racha hoy" : `Racha diario: ${days} día${days === 1 ? "" : "s"}`),
    todayStressCta: "Hablar del estrés",
    todayStressHint: (subject, days) =>
      days === 0
        ? `${subject} — ¡es hoy! Un espacio para ordenar la ansiedad.`
        : days === 1
          ? `${subject} — mañana. Respira y planifica con calma.`
          : `${subject} — en ${days} días. Anticipa el nervio con apoyo.`,
    sidebarPendingCheckIn: "Check-in de diario pendiente hoy",
    syncInProgress: "Sincronizando entradas con tu cuenta…",
    syncLoading: "Cargando diario…",
    syncMergedBanner: (count) =>
      count === 1
        ? "Se subió 1 entrada local a tu cuenta."
        : `Se subieron ${count} entradas locales a tu cuenta.`,
    syncOfflineHint: "Sin conexión: mostrando la copia guardada en este dispositivo.",
    hubSyncHint:
      "Con sesión, el diario y el chat se sincronizan con la nube. Sin red, los cambios del diario se guardan aquí y se suben al reconectar.",
    hubFeatureOffline: "Diario offline",
    hubFeatureCloudChat: "Chat en nube",
    hubFeatureInsights14d: "Insights 14 días",
    hubFeatureCheckInReminder: "Recordatorio 18:00",
    hubFeatureExportPdf: "Exportar PDF",
    hubFeatureRadarBridge: "Puente Radar",
    hubFeatureHumanSupport: "Apoyo humano",
    hubFeaturePwa: "App instalable",
    hubFeatureCounselorShare: "Resumen orientador",
    hubFeatureInstitutionPulse: "Pulse institución",
    hubFeatureServerPush: "Push servidor 18:00",
    hubFeatureCounselorSigned: "Resumen firmado",
    hubFeatureInstitutionDash: "Dashboard institución",
    subnavHub: "Inicio",
    subnavDiary: "Mi Diario",
    subnavPsychologist: "Apoyo emocional",
    roadmapTitle: "Próximamente en bienestar",
    roadmapHint:
      "Sincronización bidireccional con SAPA, informes clínicos completos y alertas multicanal (SMS/email).",
    insightsEntries7d: "Entradas (7 días)",
    insightsEntries7dHint: "Ritmo de check-in reciente",
    insightsStreak: "Racha actual",
    insightsEnergy7d: "Energía media (7 días)",
    insightsEnergy14d: "Energía media (14 días)",
    insightsEnergyScale: "Promedio 1–5 últimos 7 días",
    insightsEnergyScale14d: "Promedio 1–5 últimos 14 días",
    insightsNotEnoughData: "Escribe más días para ver tendencia",
    insightsMoodTrend: "Tendencia de ánimo",
    insightsTrendUp: "Mejorando",
    insightsTrendDown: "Más bajo",
    insightsTrendStable: "Estable",
    insightsTrendUnknown: "Sin datos",
    insightsTodayCheckIn: "Check-in de hoy:",
    insightsLowMoodTitle: "Ánimo bajo varios días",
    insightsLowMoodHint: "Varios días recientes con ánimo bajo o etiqueta de estrés — el apoyo emocional puede ayudarte a ordenar.",
    insightsTalkCta: "Hablar con apoyo IA",
    todayInsightMood: (mood, energy) => `Hoy registraste ánimo ${mood} y energía ${energy}/5.`,
    todayOpenWellbeingCta: "Ver bienestar",
    examStressCta: "Hablar del estrés",
    psychologistExamBanner: (subject, days) =>
      days === 0
        ? `Examen de ${subject} hoy — el chat puede ayudarte a regular la ansiedad.`
        : days === 1
          ? `Examen de ${subject} mañana — anticipa el nervio con calma.`
          : `Examen de ${subject} en ${days} días — prepara tu mente sin quemarte.`,
    psychologistSuggestedPrompt: "Sugerencia para empezar",
    psychologistQuotaHint: (used, limit) => `Mensajes IA hoy: ${used}/${limit}`,
    psychologistQuotaExceeded: "Has alcanzado el límite diario de mensajes IA. Vuelve mañana o escribe en tu diario.",
    psychologistChatRestored: "Se restauró tu última conversación en este dispositivo.",
    psychologistChatCloudSynced: "Tu conversación se sincroniza con tu cuenta (privada, solo tú).",
    pendingQueueBanner: (count) =>
      count === 1
        ? "1 cambio del diario pendiente de subir — se enviará al reconectar."
        : `${count} cambios del diario pendientes de subir — se enviarán al reconectar.`,
    pendingQueueFlushed: (count) =>
      count === 1 ? "Se sincronizó 1 cambio pendiente del diario." : `Se sincronizaron ${count} cambios pendientes del diario.`,
    offlineSaveHint: "Guardado en este dispositivo. Se subirá a tu cuenta cuando haya conexión.",
    checkInReminderTitle: "¿Cómo ha ido tu día?",
    checkInReminderHint: "Un minuto en el diario cierra el día y protege tu racha.",
    checkInReminderCta: "Escribir ahora",
    checkInReminderDismiss: "Recordar mañana",
    insightsEntries14d: "Entradas (14 días)",
    insightsWeekCompareBetter: "Esta semana con más energía",
    insightsWeekCompareWorse: "Esta semana con menos energía",
    insightsWeekCompareSame: "Energía estable entre semanas",
    insightsWeekCompareUnknown: "Compara semanas escribiendo más días",
    exportTitle: "Exportar diario",
    exportRangeLabel: (range) =>
      range === "all" ? "Todo (PDF)" : range === 7 ? "7 días (PDF)" : range === 14 ? "14 días (PDF)" : "30 días (PDF)",
    exportEmptyHint: "No hay entradas en ese rango para exportar.",
    exportError: "No se pudo generar el PDF. Inténtalo de nuevo.",
    exportPrivacyHint: "El PDF se descarga solo en tu dispositivo — no se sube a la nube.",
    humanSupportTitle: "Apoyo humano recomendado",
    humanSupportHint: "La IA ayuda a ordenar el día; estas líneas son para cuando necesitas a alguien real.",
    humanSupportOpen: "Ver más",
    humanSupportCompactTitle: "¿Necesitas hablar con alguien real?",
    humanSupportCompactHint: "El chat IA no sustituye atención profesional ni emergencias.",
    humanSupportEmergencyCta: "Llamar al 171",
    humanSupportSeeAll: "Recursos de apoyo",
    browserNotifyTitle: "Aviso del navegador (18:00)",
    browserNotifyHint: "Si tienes la pestaña abierta o en segundo plano, te avisa de hacer check-in.",
    browserNotifyDenied: "Bloqueaste notificaciones en el navegador. Actívalas en ajustes del sitio.",
    browserNotifyOn: "Activar aviso",
    browserNotifyOff: "Desactivar aviso",
    browserNotifyBody: "Un minuto en el diario cierra el día y protege tu racha.",
    riskBridgeRadarTitle: "Señal de bienestar (diario)",
    riskBridgeInsightsTitle: "Tu diario y el Radar académico",
    riskBridgeHint: "Patrones recientes de ánimo/estrés — complementa el riesgo académico, no lo reemplaza.",
    riskBridgeWellbeingCta: "Ir a Bienestar",
    riskBridgeRadarCta: "Ver Radar académico",
    riskLevelOk: "Estable",
    riskLevelWatch: "Vigilar",
    riskLevelElevated: "Priorizar cuidado",
    pwaTitle: "Instalar Kampus (PWA)",
    pwaHint: "Instala la app para acceso rápido al diario y recordatorios con service worker.",
    pwaInstalledHint: "App instalada — los recordatorios PWA funcionan mejor en segundo plano.",
    pwaInstallCta: "Instalar app",
    pwaInstalledFlash: "¡App instalada!",
    pwaRemindersOn: "Activar recordatorios PWA",
    pwaRemindersOff: "Desactivar recordatorios PWA",
    pwaLimitHint: "Sin push de servidor, el aviso local requiere app instalada o pestaña reciente.",
    counselorShareTitle: "Compartir resumen con orientador",
    counselorShareHint: "Solo métricas agregadas — sin texto privado del diario. Tú decides con quién compartirlo.",
    counselorShareCopy: "Copiar resumen",
    counselorShareCopied: "Copiado",
    counselorShareEmail: "Enviar por correo",
    counselorShareLink: "Copiar enlace Bienestar",
    counselorSharePrivacy: "No incluye reflexiones ni gratitud — solo hábitos y señales de la última semana.",
    institutionOptInTitle: "Compartir pulse anónimo con tu institución",
    institutionOptInHint:
      "Solo promedios de check-in (energía, estrés, ánimo bajo). Nunca el contenido escrito. Puedes desactivarlo cuando quieras.",
    institutionOptInOn: "Activar pulse institucional",
    institutionOptInOff: "Dejar de compartir",
    institutionOptInOk: "Pulse actualizado — gracias por contribuir de forma anónima.",
    institutionOptOutOk: "Dejaste de compartir pulse institucional.",
    institutionOptInError: "No se pudo sincronizar el pulse. Reintenta con sesión activa.",
    institutionOptInNoUniversity: "Añade tu centro de estudios en Ajustes para vincular el pulse institucional.",
    institutionOptInLocalOnly: "Inicia sesión para que el pulse llegue al panel institucional.",
    institutionPulseTitle: "Pulse de bienestar (opt-in)",
    institutionPulseHint: "Agregado anónimo de estudiantes que activaron compartir pulse en Bienestar.",
    institutionPulseLoading: "Cargando pulse de bienestar…",
    institutionPulseError: "No se pudo cargar el pulse de bienestar.",
    institutionPulseEmpty: "Aún no hay contribuciones opt-in esta quincena.",
    institutionPulseSample: "Contribuciones",
    institutionPulseSampleHint: "Estudiantes con opt-in activo (14 días)",
    institutionPulseAvgEntries: "Media entradas 7d",
    institutionPulseAvgEntriesHint: "Ritmo de check-in agregado",
    institutionPulseAvgEnergy: "Energía media 7d",
    institutionPulseAvgEnergyHint: "Escala 1–5 autoinformada",
    institutionPulseSignals: "Señales activas",
    institutionPulseSignalsHint: (watch, elevated) =>
      `${watch} vigilar · ${elevated} priorizar cuidado`,
    serverPushTitle: "Push del servidor (18:00)",
    serverPushHint:
      "Recibe el recordatorio de check-in aunque cierres el navegador. Requiere sesión y permiso de notificaciones.",
    serverPushOn: "Activar push servidor",
    serverPushOff: "Desactivar push servidor",
    serverPushOnOk: "Push activado — recibirás avisos desde el servidor.",
    serverPushOffOk: "Push del servidor desactivado en este dispositivo.",
    serverPushError: "No se pudo registrar el dispositivo. Revisa sesión y permisos.",
    serverPushLoginRequired: "Inicia sesión para guardar tu suscripción push en la nube.",
    serverPushCronHint:
      "El envío masivo a las 18:00 usa un cron con CRON_SECRET (ver .env.example). Sin VAPID keys el panel no aparece.",
    counselorShareSigning: "Firmando resumen…",
    counselorShareSignedHint: "Resumen firmado — tu orientador puede verificar la autenticidad.",
    counselorShareUnsignedHint: "Firma no disponible (falta secreto en servidor). Se copia resumen sin firma.",
    counselorShareLoginForSign: "Inicia sesión para incluir firma verificable en el resumen.",
    counselorVerifyLink: "Verificar firma",
    counselorVerifyTitle: "Verificar resumen de estudiante",
    counselorVerifyHint: "Pega el texto completo que te envió el estudiante (incluye bloque «Verificación Kampus»).",
    counselorVerifyPlaceholder: "Pega aquí el resumen con firma…",
    counselorVerifyCta: "Comprobar autenticidad",
    counselorVerifyOk: "Resumen auténtico — métricas agregadas sin alteraciones detectadas.",
    counselorVerifyFail: "No se pudo verificar — revisa que el texto esté completo.",
    counselorVerifySignedAt: "Generado",
    counselorVerifyPageTitle: "Verificación para orientadores",
    counselorVerifyPageHint:
      "Comprueba que un resumen de bienestar Kampus no fue modificado después de generarse (solo métricas, sin diario privado).",
    institutionDashTitle: "Dashboard avanzado de bienestar",
    institutionDashHint: "Tendencias semanales y mezcla de señales de riesgo (datos opt-in agregados).",
    institutionDashLoading: "Cargando tendencias…",
    institutionDashError: "No se pudo cargar el dashboard de bienestar.",
    institutionDashEmpty: "Sin datos suficientes — necesitas más estudiantes con pulse activo.",
    institutionDashParticipation: "Participantes activos",
    institutionDashAvgLowMood: "Media días ánimo bajo",
    institutionDashAvgLowMoodHint: "Promedio 7d autoinformado",
    institutionDashAvgStress: "Media etiquetas estrés",
    institutionDashAvgStressHint: "Por estudiante (7d)",
    institutionDashActiveSignals: "Señales activas",
    institutionDashRiskMix: "Mezcla de señales (14d)",
    institutionDashEnergyTrend: "Energía media por semana",
    hubFeatureCounselorAlert: "Alertas orientación",
    hubFeatureUniversityServices: "Servicios de tu centro",
    hubFeatureFhirExport: "Export FHIR-lite",
    counselorAlertTitle: "Aviso proactivo a orientación",
    counselorAlertHint:
      "Si tu señal de bienestar pide vigilancia, puedes avisar al equipo de orientación de forma anónima (solo métricas).",
    counselorAlertAutoOn: "Activar aviso automático semanal",
    counselorAlertAutoOff: "Desactivar aviso automático",
    counselorAlertManualCta: "Avisar ahora (manual)",
    counselorAlertManualOk: "Aviso enviado — orientación verá la señal agregada en su panel.",
    counselorAlertDuplicate: "Ya registramos un aviso automático esta semana.",
    counselorAlertError: "No se pudo enviar el aviso. Revisa sesión e institución en Ajustes.",
    counselorAlertLoginRequired: "Inicia sesión y configura tu centro de estudios para enviar avisos.",
    counselorAlertPrivacy: "No incluye texto del diario — solo nivel de señal y motivos agregados.",
    counselorAlertActiveSignal: (level, score) =>
      level === "elevated"
        ? `Señal prioritaria (${score}/100) — considera pedir cita o usar los recursos de apoyo.`
        : `Señal a vigilar (${score}/100) — un aviso puede ayudar a orientación a acompañarte.`,
    counselorAlertInstitutionTitle: "Alertas de orientación (opt-in)",
    counselorAlertInstitutionHint: "Estudiantes que activaron aviso proactivo — datos agregados 14 días, sin identidad.",
    counselorAlertInstitutionLoading: "Cargando alertas…",
    counselorAlertInstitutionError: "No se pudieron cargar las alertas de orientación.",
    counselorAlertInstitutionEmpty: "Sin alertas opt-in en las últimas dos semanas.",
    counselorAlertInstitutionTotal: "Alertas (14d)",
    counselorAlertInstitutionTotalHint: "Avisos auto + manual",
    counselorAlertInstitutionWatchHint: "Nivel vigilar",
    counselorAlertInstitutionElevatedHint: "Nivel prioritario",
    counselorAlertInstitutionAuto: "Automáticas",
    counselorAlertInstitutionAutoHint: (manual) => `${manual} manuales en el mismo periodo`,
    universityServicesTitle: "Servicios de tu centro de estudios",
    universityServicesHint:
      "Configura tu centro de estudios en Ajustes (ej. UCV, USB, UCAB, ULA) para ver sus enlaces.",
    universityServicesHintMatched: (name) => `Enlaces para ${name} y recursos nacionales de apoyo.`,
    universityServicesDisclaimer:
      "Enlaces orientativos — confirma horarios y URLs en la web oficial de tu centro de estudios.",
    fhirExportTitle: "Export FHIR-lite (JSON)",
    fhirExportIncludeNarrative: "Incluir nota breve de reflexión (opcional, máx. 500 caracteres)",
    fhirExportRangeLabel: (range) =>
      range === "all" ? "Todo (FHIR)" : range === 7 ? "7 días (FHIR)" : range === 14 ? "14 días (FHIR)" : "30 días (FHIR)",
    fhirExportEmptyHint: "No hay entradas en ese rango para exportar.",
    fhirExportError: "No se pudo generar el JSON FHIR.",
    fhirExportPrivacyHint: "Por defecto solo ánimo y energía como Observation — no sube a la nube.",
    institutionIntegrationTitle: "Integración institucional",
    institutionIntegrationHint: "Exporta pulse semanal o conecta webhook IT para eventos wellbeing.counselor_alert.",
    institutionIntegrationWebhookTitle: "Webhook (servidor Kampus)",
    institutionIntegrationWebhookHint:
      "Configura WELLBEING_INSTITUTION_WEBHOOK_URL en el despliegue. Recibirás JSON cuando un estudiante opt-in envíe alerta.",
    institutionIntegrationCsvCta: "Descargar pulse semanal (CSV)",
    institutionIntegrationCsvOk: "CSV descargado en este dispositivo.",
    institutionIntegrationCsvEmpty: "No hay semanas con datos para exportar.",
    institutionIntegrationCsvError: "No se pudo generar el CSV.",
  },
};

export type WellbeingSubnavKey = "hub" | "diary" | "psychologist";
