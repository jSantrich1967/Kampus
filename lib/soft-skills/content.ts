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

export const TIME_LESSONS: Lesson[] = [
  {
    id: "planifica-antes",
    title: "Planifica antes de estudiar",
    minutes: 6,
    intro:
      "Estudiar sin plan es abrir el cuaderno «a ver qué sale». Diez minutos de planificación te ahorran horas de vueltas: decides una vez, y después solo ejecutas.",
    sections: [
      {
        heading: "La regla de las 3 prioridades",
        body: "Cada día de estudio elige máximo tres prioridades y escríbelas en orden. No una lista de doce cosas: tres. Si todo es prioridad, nada lo es. La primera de la lista es la que harías aunque solo tuvieras una hora.",
      },
      {
        heading: "Bloques, no intenciones",
        body: "«Estudiar historia» es una intención. «Historia, 4:00–4:45, el tema de la Independencia» es un bloque. Un bloque tiene hora de inicio, duración y tema concreto. Lo que no tiene hora, compite contra todo y suele perder.",
      },
      {
        heading: "Planifica la noche anterior",
        body: "El plan del día se hace mejor la noche antes: tardas cinco minutos, duermes sin la cabeza dando vueltas y al despertar ya sabes por dónde empiezas. Empezar es la mitad del trabajo; el plan te regala el arranque.",
      },
    ],
    exampleBad: "«Hoy estudio de todo un poco.» Resultado: abres tres materias, no terminas ninguna y cierras el día con la sensación de no haber avanzado.",
    exampleGood:
      "«Mis 3 de hoy: 1) Matemáticas 4:00–4:45 (ejercicios de fracciones). 2) Historia 5:00–5:40 (leer y subrayar el tema 2). 3) Inglés 6:00–6:20 (vocabulario). Si sobra tiempo, adelanto Ciencias.»",
    commonMistake: "Hacer listas enormes de tareas sin hora ni orden, que se convierten en una fuente diaria de frustración.",
    miniCheck: {
      question: "¿Cuál de estos es un bloque de estudio bien definido?",
      options: [
        "«Estudiar bastante Biología esta semana»",
        "«Biología, hoy 5:00–5:40, el tema de la célula, con resumen al final»",
        "«Ponerme al día con todo»",
      ],
      correctIndex: 1,
      explanation: "Tiene hora, duración, tema concreto y un cierre. Los otros dos son intenciones sin forma de cumplirse.",
    },
  },
  {
    id: "empezar-en-pequeno",
    title: "Empezar en pequeño: vence el arranque",
    minutes: 5,
    intro:
      "Casi nunca cuesta hacer la tarea: cuesta empezarla. El truco no es tener más fuerza de voluntad, es hacer el primer paso tan pequeño que no dé pereza.",
    sections: [
      {
        heading: "La versión de 5 minutos",
        body: "Ante cualquier tarea, pregúntate: «¿cuál es la versión de 5 minutos de esto?». No «hacer el trabajo de Historia», sino «abrir el documento y escribir el título y la primera frase». Casi siempre, al empezar, sigues solo. Y si no sigues, ya avanzaste algo.",
      },
      {
        heading: "Pomodoro: 25 y 5",
        body: "Trabaja 25 minutos con un temporizador y descansa 5. El temporizador convierte «estudiar toda la tarde» (inabarcable) en «aguantar este bloque» (posible). Cuatro bloques así son casi dos horas reales de estudio, más que una tarde entera «estudiando» con el teléfono.",
      },
      {
        heading: "Registra el arranque, no la perfección",
        body: "Marca en tu plan cada bloque que empezaste. Lo que se mide mejora: ver la cadena de días en que empezaste a tu hora vale más que cualquier discurso de motivación.",
      },
    ],
    exampleBad: "«El sábado me siento y hago todo el trabajo de una vez.» El sábado llega, el trabajo se ve enorme, y se pospone «para cuando tenga el ánimo».",
    exampleGood:
      "«Ahora solo abro el documento y escribo el esquema: tres subtítulos. Nada más.» Veinte minutos después llevas dos apartados, porque empezar era lo difícil.",
    commonMistake: "Esperar a «tener ganas» para empezar, cuando las ganas casi siempre llegan después de empezar, no antes.",
    miniCheck: {
      question: "Te enfrentas a un trabajo grande que llevas días posponiendo. ¿Primer paso correcto?",
      options: [
        "Esperar el fin de semana para hacerlo completo",
        "Hacer hoy su versión de 5 minutos: abrirlo y escribir el esquema",
        "Pensar en otra cosa hasta que se acerque la fecha",
      ],
      correctIndex: 1,
      explanation: "Empezar en pequeño rompe la inercia hoy. Esperar el momento perfecto es la forma elegante de no empezar nunca.",
    },
  },
  {
    id: "telefono-lejos",
    title: "El teléfono lejos: estudiar sin distracciones",
    minutes: 5,
    intro:
      "No pierdes el tiempo en el teléfono: pierdes la vuelta. Cada interrupción te cobra unos minutos de re-concentración, y al final estudiaste dos horas para aprovechar cuarenta minutos.",
    sections: [
      {
        heading: "Lejos vence a silenciado",
        body: "El teléfono boca abajo sigue ocupando tu cabeza («¿y si me escribió?»). Déjalo en otro cuarto o en una gaveta durante el bloque. La distancia física funciona donde la fuerza de voluntad falla: lo que no está, no tienta.",
      },
      {
        heading: "Diseña tu entorno, no tu carácter",
        body: "Mesa despejada, solo el material del bloque, agua a mano, puerta cerrada si se puede. Avisar en casa «estudio hasta las 5:40» convierte interrupciones en acuerdos. No necesitas más disciplina: necesitas menos obstáculos.",
      },
      {
        heading: "Las pausas también se planean",
        body: "En los 5 minutos de descanso sí: teléfono, baño, estirarte. La pausa planeada no rompe el ritmo, lo sostiene. Lo que rompe el estudio no es descansar, es «descansar» sin hora de vuelta.",
      },
    ],
    exampleBad: "Estudiar con el teléfono al lado «solo para emergencias»: 14 notificaciones después, no recuerdas ni en qué página ibas.",
    exampleGood:
      "«Bloque de 25: teléfono en la cocina, puerta cerrada, solo el cuaderno de Matemáticas. En la pausa reviso los mensajes y vuelvo.»",
    commonMistake: "Confiar en «yo sí puedo estudiar con el teléfono al lado»: la evidencia de tu última semana suele decir lo contrario.",
    miniCheck: {
      question: "¿Qué cambio protege mejor un bloque de estudio?",
      options: [
        "Silenciar el teléfono y dejarlo junto al cuaderno",
        "Dejar el teléfono en otro cuarto durante el bloque",
        "Revisar el teléfono «rápido» entre ejercicio y ejercicio",
      ],
      correctIndex: 1,
      explanation: "La distancia física elimina la tentación; el silencio solo la disimula. Revisar «rápido» es justo la interrupción que cobra la vuelta.",
    },
  },
  {
    id: "entregas-sin-corredera",
    title: "Entregas sin corredera: planifica hacia atrás",
    minutes: 7,
    intro:
      "La corredera de la última noche no es mala suerte: es un plan que nunca existió. Las entregas se trabajan hacia atrás, desde la fecha, repartiendo el peso en días normales.",
    sections: [
      {
        heading: "Divide en hitos con fecha",
        body: "Todo trabajo tiene partes: investigar, esquematizar, redactar, revisar. Ponle fecha a cada una, no solo a la entrega. «Entrega: viernes 24» se convierte en «material listo el lunes, esquema el martes, borrador el miércoles, revisión el jueves».",
      },
      {
        heading: "Deja un día de margen",
        body: "Planifica terminar un día antes de la fecha real. Ese margen absorbe lo que siempre pasa: se va la luz, te enfermas, una parte cuesta el doble. Sin margen, cualquier imprevisto es una tragedia; con margen, es un trámite.",
      },
      {
        heading: "Revisa el avance a mitad de camino",
        body: "En la fecha del segundo hito, mira dónde estás de verdad. Si vas atrasado, se ajusta el plan ese día, en pequeño: no la última noche, en grande. Detectar un atraso de un día cuesta un rato; detectar el de una semana cuesta la entrega.",
      },
    ],
    exampleBad: "Trabajo para el viernes: lunes «todavía hay tiempo», miércoles «mañana empiezo», jueves 11 p. m. empezando a investigar con sueño y sin margen para fallos.",
    exampleGood:
      "«Entrega viernes 24. Lunes: recopilo el material. Martes: esquema. Miércoles: borrador completo. Jueves: reviso y dejo listo. Viernes: entrego tranquilo (día de margen).»",
    commonMistake: "Contar solo la fecha de entrega y ninguno de los pasos intermedios, como si el trabajo se hiciera en un solo día mágico.",
    miniCheck: {
      question: "¿Para qué sirve el día de margen al planificar hacia atrás?",
      options: [
        "Para empezar un día más tarde sin culpa",
        "Para absorber imprevistos sin que se caiga la entrega",
        "Para entregar dos veces por si acaso",
      ],
      correctIndex: 1,
      explanation: "El margen es un colchón contra lo imprevisto. Se planifica terminar antes justamente porque algo siempre se complica.",
    },
  },
];

