import type { Locale } from "@/lib/i18n/nav";

export const tutorCopy: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    description: string;
    hint: string;
    subjectLabel: string;
    subjectPlaceholder: string;
    inputPlaceholder: string;
    sendLabel: string;
    sendingLabel: string;
    newChatLabel: string;
    emptyTitle: string;
    emptyHint: string;
    suggestions: string[];
    errorMessage: string;
    emptyReplyMessage: string;
    loginRequired: string;
    quotaNote: string;
    socraticBadge: string;
    disclaimer: string;
  }
> = {
  es: {
    eyebrow: "Tutor IA",
    title: "Pregunta, no te doy la respuesta",
    description:
      "Un tutor que te guía con preguntas hasta que TÚ llegues a la respuesta. Así se aprende de verdad: recordando, no copiando.",
    hint: "Elige tu materia y pregúntame lo que no entiendas. Te haré preguntas para que lo descubras paso a paso.",
    subjectLabel: "Materia",
    subjectPlaceholder: "Ej.: Cálculo II, Biología, Historia…",
    inputPlaceholder: "Pregúntame algo de tu materia…",
    sendLabel: "Enviar",
    sendingLabel: "Pensando…",
    newChatLabel: "Nueva conversación",
    emptyTitle: "¿Qué quieres entender hoy?",
    emptyHint: "Prueba con una de estas preguntas para empezar:",
    suggestions: [
      "No entiendo las integrales por partes",
      "Explícame la fotosíntesis como si tuviera 10 años",
      "¿Por qué cayó el Imperio romano?",
      "Ayúdame a plantear este problema sin resolverlo",
    ],
    errorMessage: "No pude responder ahora. Inténtalo de nuevo en un momento.",
    emptyReplyMessage: "El tutor no devolvió respuesta. Inténtalo de nuevo.",
    loginRequired: "Inicia sesión para usar el Tutor IA.",
    quotaNote: "Uso justo: hay un límite diario de preguntas para que el servicio siga gratis para todos.",
    socraticBadge: "Método socrático",
    disclaimer:
      "El tutor guía tu razonamiento y no hace tu tarea por ti: si le pides la respuesta directa, te hará preguntas primero.",
  },
};
