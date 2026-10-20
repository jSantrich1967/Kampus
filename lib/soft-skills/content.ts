/**
 * Contenido del módulo de habilidades blandas.
 * v1: diagnóstico general (4 dimensiones) + ruta completa de Comunicación.
 * Las demás rutas se muestran como «Pronto»: no se promete contenido que no existe.
 */

export type SoftSkillDimensionId = "comunicacion" | "emocional" | "equipo" | "tiempo";

export type SoftSkillDimension = {
  id: SoftSkillDimensionId;
  name: string;
  short: string;
  description: string;
};

export const SOFT_SKILL_DIMENSIONS: SoftSkillDimension[] = [
  {
    id: "comunicacion",
    name: "Comunicación",
    short: "Comunicación",
    description: "Explicar ideas con claridad, escuchar y escribir para que te entiendan.",
  },
  {
    id: "emocional",
    name: "Inteligencia emocional",
    short: "Emociones",
    description: "Reconocer lo que sientes, manejar la frustración y responder con calma.",
  },
  {
    id: "equipo",
    name: "Trabajo en equipo",
    short: "Equipo",
    description: "Cumplir tu parte, hablar a tiempo y resolver diferencias con respeto.",
  },
  {
    id: "tiempo",
    name: "Gestión del tiempo",
    short: "Tiempo",
    description: "Planificar, empezar sin dejarlo para el final y estudiar sin distracciones.",
  },
];

export type DiagnosticQuestion = {
  id: string;
  dimension: SoftSkillDimensionId;
  text: string;
};

export const DIAGNOSTIC_SCALE = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Casi nunca" },
  { value: 3, label: "A veces" },
  { value: 4, label: "Casi siempre" },
  { value: 5, label: "Siempre" },
] as const;

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  { id: "c1", dimension: "comunicacion", text: "Cuando explico un tema, empiezo por la idea principal en vez de dar vueltas." },
  { id: "c2", dimension: "comunicacion", text: "Escucho hasta el final sin interrumpir, aunque no esté de acuerdo." },
  { id: "c3", dimension: "comunicacion", text: "Al escribir un mensaje o correo, reviso que se entienda qué pido y para cuándo." },
  { id: "e1", dimension: "emocional", text: "Reconozco cuándo estoy frustrado y me doy una pausa antes de responder." },
  { id: "e2", dimension: "emocional", text: "Acepto una crítica a mi trabajo sin tomármela como un ataque personal." },
  { id: "e3", dimension: "emocional", text: "Si algo me sale mal, busco qué puedo aprender en vez de quedarme en la queja." },
  { id: "t1", dimension: "equipo", text: "Entrego mi parte del trabajo en grupo en la fecha acordada." },
  { id: "t2", dimension: "equipo", text: "Si un compañero no cumple, hablo con esa persona directamente y con respeto." },
  { id: "t3", dimension: "equipo", text: "En los grupos aporto ideas y también ayudo a organizar el trabajo." },
  { id: "g1", dimension: "tiempo", text: "Planifico mi día o mi semana antes de empezar a estudiar." },
  { id: "g2", dimension: "tiempo", text: "Empiezo las tareas con tiempo, no la noche anterior." },
  { id: "g3", dimension: "tiempo", text: "Cuando estudio, dejo el teléfono fuera de mi alcance." },
];

export type LessonSection = { heading: string; body: string };

export type Lesson = {
  id: string;
  title: string;
  minutes: number;
  intro: string;
  sections: LessonSection[];
  exampleBad: string;
  exampleGood: string;
  commonMistake: string;
  miniCheck: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
};