export const TIME_SIMULATIONS: Simulation[] = [
  {
    id: "planifica-tu-semana",
    title: "Planifica tu semana con un coach",
    minutes: 10,
    scenario:
      "La IA hace de coach de organización. Cuéntale lo que tienes esta semana (clases, entregas, exámenes) y construyan juntos un plan con prioridades y bloques. Al final te evalúa con la rúbrica.",
    opening:
      "Soy tu coach de organización. Vamos a planificar tu semana en serio: cuéntame qué tienes — entregas, exámenes, clases, compromisos — con sus fechas.",
    tutorContext:
      "SIMULACIÓN DE PLANIFICACIÓN SEMANAL. Actúas como un coach de organización y gestión del tiempo. Reglas: respuestas cortas (máximo 6 líneas), un paso por turno. Primero escucha todo lo que el estudiante tiene en la semana. Después pídele que elija sus 3 prioridades y ayúdale a convertir cada una en bloques con día, hora y tema concreto, usando planificación hacia atrás para las entregas y dejando un día de margen. Si el plan queda sobrecargado, dilo con franqueza y propón recortar. Al tercer o cuarto intercambio, cierra con retroalimentación usando esta rúbrica: Priorización (¿eligió bien sus 3?), Realismo (¿los bloques caben en su semana?), Concreción (¿cada bloque tiene hora y tema?). Una fortaleza, una mejora y un consejo. No hagas el plan entero sin él: el estudiante decide, tú guías.",
    rubric: ["Priorización de la semana", "Realismo del plan", "Bloques con hora y tema"],
  },
  {
    id: "decir-que-no",
    title: "La invitación de la noche anterior",
    minutes: 10,
    scenario:
      "Mañana tienes una entrega importante y tu amigo te invita a jugar en línea «solo un rato» desde las 8 p. m. La IA hace de tu amigo. Tu reto: cuidar tu plan sin pelearte — firmeza amable y una alternativa.",
    opening:
      "¡Epa! Hoy a las 8 entramos a jugar, va a estar todo el grupo. No me digas que no, es solo un rato y ese trabajo lo haces rápido mañana temprano.",
    tutorContext:
      "SIMULACIÓN DE LÍMITES Y GESTIÓN DEL TIEMPO. Actúas como el amigo que invita al estudiante a jugar en línea la noche antes de una entrega importante. Reglas: respuestas cortas (máximo 4 líneas), tono amistoso e insistente pero no tóxico, un paso por turno. Insiste una o dos veces con argumentos típicos («es solo un rato», «mañana lo haces»). Si el estudiante pone un límite claro y amable ofreciendo una alternativa concreta (otro día u hora después de la entrega), acepta de buena gana. Si cede «un rato», recuérdale riendo que ese rato suele ser tres horas. Al tercer intercambio, sal del personaje y da retroalimentación con esta rúbrica: Claridad del límite (¿dijo que no o un «quizás» que es sí?), Amabilidad (¿cuidó la amistad?), Alternativa (¿propuso otro momento concreto?). Una fortaleza, una mejora y un consejo.",
    rubric: ["Claridad del límite", "Amabilidad con el amigo", "Alternativa concreta"],
  },
];

