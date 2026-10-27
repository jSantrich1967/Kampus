/**
 * Text shown on the academic calendar when there is no cloud session.
 * Works stay in this browser. A new exam date is stored on the account, so
 * the page must not say that exams stay in the browser too.
 */
export const calendarGuestCopy = {
  pageDescription:
    "Un mismo calendario para exámenes, exposiciones y trabajos. Sin sesión, los trabajos quedan en este navegador. Para registrar un examen nuevo, inicia sesión.",
  examHint:
    "Los exámenes de ejemplo que ya ves quedan en este navegador. Para añadir uno nuevo, inicia sesión.",
  examAction: "Iniciar sesión para añadir un examen",
  workHint: "Se guardan en este navegador, en este dispositivo.",
} as const;