export const COMMUNICATION_LESSONS: Lesson[] = [
  {
    id: "idea-en-una-frase",
    title: "Tu idea en una frase",
    minutes: 6,
    intro:
      "Si no puedes decir tu idea en una frase, todavía no está clara ni para ti. Esta lección te da una estructura simple para ordenar cualquier explicación: la que usan los buenos expositores y también los buenos vendedores.",
    sections: [
      {
        heading: "La estructura PREP",
        body: "Punto: di tu idea principal primero, en una frase. Razón: explica por qué es así o por qué importa. Ejemplo: pon un caso concreto, un número o una historia corta. Punto otra vez: cierra repitiendo la idea, con otras palabras. El cerebro recuerda mejor lo que escucha al principio y al final.",
      },
      {
        heading: "Por qué funciona",
        body: "Cuando empiezas por los detalles, quien escucha no sabe a dónde vas y se pierde. Cuando empiezas por la idea, cada detalle tiene un lugar donde engancharse. Piensa en un titular de noticia: primero el qué, después el cómo.",
      },
      {
        heading: "Cómo practicarlo",
        body: "Antes de exponer o de responder una pregunta larga, escribe tu idea en una frase en un papel. Si no te sale, vuelve a tu material y pregúntate: «si solo pudiera decir una cosa, ¿cuál sería?». Esa frase es tu Punto.",
      },
    ],
    exampleBad:
      "«Bueno, la fotosíntesis… las plantas tienen clorofila, que está en los cloroplastos, y también necesitan agua que sube por las raíces, y el sol… y entonces producen oxígeno y glucosa…»",
    exampleGood:
      "«La fotosíntesis es la forma en que las plantas fabrican su alimento con luz. Punto. Lo hacen con tres ingredientes: luz del sol, agua y aire. Ejemplo: una planta sin luz se debilita aunque tenga agua. Por eso, en una frase: sin luz, no hay alimento.»",
    commonMistake: "Empezar por los detalles y dejar la idea principal para el final, cuando ya nadie está escuchando.",
    miniCheck: {
      question: "En la estructura PREP, ¿qué va primero?",
      options: ["Un ejemplo llamativo", "La idea principal en una frase", "Los detalles técnicos"],
      correctIndex: 1,
      explanation: "Primero el Punto: la idea principal. Después la razón, el ejemplo y el cierre repitiendo la idea.",
    },
  },
  {
    id: "escuchar-para-entender",
    title: "Escuchar para entender",
    minutes: 5,
    intro:
      "La mitad de la comunicación no es hablar: es escuchar. La mayoría escucha esperando su turno para responder. Escuchar de verdad es otra cosa, y se nota enseguida en cómo te tratan los demás.",
    sections: [
      {
        heading: "Tres gestos que cambian todo",
        body: "No interrumpas: deja que la otra persona termine, aunque ya sepas lo que va a decir. Parafrasea: repite con tus palabras lo que entendiste («si te entiendo bien, lo que te preocupa es…»). Pregunta: una buena pregunta vale más que tres opiniones («¿qué parte te parece más difícil?»).",
      },
      {
        heading: "Parafrasear no es repetir",
        body: "Repetir es copiar las palabras. Parafrasear es demostrar que entendiste el sentido. Si la otra persona dice «siempre me toca la parte más pesada», parafrasear sería: «sientes que la repartición no ha sido justa». Eso abre la conversación en vez de cerrarla.",
      },
      {
        heading: "Dónde se practica",
        body: "En clase, con tus compañeros de grupo y en tu casa. La próxima vez que alguien te cuente un problema, tu único trabajo es entenderlo antes de opinar. Vas a notar que la gente empieza a buscarte para hablar.",
      },
    ],
    exampleBad: "«—Es que el profesor no explicó bien el tema y por eso… —Ah, eso es porque no pusiste atención, a mí me quedó clarísimo.»",
    exampleGood:
      "«—Es que el profesor no explicó bien el tema y por eso me fue mal. —Si te entiendo bien, sientes que la explicación fue muy rápida y te quedaste con dudas. ¿Qué parte fue la que menos se entendió?»",
    commonMistake: "Escuchar solo para preparar tu respuesta o tu contraargumento, en vez de entender primero.",
    miniCheck: {
      question: "¿Cuál de estas respuestas muestra escucha activa?",
      options: [
        "«Eso no es así, déjame explicarte.»",
        "«Si te entiendo bien, te preocupa no terminar a tiempo. ¿Qué necesitas para lograrlo?»",
        "«A mí me pasó algo peor la semana pasada.»",
      ],
      correctIndex: 1,
      explanation: "Parafrasea lo que entendió y pregunta. No corrige, no compite y no cambia el tema a sí misma.",
    },
  },
  {
    id: "hablar-en-publico",
    title: "Hablar en público sin bloquearte",
    minutes: 7,
    intro:
      "El miedo a exponer no se quita: se maneja. Los buenos expositores no son los que no sienten nervios, son los que tienen una estructura que los sostiene cuando los nervios llegan.",
    sections: [
      {
        heading: "Tres partes, siempre",
        body: "Apertura: una pregunta, un dato o una historia breve que despierte interés («¿sabían que…?»). Desarrollo: máximo tres ideas, en orden, una por una. Cierre: repite tu idea principal en una frase y termina. Si te pierdes, vuelve a la estructura: ella sabe el camino aunque tú tiembles.",
      },
      {
        heading: "El cuerpo también habla",
        body: "Respira lento antes de empezar: inhala contando hasta 4 y suelta contando hasta 4, tres veces. Habla un poco más despacio de lo que crees necesario: los nervios aceleran y tú no lo notas. Mira a tres puntos distintos del salón, no a una sola persona ni a la pared.",
      },
      {
        heading: "No memorices palabra por palabra",
        body: "Memorizar un guion completo es frágil: si olvidas una palabra, se cae todo. Memoriza el orden de tus ideas (tus tres puntos) y una frase de arranque. Las palabras salen solas cuando el orden está claro.",
      },
    ],
    exampleBad: "Leer las diapositivas de espaldas al público, rápido y en el mismo tono, hasta que alguien pregunta algo y no sabes en qué parte ibas.",
    exampleGood:
      "«Les voy a mostrar tres cosas: qué es, por qué importa y un ejemplo real. Primero…» (pausa, mira al salón) «Segundo…» … «En resumen: [idea en una frase]. Gracias.»",
    commonMistake: "Preparar solo el contenido y nunca practicarlo en voz alta, de pie y cronometrado, ni una sola vez.",
    miniCheck: {
      question: "Si te bloqueas en mitad de una exposición, ¿qué te rescata?",
      options: [
        "El guion memorizado palabra por palabra",
        "La estructura: saber en cuál de tus tres ideas vas",
        "Hablar más rápido para terminar antes",
      ],
      correctIndex: 1,
      explanation: "La estructura (apertura, tres ideas, cierre) te ubica. El guion memorizado se rompe con un solo olvido.",
    },
  },
  {
    id: "escribir-claro",
    title: "Escribir para que te entiendan",
    minutes: 6,
    intro:
      "Un mensaje claro consigue respuesta. Uno confuso se ignora, se malinterpreta o te toca explicarlo tres veces. Escribir claro es una habilidad laboral: quien la domina parece más capaz, porque su trabajo se entiende.",
    sections: [
      {
        heading: "La regla del correo útil",
        body: "Asunto que lo dice todo: no «Duda», sino «Duda sobre la fecha del parcial de Historia». Una idea por párrafo: si mezclas dos pedidos, responde a uno y el otro se pierde. Cierre con acción: qué pides, a quién y para cuándo («¿Podría confirmarme si la entrega es el viernes 24?»).",
      },
      {
        heading: "Antes de enviar, relee como receptor",
        body: "Lee tu mensaje una vez preguntándote: «si no supiera nada de esto, ¿entendería qué me piden?». Revisa nombres, fechas y adjuntos. La mitad de los malentendidos no son de redacción: son un dato que faltaba.",
      },
      {
        heading: "Corto no es frío",
        body: "Claro y corto no significa seco. Un saludo, un «gracias» y frases completas mantienen el tono amable sin rodeos. Amable y directo a la vez: esa es la combinación profesional.",
      },
    ],
    exampleBad: "Asunto: «Hola». Cuerpo: «Profesor le escribo porque no pude ir y quería saber lo del trabajo y también si lo de la otra vez cuenta y me dice por favor gracias.»",
    exampleGood:
      "Asunto: «Consulta: entrega del trabajo de Historia (sección B)». Cuerpo: «Buenas tardes, profesor. No pude asistir el martes por una cita médica. ¿La entrega del trabajo se mantiene para el viernes 24? Gracias por su respuesta. — María González, sección B.»",
    commonMistake: "Meter varios temas en un solo mensaje sin asunto claro y sin decir exactamente qué necesitas.",
    miniCheck: {
      question: "¿Cuál asunto de correo es el correcto?",
      options: ["«Importante»", "«Consulta: fecha del parcial de Historia»", "«Para el profesor»"],
      correctIndex: 1,
      explanation: "El asunto debe decir el tema completo. «Importante» y «Para el profesor» no informan nada.",
    },
  },
];