export const TIME_CHALLENGE = {
  id: "reto-semana-planificada",
  title: "Reto de la semana: tu plan en papel",
  description:
    "Escribe hoy tus 3 prioridades de la semana con sus bloques (día, hora y tema) en un papel o en tu cuaderno, y déjalo donde lo veas. Al final de la semana vuelve aquí y escribe en 2 o 3 líneas: qué bloques cumpliste, cuál se cayó y por qué. Un plan no se juzga por bonito: se juzga por cuánto se cumplió.",
};

export const EMOTIONAL_LESSONS: Lesson[] = [
  {
    id: "nombra-lo-que-sientes",
    title: "Nombra lo que sientes",
    minutes: 5,
    intro:
      "«Estoy mal» no te dice qué hacer. «Estoy frustrado porque estudié y aun así fallé» sí. Ponerle nombre exacto a la emoción es el primer paso para manejarla: lo que no se nombra, manda.",
    sections: [
      {
        heading: "Más allá de «bien» y «mal»",
        body: "Debajo de «estoy mal» puede haber distintas emociones que piden cosas distintas: cansancio (pide descanso), frustración (pide otro método), vergüenza (pide perspectiva), rabia (pide una pausa), miedo (pide preparación). Pregúntate «¿qué es exactamente lo que siento?» y escríbelo en una frase.",
      },
      {
        heading: "Nombrar baja la intensidad",
        body: "Describir la emoción con palabras —aunque sea en un papel solo para ti— ordena la cabeza: la emoción pasa de ser una tormenta que «eres» a un estado que «tienes» y que va a pasar. No la elimina, pero te devuelve el volante.",
      },
      {
        heading: "Emoción no es orden",
        body: "Sentir ganas de dejar todo no es una instrucción de dejar todo. Sentir miedo a un examen no significa que vas a fallar. Las emociones informan; no deciden. Puedes sentir la rabia y, aun así, elegir no gritar. Ahí empieza la inteligencia emocional.",
      },
    ],
    exampleBad: "Sacas una mala nota y concluyes «soy un desastre, no sirvo para esto», y no estudias en tres días.",
    exampleGood:
      "«Estoy frustrado y un poco avergonzado: preparé el examen pero me bloqueé en la pregunta 3. La emoción es frustración, no un veredicto. Esta tarde reviso solo esa pregunta.»",
    commonMistake: "Confundir una emoción pasajera con una conclusión permanente sobre quién eres («soy bruto») en vez de un estado («hoy me bloqueé»).",
    miniCheck: {
      question: "Sacaste una nota baja. ¿Qué respuesta muestra mejor inteligencia emocional?",
      options: [
        "«No siento nada, me da igual» y no revisar el examen nunca",
        "«Estoy decepcionado: esperaba más. La emoción es decepción, y me dice que este tema lo estudio distinto»",
        "«Soy un desastre para esta materia» y dejar de estudiarla",
      ],
      correctIndex: 1,
      explanation: "Nombrar la emoción con precisión y leer lo que informa, sin convertirla ni en negación ni en sentencia sobre ti.",
    },
  },
  {
    id: "pausa-90-segundos",
    title: "La pausa: responde, no reacciones",
    minutes: 5,
    intro:
      "Entre lo que pasa y lo que haces hay un espacio pequeño. En ese espacio está tu libertad: reaccionar es automático; responder es elegido. La pausa lo ensancha.",
    sections: [
      {
        heading: "La ola pasa",
        body: "El pico de una emoción intensa —la rabia de un comentario injusto, el susto de una pregunta sorpresa— dura poco si no lo alimentas con más pensamientos. Respirar lento unas cuantas veces le da tiempo a la ola de bajar antes de que hables o actúes.",
      },
      {
        heading: "El protocolo P-R-E",
        body: "Paro: detén la mano y la boca (nada de enviar ese mensaje todavía). Respiro: dos o tres respiraciones lentas, soltando el aire despacio. Elijo: «¿qué respuesta me deja bien conmigo mañana?». Esas tres letras caben en cualquier situación: un examen, una discusión, un chat que se calienta.",
      },
      {
        heading: "Comprar tiempo también es pausa",
        body: "Si la emoción es muy fuerte, dilata la respuesta con una frase: «Déjame pensarlo y te respondo», «Necesito un minuto». Casi nada importante exige respuesta en los próximos 30 segundos, excepto en un examen de emergencia. La pausa no es debilidad: es control.",
      },
    ],
    exampleBad: "Tu compañero dice en el grupo «eso te quedó horrible» y en el acto le respondes tres mensajes con todo lo que hace mal él. El trabajo queda, el grupo roto.",
    exampleGood:
      "Lees el mensaje, la rabia sube… P-R-E. Al rato respondes: «No me gustó cómo sonó eso. Si hay algo que mejorar del trabajo, lo revisamos juntos esta tarde.»",
    commonMistake: "Creer que decir «yo soy así, digo lo que pienso al momento» es honestidad, cuando suele ser la emoción hablando sin filtro.",
    miniCheck: {
      question: "Te llega un mensaje que te hace hervir la sangre. ¿Primer paso del protocolo?",
      options: [
        "Responder al instante para que no se enfríe el tema",
        "Parar, respirar y luego elegir la respuesta",
        "Bloquear a la persona para siempre",
      ],
      correctIndex: 1,
      explanation: "La pausa no evita la conversación: evita que la rabia la dé por ti. Bloquear o explotar son dos formas de no responder.",
    },
  },
  {
    id: "ansiedad-ante-examenes",
    title: "Ansiedad ante los exámenes: plan, no pánico",
    minutes: 6,
    intro:
      "Un poco de nervios activa; demasiados bloquean. La ansiedad de examen no se cura con «cálmate»: se maneja con preparación repartida, sueño y un plan para el momento del bloqueo.",
    sections: [
      {
        heading: "La ansiedad baja cuando el plan sube",
        body: "Gran parte de la ansiedad es incertidumbre: «no sé si sé». Estudiar en bloques repartidos (ver la ruta de Gestión del tiempo) convierte esa niebla en lista: «estos 3 temas me quedan flojos». Lo concreto asusta menos que lo difuso, y cada bloque completado es evidencia contra el pánico.",
      },
      {
        heading: "La víspera y el sueño",
        body: "La noche antes no se gana un examen: se protege. Repaso ligero, materiales listos, y dormir bien —el cerebro ordena lo estudiado durmiendo—. Trasnochar «repasando» suele cobrarse en memoria y en nervios al día siguiente.",
      },
      {
        heading: "Si te bloqueas durante el examen",
        body: "Plan de rescate: suelta el lápiz, respira lento 20 segundos, lee la pregunta de nuevo y subraya qué pide exactamente. Si sigue bloqueada, márcala y pasa a la siguiente: avanzar en otras preguntas devuelve confianza, y muchas veces la respuesta aparece al volver. Un bloqueo es un momento, no el examen entero.",
      },
    ],
    exampleBad: "Víspera trasnochando entre café y apuntes, entras al examen sin dormir, te bloqueas en la pregunta 2 y ya no ves el resto «porque todo va a salir mal».",
    exampleGood:
      "«Estudié en bloques toda la semana. Hoy repaso ligero y a dormir. Si me bloqueo: respiro, marco la pregunta y sigo. Ya lo practiqué.»",
    commonMistake: "Intentar calmar la ansiedad evitando pensar en el examen: lo evitado se agranda. Preparar en concreto lo encoge.",
    miniCheck: {
      question: "Te bloqueas en una pregunta del examen. ¿Qué haces según el plan de rescate?",
      options: [
        "Quedarte mirando esa pregunta hasta que salga, cueste lo que cueste",
        "Respirar, marcarla, seguir con las demás y volver luego",
        "Entregar el examen: un bloqueo significa que no sabes nada",
      ],
      correctIndex: 1,
      explanation: "Marcar y seguir protege el resto del examen y suele desbloquear la respuesta. Un bloqueo es un momento, no un diagnóstico.",
    },
  },
  {
    id: "recibir-criticas",
    title: "Recibir críticas sin explotar ni hundirte",
    minutes: 6,
    intro:
      "Una crítica puede doler y, a la vez, ser lo más útil que te digan en el mes. La habilidad no es que no duela: es escucharla entera, separar lo útil de lo demás, y responder con la cabeza fría.",
    sections: [
      {
        heading: "Separa el hecho de la interpretación",
        body: "«Tu exposición se pasó de tiempo» es un hecho comprobable. «No te importa la clase» es una interpretación. Quédate con los hechos, pide ejemplos concretos («¿en qué parte lo notaste?») y suelta las etiquetas sobre tu persona. Lo concreto se puede mejorar; lo personal solo hiere.",
      },
      {
        heading: "Escucha primero, responde después",
        body: "Interrumpir para defenderte cierra la información justo cuando empieza lo valioso. Escucha completo, toma nota si hace falta y agradece lo específico («gracias, lo del tiempo no lo había notado»). Ya tendrás tu turno de explicar el contexto, con calma y completo, no a pedazos entre interrupciones.",
      },
      {
        heading: "Quédate con el oro, suelta el resto",
        body: "No toda crítica es justa ni viene bien dicha. Aun así, pregunta: «¿hay algo aquí que sea verdad y me sirva?». Si lo hay, es tuyo, gratis. Si la crítica fue solo un desahogo ajeno, se suelta sin cargarlo días enteros. Ni explotar ni hundirte: filtrar.",
      },
    ],
    exampleBad: "El profesor dice que tu trabajo está desordenado: respondes a la defensiva («los demás están peores»), no oyes en qué está desordenado y entregas el siguiente igual.",
    exampleGood:
      "Escuchas completo y preguntas: «¿Desordenado en qué parte: el orden de las ideas o la presentación?». Anotas la respuesta y cierras con: «Entendido, el próximo lo entrego con índice y conclusiones separadas.»",
    commonMistake: "Responder a la crítica defendiendo tu intención («pero yo quise decir…») en vez de revisar el resultado, que es lo que el otro vio.",
    miniCheck: {
      question: "Te dicen «tu trabajo está desordenado». ¿Qué respuesta aprovecha la crítica?",
      options: [
        "«Pues a nadie más le pareció desordenado»",
        "«Puede ser: ¿en qué parte se nota más, en las ideas o en la forma?»",
        "No decir nada y no corregir nada, para no darle la razón",
      ],
      correctIndex: 1,
      explanation: "Pedir lo concreto convierte una etiqueta hiriente en información usable. Defenderte o callarte en rebeldía pierden el dato.",
    },
  },
];

