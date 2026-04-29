/**
 * Class Rescue — deterministic "AI-like" pack from user-provided seed text.
 * Replace `generateRescuePack` body with a real model + ingestion pipeline later.
 */

export type RescueQuizItem = {
  question: string;
  options: string[];
  answerIndex: number;
};

export type RescueFlashcard = { front: string; back: string };

export type RescuePack = {
  subjectLine: string;
  quickSummary: string;
  fullSummary: string;
  deepExplanation: string;
  keyIdeas: string[];
  probableExamQuestions: string[];
  flashcards: RescueFlashcard[];
  quiz: RescueQuizItem[];
  studyChecklist: string[];
  mindMapOutline: string;
  easyExplanation: string;
  technicalExplanation: string;
  questionsForClass: string[];
  suggestedNextResource: string;
};

export type RescueInput = {
  seedText: string;
  subjectHint: string;
  sourceLabel: string;
  /** Optional UI hint — mixed into the hash for variety. */
  sourceKind?: string;
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(items: T[], seed: number, index: number): T {
  return items[(seed + index * 31) % items.length];
}

export function generateRescuePack(input: RescueInput): RescuePack {
  const seed = hashString(`${input.seedText}|${input.subjectHint}|${input.sourceLabel}|${input.sourceKind ?? ""}`);
  const topic = input.subjectHint.trim() || "este tema";
  const snippet = input.seedText.trim().slice(0, 280) || `Uploaded source: ${input.sourceLabel}`;

  const keyIdeas = [
    `Define el objetivo central de ${topic} en una sola frase.`,
    `Separa supuestos vs. evidencia en ${input.sourceLabel}.`,
    `Identifica 2–3 mecanismos que suelen aparecer en exámenes de ${topic}.`,
    `Traduce jerga a un diagrama que puedas redibujar de memoria.`,
  ];

  const probableExamQuestions = [
    `Explica ${topic} desde primeros principios usando un ejemplo de clase.`,
    `Compara/contrasta dos enfoques discutidos en ${input.sourceLabel}.`,
    `Resuelve un problema típico y justifica cada paso (sin saltarte álgebra).`,
    `¿Cuáles son los fallos típicos / casos borde que suelen evaluar?`,
  ];

  const flashcards: RescueFlashcard[] = [
    { front: `¿Cuál es la idea principal de ${topic}?`, back: "Una afirmación breve apoyada por definiciones + un ejemplo." },
    { front: "¿Qué memorizar vs. qué derivar?", back: "Memoriza definiciones + pasos canónicos; deriva variaciones." },
    { front: "¿Trampa común en exámenes?", back: "Errores de signo, unidades, o supuestos no declarados." },
    { front: `Intuición en 1 línea de ${topic}`, back: "Explícalo como si enseñaras a un amigo cansado en 60 segundos." },
  ];

  const quiz: RescueQuizItem[] = [
    {
      question: `¿Qué describe mejor tu primer paso al repasar ${topic}?`,
      options: [
        "Solo mirar títulos",
        "Reconstruir un mini-esquema de memoria",
        "Releer todo lento",
        "Copiar diapositivas tal cual",
      ],
      answerIndex: 1,
    },
    {
      question: "¿Qué práctica rinde más antes de un examen?",
      options: [
        "Subrayado pasivo",
        "Recuperación activa cronometrada (mixta)",
        "Rever clases a 2x",
        "Ordenar carpetas",
      ],
      answerIndex: 1,
    },
  ];

  const studyChecklist = [
    `Mira ${input.sourceLabel} por estructura (6 min).`,
    "Reescribe el esquema sin mirar (10 min).",
    "Haz 12 flashcards + 6 preguntas tipo quiz (15 min).",
    `Explica ${topic} en voz alta una vez (4 min).`,
    "Lista 5 preguntas “tipo examen” que aún te asustan (5 min).",
  ];

  const mindMapOutline = [
    `${topic}`,
    "  Definiciones",
    "  Mecanismos",
    "  Ejemplos",
    "  Casos borde",
    "  Patrones de examen",
    "  Tus puntos débiles (de tus notas)",
  ].join("\n");

  return {
    subjectLine: `${topic} · ${input.sourceLabel}`,
    quickSummary: `Te estás poniendo al día con ${topic}. Empieza por estructura y luego recuperación activa: reconstruye el esquema y después practica 10 preguntas. Ancla de fuente: ${snippet.slice(0, 120)}…`,
    fullSummary: `Este pack usa "${topic}" como columna vertebral. Desde ${input.sourceLabel}, prioriza definiciones, ejemplos canónicos y frases que el profe repite. Tus notas sugieren foco en: ${snippet.slice(0, 200)}… Luego conecta cada idea con una pregunta práctica para que sea “examinable”, no solo “entendida”.`,
    deepExplanation: `Capa profunda: explica ${topic} como una cadena de causas → definiciones → implicaciones. Si te atoras, pregunta: ¿qué se conserva?, ¿qué condiciones de borde importan?, ¿qué aproximación es válida? Usa ${input.sourceLabel} como evidencia, no como guion para memorizar.`,
    keyIdeas: keyIdeas.map((k, i) => `${pick(["•", "→", "★"], seed, i)} ${k}`),
    probableExamQuestions: probableExamQuestions.map((q, i) => `${i + 1}. ${q}`),
    flashcards,
    quiz,
    studyChecklist,
    mindMapOutline,
    easyExplanation: `Versión fácil: ${topic} es básicamente “cómo se conectan las cosas”. Imagina un mapa de metro: cada estación es un concepto; las líneas son relaciones. Tu trabajo es recorrer el mapa sin GPS—${input.sourceLabel} es el boceto del mapa.`,
    technicalExplanation: `Versión técnica: formaliza ${topic} con definiciones precisas, invariantes y límites trabajados. Valida cada paso contra ${input.sourceLabel} y estresa con casos borde que suelen evaluar.`,
    questionsForClass: [
      `Si ${topic} falla en un caso real, ¿cuál es la primera pregunta de diagnóstico?`,
      `¿Qué supuesto en ${input.sourceLabel} es el más débil y cómo lo probarías?`,
      "¿Cuál es la forma más rápida de saber si entendí de verdad vs. solo reconocí?",
    ],
    suggestedNextResource: pick(
      [
        "Un set mixto de 20 preguntas (cronometrado)",
        "Un hilo de explicación con un compañero en tu comunidad",
        "Una nota de voz de 12 minutos explicando “desde cero”",
        "Un simulacro estilo profesor (Modo aprobar → práctica)",
      ],
      seed,
      2,
    ),
  };
}