export type Simulation = {
  id: string;
  title: string;
  minutes: number;
  scenario: string;
  opening: string;
  /** Instrucciones de rol que se envían al Tutor IA como contexto de la práctica. */
  tutorContext: string;
  rubric: string[];
};

export const COMMUNICATION_SIMULATIONS: Simulation[] = [
  {
    id: "exponer-en-clase",
    title: "Expones frente a la clase",
    minutes: 10,
    scenario:
      "El profesor te pide exponer en un minuto un tema de tu materia. La IA hace de profesor: escucha tu exposición escrita, te hace preguntas como el público y al final te evalúa con la rúbrica.",
    opening:
      "Soy tu profesor. Tienes un minuto: expón el tema que elijas como si estuvieras frente a la clase. Empieza cuando quieras: ¿qué tema vas a exponer y cuál es tu idea en una frase?",
    tutorContext:
      "SIMULACIÓN DE COMUNICACIÓN ORAL. Actúas como el profesor que recibe la exposición del estudiante. Reglas: respuestas cortas (máximo 5 líneas), un paso por turno. Primero deja que el estudiante exponga. Después hazle UNA pregunta como público y luego una duda o contraejemplo amable. Al tercer intercambio del estudiante, cierra con retroalimentación usando esta rúbrica: Claridad (¿se entendió la idea?), Estructura (¿hubo orden: punto, razón, ejemplo, cierre?), Confianza (¿sonó seguro?). Dile una fortaleza concreta, una mejora concreta y un consejo practicable. No hagas la exposición por él y no des un sermón: esto es práctica, no un examen sorpresa.",
    rubric: ["Claridad de la idea", "Estructura PREP", "Confianza al responder preguntas"],
  },
  {
    id: "companero-no-cumple",
    title: "Tu compañero no hizo su parte",
    minutes: 10,
    scenario:
      "Mañana entregan el trabajo en grupo y Andrés, tu compañero, no envió su parte. La IA hace de Andrés. Tu reto: lograr un acuerdo usando comunicación asertiva — hecho, efecto y pedido — sin pelear y sin rendirte.",
    opening:
      "Hola… sí, lo del trabajo… es que he estado full. ¿Eso era para mañana? Pensé que faltaba más tiempo.",
    tutorContext:
      "SIMULACIÓN DE COMUNICACIÓN ASERTIVA. Actúas como Andrés, el compañero que no entregó su parte de un trabajo en grupo que vence mañana. Reglas: respuestas cortas (máximo 4 líneas), tono evasivo pero no hostil, un paso por turno. Si el estudiante comunica con la fórmula hecho-efecto-pedido (dice el hecho sin atacar, explica el efecto y hace un pedido concreto con hora), cede de forma realista y propón cumplir. Si el estudiante ataca o se rinde sin pedir nada, mantente evasivo. Al tercer intercambio del estudiante, sal del personaje y da retroalimentación con esta rúbrica: Firmeza (¿pidió algo concreto?), Respeto (¿habló del hecho y no de la persona?), Propuesta (¿cerró con un acuerdo y una hora?). Una fortaleza, una mejora y un consejo.",
    rubric: ["Firmeza en el pedido", "Respeto (hecho, no ataque)", "Cierre con acuerdo concreto"],
  },
];