export const EMOTIONAL_SIMULATIONS: Simulation[] = [
  {
    id: "examen-nervioso",
    title: "El examen que te quita el sueño",
    minutes: 10,
    scenario:
      "Mañana tienes un examen importante y la ansiedad no te deja ni estudiar ni dormir. La IA hace de un mentor que ya pasó por eso: cuéntale qué sientes y sal con la emoción nombrada y un plan concreto para hoy y para el momento del examen.",
    opening:
      "Cuéntame: mañana es el examen y te noto tenso desde ya. Dime con tus palabras qué es exactamente lo que sientes, sin «estoy mal»: ¿qué hay debajo?",
    tutorContext:
      "SIMULACIÓN DE INTELIGENCIA EMOCIONAL. Actúas como un mentor sereno que acompaña a un estudiante ansioso la víspera de un examen. Reglas: respuestas cortas (máximo 5 líneas), tono cercano, un paso por turno. Primero ayuda al estudiante a NOMBRAR la emoción con precisión (miedo a fallar, vergüenza, presión familiar) haciéndole preguntas, sin burlarte ni minimizar («no es para tanto» está prohibido). Después ayúdale a convertirla en plan: qué repasar en concreto esta tarde, proteger el sueño y un plan de rescate si se bloquea en el examen (respirar, marcar y seguir). Al tercer o cuarto intercambio, cierra con retroalimentación con esta rúbrica: Nombrar la emoción (¿la describió con precisión?), Plan concreto (¿salió con acciones, no solo ánimos?), Mirada realista (¿se trató con exigencia sin hundirse?). Una fortaleza, una mejora y un consejo.",
    rubric: ["Nombrar la emoción", "Plan concreto", "Mirada realista"],
  },
  {
    id: "la-nota-inesperada",
    title: "La nota que no esperabas",
    minutes: 10,
    scenario:
      "Estudiaste, esperabas buena nota, y salió baja. La IA hace de tu profesor al entregarla, con retroalimentación directa. Tu reto: escuchar completo, separar hecho de interpretación y salir con pasos claros de mejora.",
    opening:
      "Te entrego tu examen: sacaste menos de lo que esperabas. Seré directo: tu desarrollo se va por las ramas y pierdes el hilo de lo que pregunta el ejercicio. ¿Qué me dices?",
    tutorContext:
      "SIMULACIÓN DE RECIBIR CRÍTICAS. Actúas como el profesor que acaba de entregar una nota baja con retroalimentación directa (el desarrollo se va por las ramas y pierde el hilo de la pregunta). Reglas: respuestas cortas (máximo 4 líneas), directo pero justo, un paso por turno. Si el estudiante se defiende o ataca, mantén la calma y repite el hecho concreto con un ejemplo. Si pide detalles de cómo mejorar, dáselos con gusto en pasos concretos. Si solo se hunde («soy un desastre»), corrígele: «esto es sobre este examen, no sobre ti». Al tercer intercambio, sal del personaje y da retroalimentación con esta rúbrica: Escucha (¿dejó terminar y oyó lo concreto?), Separación (¿distinguió el hecho de la interpretación?), Pasos (¿pidió o acordó mejoras concretas?). Una fortaleza, una mejora y un consejo.",
    rubric: ["Escucha sin interrumpir", "Hecho vs interpretación", "Pasos de mejora"],
  },
];

