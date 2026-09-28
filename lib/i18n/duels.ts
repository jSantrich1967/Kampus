import type { Locale } from "@/lib/i18n/nav";

export const duelsCopy: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    description: string;
    createTitle: string;
    createHint: string;
    subjectLabel: string;
    subjectPlaceholder: string;
    topicLabel: string;
    topicPlaceholder: string;
    nameLabel: string;
    namePlaceholder: string;
    createCta: string;
    creatingLabel: string;
    joinTitle: string;
    joinHint: string;
    codeLabel: string;
    codePlaceholder: string;
    joinCta: string;
    practiceTitle: string;
    practiceHint: string;
    practiceCta: string;
    loginRequired: string;
    errorMessage: string;
    codeCopied: string;
    copyCode: string;
    shareWhatsapp: string;
    waitingRival: string;
    waitingHint: string;
    yourTurn: string;
    questionOf: (i: number, n: number) => string;
    secondsLeft: (s: number) => string;
    timeUp: string;
    nextQuestion: string;
    finishDuel: string;
    resultTitleWin: string;
    resultTitleLose: string;
    resultTitleTie: string;
    resultWaiting: string;
    resultWaitingHint: string;
    youLabel: string;
    rivalLabel: string;
    correctLabel: string;
    rematchCta: string;
    backToDuels: string;
    demoRivalName: string;
    demoResultHint: string;
    loginToChallenge: string;
    questionsCount: (n: number) => string;
  }
> = {
  es: {
    eyebrow: "Duelos",
    title: "Reta a un amigo. Que gane el que más sepa.",
    description:
      "Crea un duelo de 8 preguntas contra un compañero. Responden el mismo quiz por separado: más aciertos gana, y el tiempo desempatas.",
    createTitle: "Crear un duelo",
    createHint: "Elige la materia y el tema. Generamos 8 preguntas y te damos un código para retar.",
    subjectLabel: "Materia",
    subjectPlaceholder: "Ej.: Física, Historia, Inglés…",
    topicLabel: "Tema (opcional)",
    topicPlaceholder: "Ej.: Cinemática, Segunda Guerra Mundial…",
    nameLabel: "Tu nombre de jugador",
    namePlaceholder: "Ej.: Joreg",
    createCta: "Crear duelo y jugar",
    creatingLabel: "Generando preguntas…",
    joinTitle: "Unirse con código",
    joinHint: "¿Te retaron? Pega el código y juega el mismo quiz.",
    codeLabel: "Código del duelo",
    codePlaceholder: "Ej.: K7QX2M",
    joinCta: "Jugar duelo",
    practiceTitle: "Practica sin cuenta",
    practiceHint: "Juega un duelo de práctica contra un rival simulado y siente la adrenalina.",
    practiceCta: "Duelo de práctica",
    loginRequired: "Inicia sesión para crear duelos reales y retar a tus amigos.",
    errorMessage: "Algo salió mal. Inténtalo de nuevo.",
    codeCopied: "¡Código copiado!",
    copyCode: "Copiar código",
    shareWhatsapp: "Retar por WhatsApp",
    waitingRival: "Esperando rival…",
    waitingHint: "Comparte tu código. Cuando tu rival juegue, verás el resultado aquí.",
    yourTurn: "Tu turno",
    questionOf: (i, n) => `Pregunta ${i} de ${n}`,
    secondsLeft: (s) => `${s}s`,
    timeUp: "¡Tiempo!",
    nextQuestion: "Siguiente",
    finishDuel: "Ver resultado",
    resultTitleWin: "🏆 ¡Ganaste el duelo!",
    resultTitleLose: "😅 Perdiste esta vez",
    resultTitleTie: "🤝 ¡Empate!",
    resultWaiting: "Resultado parcial",
    resultWaitingHint: "Tu rival aún no juega. Comparte el código para completar el duelo.",
    youLabel: "Tú",
    rivalLabel: "Rival",
    correctLabel: "aciertos",
    rematchCta: "Revancha",
    backToDuels: "Volver a duelos",
    demoRivalName: "Rival demo",
    demoResultHint: "Esto fue una práctica. Inicia sesión para retar a amigos de verdad.",
    loginToChallenge: "Inicia sesión para retar amigos",
    questionsCount: (n) => `${n} preguntas · 20s por pregunta`,
  },
};