export const COMMUNICATION_CHALLENGE = {
  id: "reto-explica-60s",
  title: "Reto de la semana: explica en 60 segundos",
  description:
    "Elige un tema de cualquiera de tus materias y explícaselo en voz alta a una persona real (familia, un amigo, un compañero). Al final pregúntale: «¿qué entendiste?». Escribe aquí en 2 o 3 líneas qué entendió, qué se perdió y qué harías distinto. La comunicación solo mejora practicando con gente de verdad.",
};

export type SoftSkillRoute = {
  id: string;
  dimension: SoftSkillDimensionId;
  title: string;
  tagline: string;
  available: boolean;
};

export const SOFT_SKILL_ROUTES: SoftSkillRoute[] = [
  {
    id: "comunicacion",
    dimension: "comunicacion",
    title: "Comunicación efectiva",
    tagline: "Explicar, escuchar, exponer y escribir con claridad.",
    available: true,
  },
  {
    id: "inteligencia-emocional",
    dimension: "emocional",
    title: "Inteligencia emocional",
    tagline: "Entender lo que sientes y responder con calma.",
    available: false,
  },
  {
    id: "trabajo-en-equipo",
    dimension: "equipo",
    title: "Trabajo en equipo y liderazgo",
    tagline: "Organizar, cumplir y resolver diferencias.",
    available: false,
  },
  {
    id: "gestion-del-tiempo",
    dimension: "tiempo",
    title: "Gestión del tiempo y hábitos",
    tagline: "Planificar y estudiar sin dejarlo para el final.",
    available: false,
  },
];