export const EMOTIONAL_CHALLENGE = {
  id: "reto-diario-emocional",
  title: "Reto de la semana: diario de 3 días",
  description:
    "Durante 3 días, al final del día escribe en un papel tres líneas: la emoción principal del día, qué la disparó y qué hiciste con ella (reaccionaste o respondiste). Al terminar, escribe aquí qué patrón viste: qué te dispara más seguido y qué pausa te funcionó. No se trata de sentir «bien» todos los días, sino de conocerte en todos.",
};

export const TEAM_LESSONS: Lesson[] = [
  {
    id: "roles-claros",
    title: "Roles claros desde el día uno",
    minutes: 6,
    intro:
      "La mayoría de los trabajos en equipo no fracasan por flojos: fracasan por difusos. Nadie sabía exactamente qué le tocaba, y el día de la entrega todos «pensaban que lo hacía otro».",
    sections: [
      {
        heading: "Divide por entregables, no por ganas",
        body: "Parte el trabajo en entregables con nombre: «investigar el tema 1», «hacer las láminas», «redactar conclusiones», «exponer la parte 2». Cada entregable tiene UN responsable, aunque otros ayuden. Dos responsables del mismo entregable es lo mismo que ninguno.",
      },
      {
        heading: "Cada quien según su fuerte",
        body: "Repartir bien no es repartir parejo: es repartir inteligente. Quien dibuja bien hace los gráficos; quien escribe claro redacta; quien no se traba hablando expone. Pregunta «¿en qué eres bueno para este trabajo?» antes de asignar. Y lo que nadie quiere, se sortea o se rota: no se lo queda siempre el mismo.",
      },
      {
        heading: "Déjalo por escrito el mismo día",
        body: "Los acuerdos de palabra se evaporan. El mismo día, escribe en el chat del grupo: quién hace qué, para cuándo, y qué entrega cada quien primero (un avance, no todo al final). Ese mensaje es la memoria del equipo y la paz del proyecto.",
      },
    ],
    exampleBad: "Día uno: «bueno, ahí vamos viendo». Día de la entrega: falta la mitad, dos hicieron lo mismo y nadie hizo las conclusiones.",
    exampleGood:
      "«Queda así: Ana investiga y pasa sus notas el martes; Luis arma las láminas con eso el miércoles; yo redacto y junto todo el jueves; exponemos Ana y yo. Primer avance de cada quien: mañana en la noche.»",
    commonMistake: "Asignar «entre todos hacemos todo», que suena muy unido y garantiza que nadie responda por nada.",
    miniCheck: {
      question: "¿Cuál reparto tiene roles claros?",
      options: [
        "«Todos investigamos todo y al final vemos»",
        "«Ana: investigación (martes). Luis: láminas (miércoles). Yo: redacción y unión (jueves). Avances mañana.»",
        "«El que tenga tiempo va avanzando lo que pueda»",
      ],
      correctIndex: 1,
      explanation: "Entregables concretos, un responsable por entregable y fechas. Los demás repartos dejan todo «a ver quién».",
    },
  },
  {
    id: "reuniones-que-sirven",
    title: "Reuniones que sirven (y chats que no se eternizan)",
    minutes: 5,
    intro:
      "Un equipo no necesita más reuniones: necesita reuniones con punto. Y un chat con decisiones visibles, no 200 mensajes donde el acuerdo quedó enterrado entre stickers.",
    sections: [
      {
        heading: "Toda reunión contesta tres preguntas",
        body: "¿Qué llevamos? ¿Qué nos falta? ¿Quién hace qué y para cuándo? Si la reunión no termina con respuestas a eso, fue una conversa, no una reunión. Quien coordina llega con esas tres preguntas y no suelta la reunión hasta tenerlas.",
      },
      {
        heading: "Cierra con acuerdos en voz alta",
        body: "Antes de despedirse, alguien lee los acuerdos: «Entonces: Ana pasa las notas el martes, Luis prueba las láminas el miércoles, nos reunimos el jueves 20 minutos». Repetirlo en voz alta caza los malentendidos ahí mismo, no el día de la entrega.",
      },
      {
        heading: "La minuta en el chat manda",
        body: "Después de cada acuerdo importante, alguien escribe la minuta en el chat del grupo: fecha, acuerdos, responsables. Cuando haya un «yo nunca dije eso», la minuta lo resuelve sin discusión. Es el mismo mensaje de roles de la primera lección, actualizado.",
      },
    ],
    exampleBad: "Reunión de una hora para «hablar del trabajo»: anécdotas, quejas del profesor, cero acuerdos. Al día siguiente nadie sabe qué cambió.",
    exampleGood:
      "«15 minutos: llevamos la investigación; falta la maqueta; Luis la termina el jueves y yo reviso el viernes. Minuta en el chat apenas colguemos.»",
    commonMistake: "Usar la reunión para trabajar lo que cada quien debía traer, en vez de para decidir lo siguiente.",
    miniCheck: {
      question: "Termina una reunión del equipo. ¿Qué debe pasar antes de despedirse?",
      options: [
        "Cada quien anota en secreto lo que cree que le toca",
        "Alguien lee los acuerdos en voz alta: qué, quién y para cuándo — y quedan en la minuta del chat",
        "Programar la próxima reunión para ahí sí decidir",
      ],
      correctIndex: 1,
      explanation: "Los acuerdos dichos y escritos a la vez evitan el «yo entendí otra cosa» del día de la entrega.",
    },
  },
  {
    id: "cuando-alguien-no-cumple",
    title: "Cuando alguien no cumple: la escalera de soluciones",
    minutes: 6,
    intro:
      "En casi todo equipo alguien se atrasa. Lo que separa a los equipos buenos no es que no pase, sino el orden en que lo resuelven: hablar pronto y en privado, no explotar tarde y en público.",
    sections: [
      {
        heading: "Paso 1: pregunta antes de acusar",
        body: "A veces el atraso es un problema real: enfermedad, familia, no entendió su parte. La primera conversación es en privado y con una pregunta: «¿Qué pasó con tu parte?». Lo que oigas define el paso siguiente. Acusar sin saber quiebra al equipo aunque tengas razón.",
      },
      {
        heading: "Paso 2: acuerdo nuevo, concreto y corto",
        body: "Si puede recuperarse, fija un acuerdo nuevo: qué entrega, cuándo exactamente, y un avance intermedio («esta noche me pasas el borrador aunque esté feo»). Los avances intermedios son la alarma temprana: si el borrador no llega, lo sabes con días de margen, no con horas.",
      },
      {
        heading: "Paso 3: reorganiza y, si toca, informa con hechos",
        body: "Si aun así no cumple, el equipo protege la entrega: se reparte su parte entre los demás y se le informa al profesor con hechos y sin drama: «Su parte no llegó en dos fechas acordadas; la asumimos entre Ana y yo». Hechos, fechas y minuta — eso es informar; nombres y quejas sin datos es chisme.",
      },
    ],
    exampleBad: "Nadie dice nada «para no pelear» durante dos semanas. La noche de la entrega, sin la parte, explotan en el chat culpando al ausente y entregan incompleto.",
    exampleGood:
      "«Oye, tu parte era para ayer. ¿Qué pasó? … Ok, nuevo trato: esta noche el borrador como esté y mañana la versión final. Si no llega, Luis y yo la absorbemos y avisamos al profe con la minuta.»",
    commonMistake: "Hacer la parte del otro en silencio y cobrarla con rabia después: el equipo entrega, pero queda roto y el patrón se repite.",
    miniCheck: {
      question: "Un compañero lleva 3 días de atraso. ¿Cuál es el primer paso de la escalera?",
      options: [
        "Contarle al profesor de una vez que no está haciendo nada",
        "Hablar con él en privado: preguntar qué pasó antes de acusar",
        "Hacer su parte en silencio y echárselo en cara al exponer",
      ],
      correctIndex: 1,
      explanation: "Primero la conversación privada con pregunta: sin saber la causa, cualquier paso siguiente puede ser injusto o inútil.",
    },
  },
  {
    id: "liderar-sin-mandar",
    title: "Liderar sin mandar: organiza, no ordenes",
    minutes: 5,
    intro:
      "Liderar un equipo de estudiantes no es ser el jefe: es ser quien hace que las cosas pasen. El líder que ordena consigue obediencia a regañadientes; el que organiza consigue compromiso.",
    sections: [
      {
        heading: "El líder sirve al plan, no al ego",
        body: "Coordinar significa: recordar las fechas, convocar los 15 minutos, llevar la minuta, preguntar «¿cómo vas con tu parte?» antes del vencimiento. Es trabajo de servicio. Quien lidera para lucirse termina en un equipo que le esconde los problemas hasta que explotan.",
      },
      {
        heading: "Pide con el porqué, no con el dedito",
        body: "«Haz las láminas porque sí» vs «¿Puedes con las láminas? Eres el que mejor resume en gráfico, y sin ellas el jueves no hay nada que exponer». La misma tarea, otra respuesta. Explicar para qué sirve el trabajo de cada quien es el combustible del equipo.",
      },
      {
        heading: "Cierra dando crédito y revisando",
        body: "Al terminar, el líder nombra los aportes de cada quien —en la exposición y ante el profesor— y propone una revisión breve: «¿qué nos funcionó y qué hacemos distinto la próxima?». El crédito dado se devuelve en esfuerzo la próxima vez; el crédito robado también se recuerda.",
      },
    ],
    exampleBad: "«Yo soy el líder: tú haces esto y esto, y sin discutir.» El equipo cumple a medias, nadie avisa de los problemas y en la exposición lo dejan solo.",
    exampleGood:
      "«Yo coordino las fechas y la minuta. Ana, tu fuerte es investigar: ¿te quedas con el tema 1? Luis, tus láminas resumen mejor que un texto: ¿las armas el miércoles?»",
    commonMistake: "Creer que liderar es quedarse con la parte más visible (exponer) en vez de con la más útil (que todo llegue a tiempo).",
    miniCheck: {
      question: "¿Cuál frase es de un líder que organiza (no que manda)?",
      options: [
        "«Yo mando aquí: cada quien hace lo que yo diga»",
        "«Llevo las fechas y la minuta; Ana, ¿te quedas con la investigación? Es tu fuerte y la necesitamos el martes»",
        "«El líder expone todo, ustedes solo pasen el material»",
      ],
      correctIndex: 1,
      explanation: "Organiza, asigna por fortalezas con el porqué y se queda el trabajo de coordinación: eso hace que las cosas pasen sin mandar.",
    },
  },
];

