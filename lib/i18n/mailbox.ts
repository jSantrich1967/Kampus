import type { Locale } from "@/lib/i18n/nav";

/**
 * Buzón profesor ↔ estudiante: trabajos/informes con corrección y avisos.
 * Lenguaje cotidiano; una acción clara por pantalla.
 */
export const mailboxCopy: Record<
  Locale,
  {
    // Estudiante: mis trabajos
    worksTitle: string;
    worksHint: string;
    worksPrivacy: string;
    tabSend: string;
    tabSent: string;
    formTeacher: string;
    formTeacherEmpty: string;
    formCourse: string;
    formCoursePh: string;
    formTitle: string;
    formTitlePh: string;
    formBody: string;
    formBodyPh: string;
    sendCta: string;
    sendOk: string;
    sendError: string;
    loginNeeded: string;
    emptySent: string;
    statusSent: string;
    statusReviewed: string;
    feedbackTitle: string;
    gradeLabel: string;
    noFeedback: string;
    // Estudiante: avisos
    noticesTitle: string;
    noticesHint: string;
    emptyNotices: string;
    // Profesor: revisar trabajos
    reviewTitle: string;
    reviewHint: string;
    emptyReview: string;
    reviewCta: string;
    feedbackPh: string;
    gradePh: string;
    reviewOk: string;
    reviewError: string;
    // Profesor: avisos
    composeTitle: string;
    composeHint: string;
    targetAll: string;
    targetSession: string;
    publishCta: string;
    publishOk: string;
    publishError: string;
    myNoticesTitle: string;
    emptyMyNotices: string;
    deleteCta: string;
    // WhatsApp
    whatsappCta: string;
    whatsappHint: string;
  }
> = {
  es: {
    worksTitle: "Mis trabajos",
    worksHint: "Envía trabajos o informes a tu profesor y recibe su corrección aquí.",
    worksPrivacy: "Privado: tu profesor solo ve tu nombre y tu trabajo. Nadie ve perfiles.",
    tabSend: "Enviar",
    tabSent: "Enviados",
    formTeacher: "Profesor",
    formTeacherEmpty: "Aún no tienes profesores: inscríbete en una clase del aula virtual.",
    formCourse: "Materia",
    formCoursePh: "Ej. Biología",
    formTitle: "Título",
    formTitlePh: "Ej. Informe de fotosíntesis",
    formBody: "Tu trabajo o informe",
    formBodyPh: "Pega aquí el texto de tu trabajo…",
    sendCta: "Enviar al profesor",
    sendOk: "Trabajo enviado. Te avisaremos aquí cuando lo corrija.",
    sendError: "No se pudo enviar. Inténtalo de nuevo.",
    loginNeeded: "Inicia sesión para usar esta función.",
    emptySent: "Aún no enviaste trabajos.",
    statusSent: "Enviado",
    statusReviewed: "Corregido",
    feedbackTitle: "Corrección del profesor",
    gradeLabel: "Nota",
    noFeedback: "Todavía sin corrección.",
    noticesTitle: "Avisos",
    noticesHint: "Lo que tus profesores quieren contarte: avisos y material.",
    emptyNotices: "No tienes avisos por ahora.",
    reviewTitle: "Revisar trabajos",
    reviewHint: "Trabajos que te enviaron tus estudiantes. Corrige con devolución y nota.",
    emptyReview: "Nadie te envió trabajos todavía.",
    reviewCta: "Guardar corrección",
    feedbackPh: "Escribe tu devolución: qué estuvo bien y qué mejorar…",
    gradePh: "Nota (0–20, opcional)",
    reviewOk: "Corrección guardada. El estudiante la verá en sus trabajos.",
    reviewError: "No se pudo guardar la corrección.",
    composeTitle: "Nuevo aviso",
    composeHint: "Envía un aviso o material a tus estudiantes. Llega a la app al instante.",
    targetAll: "Todos mis estudiantes",
    targetSession: "Solo una clase…",
    publishCta: "Publicar aviso",
    publishOk: "Aviso publicado.",
    publishError: "No se pudo publicar el aviso.",
    myNoticesTitle: "Mis avisos",
    emptyMyNotices: "Aún no publicaste avisos.",
    deleteCta: "Eliminar",
    whatsappCta: "Avisar por WhatsApp",
    whatsappHint: "Se abre WhatsApp con el mensaje listo para reenviar al grupo de la clase.",
  },
};

export function buildVcWhatsappMessage(input: {
  course: string;
  startsAt: string;
  roomLabel: string;
  joinUrl: string | null;
}): string {
  const date = new Date(input.startsAt);
  const dateStr = Number.isNaN(date.getTime())
    ? input.startsAt
    : date.toLocaleString("es-VE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const lines = [
    `📚 *${input.course || "Clase virtual"}* — Kampus`,
    `🗓 ${dateStr}`,
    input.roomLabel ? `📍 ${input.roomLabel}` : null,
    input.joinUrl ? `🔗 ${input.joinUrl}` : "🔗 Entra desde tu app Kampus",
  ].filter(Boolean);
  return lines.join("\n");
}

export function vcWhatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
