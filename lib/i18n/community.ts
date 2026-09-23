import type { Locale } from "@/lib/i18n/nav";

export const communityCopy: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    description: string;
    inviteCta: string;
    shareKitCta: string;
    copied: string;
    linkedChannel: string;
    linkedChannelHint: string;
    clearLink: string;
    channelsInContext: string;
    channelsInContextHint: string;
    postCount: string;
    postCountHint: string;
    universityLabel: string;
    recommendedTitle: string;
    recommendedHint: string;
    studyGroupCta: string;
    composeTitle: string;
    composeHint: string;
    signInToPost: string;
    configureSupabase: string;
    channelLabel: string;
    postPlaceholder: string;
    postCta: string;
    posting: string;
    clearCta: string;
    selectChannelError: string;
    postError: string;
    feedTitle: string;
    feedHint: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyFirstPost: string;
    emptyStudyGroup: string;
    signInPrimary: string;
    createAccount: string;
    postedAt: string;
    replyPlaceholder: string;
    replyCta: string;
    replying: string;
    replyError: string;
    answersTitle: (count: number) => string;
    disabledChannelHint: string;
    optOutBanner: string;
    optOutSettings: string;
    roadmapTitle: string;
    roadmapHint: string;
    noSubjectsHint: string;
    contextSubject: string;
    contextExam: string;
    resourceUrlLabel: string;
    resourceUrlPlaceholder: string;
    resourceLabelLabel: string;
    resourceLabelPlaceholder: string;
    openResource: string;
    sortRecent: string;
    sortTrending: string;
    filterAll: string;
    filterSaved: string;
    savedCta: string;
    savedActive: string;
    helpfulCta: string;
    helpfulActive: string;
    helpfulCount: (n: number) => string;
    trendingBadge: string;
    replyBannerTitle: (count: number) => string;
    replyBannerCta: string;
    replyBannerDismiss: string;
    activityPostsHint: string;
    attachNotebookTitle: string;
    attachNotebookHint: string;
    openNotebook: string;
    reportCta: string;
    reportTitle: string;
    reportHint: string;
    reportDetailPlaceholder: string;
    reportSubmit: string;
    reportSending: string;
    reportCancel: string;
    reportError: string;
    reportDone: string;
    moderationNote: string;
    sidebarUnreadReplies: (count: number) => string;
  }
> = {
  es: {
    eyebrow: "Juntos",
    title: "Comunidad por materia y examen",
    description:
      "Pregunta en el canal de tu materia o del examen que se acerca. Respuestas cortas de compañeros — sin feed genérico.",
    inviteCta: "Invitar a comunidad",
    shareKitCta: "Compartir kit de estudios",
    copied: "Copiado",
    linkedChannel: "Canal enlazado",
    linkedChannelHint: "Pulsa un canal para cambiar el enlace que copias.",
    clearLink: "Quitar enlace",
    channelsInContext: "Canales en este contexto",
    channelsInContextHint: "Cada canal reduce ruido y concentra dudas útiles.",
    postCount: "Publicaciones en este canal",
    postCountHint: "Publicaciones de la comunidad.",
    universityLabel: "Centro de estudios",
    recommendedTitle: "Tus canales",
    recommendedHint: "Pregunta concreta → explicación corta → practica en Modo aprobar.",
    studyGroupCta: "Formar grupo de estudio →",
    composeTitle: "Publicar pregunta",
    composeHint: "Escribe tu pregunta y, opcionalmente, enlaza un apunte o PDF compartido.",
    signInToPost: "Inicia sesión para publicar.",
    configureSupabase: "Inicia sesión para publicar.",
    channelLabel: "Canal",
    postPlaceholder: "Escribe tu pregunta (máx. 1200 caracteres)…",
    postCta: "Publicar",
    posting: "Publicando…",
    clearCta: "Limpiar",
    selectChannelError: "Elige un canal.",
    postError: "No se pudo publicar.",
    feedTitle: "Conversación del canal",
    feedHint: "Ordena por recientes o en tendencia (más respuestas esta semana).",
    emptyTitle: "Todavía no hay conversación aquí",
    emptyDescription:
      "Haz una pregunta concreta o comparte un resumen corto. Un buen primer post desbloquea respuestas útiles.",
    emptyFirstPost: "Escribir el primer post",
    emptyStudyGroup: "Crear grupo de estudio",
    signInPrimary: "Iniciar sesión para publicar",
    createAccount: "Crear cuenta",
    postedAt: "Publicado",
    replyPlaceholder: "Tu respuesta (máx. 2000 caracteres)…",
    replyCta: "Responder",
    replying: "Enviando…",
    replyError: "No se pudo responder.",
    answersTitle: (count) => (count === 1 ? "1 respuesta" : `${count} respuestas`),
    disabledChannelHint: "Configura fechas de examen para publicar en este canal.",
    optOutBanner:
      "Tienes desactivadas las recomendaciones de comunidad. Puedes activarlas en onboarding o ajustes de perfil.",
    optOutSettings: "Ir a ajustes",
    roadmapTitle: "Próximamente",
    roadmapHint: "Notificaciones push nativas, feed en tiempo real y badges de actividad por canal.",
    noSubjectsHint: "Añade materias en onboarding para poblar canales.",
    contextSubject: "Materia",
    contextExam: "Examen",
    resourceUrlLabel: "Enlace a recurso (opcional)",
    resourceUrlPlaceholder: "https://…",
    resourceLabelLabel: "Nombre del recurso",
    resourceLabelPlaceholder: "Ej. Resumen capítulo 3",
    openResource: "Abrir recurso",
    sortRecent: "Recientes",
    sortTrending: "En tendencia",
    filterAll: "Todos",
    filterSaved: "Guardados",
    savedCta: "Guardar",
    savedActive: "Guardado",
    helpfulCta: "Útil",
    helpfulActive: "Marcado útil",
    helpfulCount: (n) => (n === 1 ? "1 útil" : `${n} útiles`),
    trendingBadge: "Tendencia",
    replyBannerTitle: (count) =>
      count === 1 ? "Tienes 1 respuesta nueva en tus posts" : `Tienes ${count} respuestas nuevas en tus posts`,
    replyBannerCta: "Ver respuesta",
    replyBannerDismiss: "Marcar leído",
    activityPostsHint: "Actividad real de los últimos 7 días.",
    attachNotebookTitle: "Adjuntar cuaderno de materia",
    attachNotebookHint: "Enlace interno a tus apuntes — tus compañeros abren el cuaderno directamente.",
    openNotebook: "Abrir cuaderno",
    reportCta: "Reportar",
    reportTitle: "Reportar publicación",
    reportHint: "Los reportes quedan registrados para revisión. Solo puedes reportar una vez por post.",
    reportDetailPlaceholder: "Detalle opcional (máx. 500 caracteres)…",
    reportSubmit: "Enviar reporte",
    reportSending: "Enviando…",
    reportCancel: "Cancelar",
    reportError: "No se pudo enviar el reporte.",
    reportDone: "Reportado",
    moderationNote:
      "Si ves contenido inapropiado, usa Reportar en el post. Los reportes se guardan de forma segura para moderación futura.",
    sidebarUnreadReplies: (count) =>
      count === 1 ? "1 respuesta nueva en comunidad" : `${count} respuestas nuevas en comunidad`,
  },
};