export const TEAM_SIMULATIONS: Simulation[] = [
  {
    id: "reunion-de-arranque",
    title: "La reunión de arranque",
    minutes: 10,
    scenario:
      "Primer día del trabajo en equipo. Tus dos compañeros (la IA los interpreta) llegan con buena onda pero sin nada claro: «eso lo vemos en el camino». Tu reto: salir de la reunión con roles, fechas y acuerdos escritos.",
    opening:
      "Bueno, ya tenemos el tema. Yo digo que no nos compliquemos: cada quien va viendo por su lado y cerca de la entrega juntamos todo. ¿No?",
    tutorContext:
      "SIMULACIÓN DE TRABAJO EN EQUIPO. Interpretas a DOS compañeros del estudiante (márcalos como «Luis:» y «Carla:» cuando hablen), relajados y con tendencia a dejar todo ambiguo («eso se ve después», «alguien lo hará»). Reglas: respuestas cortas (máximo 6 líneas en total), un paso por turno. Acepta de buena gana cada propuesta concreta del estudiante (roles con nombre, fechas, avances intermedios, minuta) y sigue poniendo niebla en lo que quede vago. Si al segundo intercambio ya hay roles y fechas, propón colgar («bueno, ¿quedó todo?»). Al tercer intercambio, sal de los personajes y evalúa SOLO al estudiante con esta rúbrica: Roles claros (¿cada entregable quedó con responsable?), Fechas (¿hubo calendario con avances?), Cierre (¿resumió los acuerdos y los dejó por escrito?). Una fortaleza, una mejora y un consejo.",
    rubric: ["Roles con responsable", "Fechas y avances", "Acuerdos resumidos"],
  },
  {
    id: "salva-el-proyecto",
    title: "A 48 horas: tu compañero se cae",
    minutes: 10,
    scenario:
      "La entrega es en 48 horas y tu compañero (la IA) te avisa ahora que no va a poder terminar su parte. Tu reto: sin pelear y sin hundir al equipo, reorganizar — redistribuir, recortar alcance y decidir si avisar al profesor.",
    opening:
      "Tengo que decirte algo: mi parte no va a estar. Surgió un problema en mi casa y no he podido ni abrir el documento. La entrega es pasado mañana… ¿qué hacemos?",
    tutorContext:
      "SIMULACIÓN DE CRISIS DE EQUIPO. Actúas como el compañero que a 48 horas de la entrega avisa que no puede con su parte por un problema familiar real. Reglas: respuestas cortas (máximo 4 líneas), tono apenado y colaborador, un paso por turno. Ofrece lo que sí puedes hacer si el estudiante lo explora (una parte pequeña, pasar tus notas, revisar al final). Si el estudiante solo acusa o explota, retírate («mejor ni te hablo») y espera a que cambie el tono. Si propone un plan concreto (redistribuir, recortar alcance, nuevo mini-plazo para lo tuyo), acéptalo y confirma tu parte. Al tercer intercambio, sal del personaje y da retroalimentación con esta rúbrica: Tono (¿habló sin romper el grupo?), Diagnóstico (¿preguntó qué pasó y con qué sí cuentas?), Reorganización (¿salió un plan concreto con responsables y fechas, incluida la decisión sobre el profesor?). Una fortaleza, una mejora y un consejo.",
    rubric: ["Tono sin romper el grupo", "Diagnóstico rápido", "Plan de reorganización"],
  },
];

export const TEAM_CHALLENGE = {
  id: "reto-minuta-equipo",
  title: "Reto de la semana: la minuta de tu equipo",
  description:
    "En tu próximo trabajo en equipo, sé quien deja la minuta: un mensaje corto en el chat del grupo con los entregables, el responsable de cada uno y las fechas (incluido un avance intermedio). Al final de la semana escribe aquí cómo reaccionó el equipo y si la minuta evitó algún «yo pensé que lo hacías tú». Cinco líneas tuyas pueden ahorrarle al equipo la peor noche del semestre.",
};

export type RouteId = "comunicacion" | "gestion-del-tiempo" | "inteligencia-emocional" | "trabajo-en-equipo";

export type RouteContent = {
  routeId: RouteId;
  lessons: Lesson[];
  simulations: Simulation[];
  challenge: { id: string; title: string; description: string };
};

export const ROUTE_CONTENT: Record<RouteId, RouteContent> = {
  comunicacion: {
    routeId: "comunicacion",
    lessons: COMMUNICATION_LESSONS,
    simulations: COMMUNICATION_SIMULATIONS,
    challenge: COMMUNICATION_CHALLENGE,
  },
  "gestion-del-tiempo": {
    routeId: "gestion-del-tiempo",
    lessons: TIME_LESSONS,
    simulations: TIME_SIMULATIONS,
    challenge: TIME_CHALLENGE,
  },
  "inteligencia-emocional": {
    routeId: "inteligencia-emocional",
    lessons: EMOTIONAL_LESSONS,
    simulations: EMOTIONAL_SIMULATIONS,
    challenge: EMOTIONAL_CHALLENGE,
  },
  "trabajo-en-equipo": {
    routeId: "trabajo-en-equipo",
    lessons: TEAM_LESSONS,
    simulations: TEAM_SIMULATIONS,
    challenge: TEAM_CHALLENGE,
  },
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
    available: true,
  },
  {
    id: "trabajo-en-equipo",
    dimension: "equipo",
    title: "Trabajo en equipo y liderazgo",
    tagline: "Organizar, cumplir y resolver diferencias.",
    available: true,
  },
  {
    id: "gestion-del-tiempo",
    dimension: "tiempo",
    title: "Gestión del tiempo y hábitos",
    tagline: "Planificar y estudiar sin dejarlo para el final.",
    available: true,
  },
];
