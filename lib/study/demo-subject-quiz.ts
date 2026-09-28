import type { RescueQuizItem } from "@/lib/class-rescue";

type SubjectLesson = {
  key: string;
  match: RegExp;
  label: string;
  questions: RescueQuizItem[];
};

function lesson(
  key: string,
  match: RegExp,
  label: string,
  questions: RescueQuizItem[],
): SubjectLesson {
  return { key, match, label, questions };
}

/** Sample lessons for the demo profile. Each item checks a fact from that subject. */
const LESSONS: SubjectLesson[] = [
  lesson("calculo", /calcul/, "Cálculo · integrales y derivadas", [
    {
      question: "¿Cuál es la integral indefinida de 2x?",
      options: ["x² + C", "2x² + C", "2 + C", "x + C"],
      answerIndex: 0,
    },
    {
      question: "¿Cuál es la derivada de x²?",
      options: ["x", "2x", "x²", "2"],
      answerIndex: 1,
    },
    {
      question: "¿Qué relaciona el teorema fundamental del cálculo?",
      options: [
        "La media y la mediana",
        "Una derivada y la integral de esa función",
        "Dos matrices inversas",
        "El máximo y el mínimo de un conjunto",
      ],
      answerIndex: 1,
    },
    {
      question: "¿Cuál es la integral indefinida de una constante k?",
      options: ["k + C", "kx + C", "k/x + C", "x + k"],
      answerIndex: 1,
    },
  ]),
  lesson("programacion", /program|algorit/, "Programación · recursión", [
    {
      question: "¿Qué necesita una función recursiva para no llamarse para siempre?",
      options: [
        "Un comentario en la primera línea",
        "Un caso base que ya no se llama a sí misma",
        "Devolver siempre el mismo número",
        "Imprimir el nombre de la función",
      ],
      answerIndex: 1,
    },
    {
      question: "¿Qué hace una función recursiva?",
      options: [
        "Se llama a sí misma para resolver un caso más pequeño",
        "Borra la memoria del programa",
        "Solo puede usarse una vez",
        "Convierte el código en una tabla",
      ],
      answerIndex: 0,
    },
    {
      question: "Si una recursión no tiene caso base, ¿qué suele ocurrir?",
      options: [
        "El programa termina en el primer paso",
        "La llamada se repite hasta agotar la pila",
        "La función se convierte en un ciclo for",
        "El resultado es siempre cero",
      ],
      answerIndex: 1,
    },
    {
      question: "En factorial(n) = n × factorial(n − 1), ¿cuál es el caso base habitual?",
      options: ["factorial(100) = 100", "factorial(0) = 1", "factorial(n) = n", "factorial(1) = 0"],
      answerIndex: 1,
    },
  ]),
  lesson("bases", /base de datos|bases de datos|sql/, "Bases de datos · normalización", [
    {
      question: "¿Qué exige la primera forma normal (1FN)?",
      options: [
        "Que cada celda guarde un solo valor, no una lista",
        "Que la tabla no tenga clave",
        "Que todas las columnas sean texto",
        "Que haya una sola fila",
      ],
      answerIndex: 0,
    },
    {
      question: "¿Qué identifica una clave primaria?",
      options: [
        "Una fila de forma única",
        "El color de la tabla",
        "El número de columnas",
        "El usuario que creó la base",
      ],
      answerIndex: 0,
    },
    {
      question: "¿Qué evita la tercera forma normal (3FN)?",
      options: [
        "Dependencias transitivas entre columnas que no son clave",
        "El uso de números",
        "Las consultas con WHERE",
        "Las tablas con más de dos columnas",
      ],
      answerIndex: 0,
    },
    {
      question: "¿Qué hace una clave foránea?",
      options: [
        "Apunta a la clave de otra tabla",
        "Borra todas las filas al guardar",
        "Cifra la contraseña de la base",
        "Ordena las filas por nombre",
      ],
      answerIndex: 0,
    },
  ]),
  lesson("estadistica", /estad|proba/, "Estadística · centro y dispersión", [
    {
      question: "En 1, 2, 2, 3 y 100, ¿qué medida se desplaza más por el 100?",
      options: ["La mediana", "La moda", "La media", "El mínimo"],
      answerIndex: 2,
    },
    {
      question: "¿Entre qué valores está una probabilidad?",
      options: ["Entre −1 y 1", "Entre 0 y 1", "Solo 0 o 100", "Cualquier número entero"],
      answerIndex: 1,
    },
    {
      question: "¿Qué describe la desviación estándar?",
      options: [
        "Qué tan dispersos están los datos respecto a la media",
        "El valor que más se repite",
        "La cantidad de gráficos",
        "El nombre de la muestra",
      ],
      answerIndex: 0,
    },
    {
      question: "¿Cuál es la diferencia entre población y muestra?",
      options: [
        "La población es el grupo completo; la muestra es una parte",
        "Son el mismo conjunto",
        "La muestra siempre es más grande",
        "La población es solo el promedio",
      ],
      answerIndex: 0,
    },
  ]),
];

function normalizeSubject(subject: string): string {
  return subject
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function demoLessonForSubject(subject: string): { label: string; questions: RescueQuizItem[] } | null {
  const key = normalizeSubject(subject);
  const found = LESSONS.find((lesson) => lesson.match.test(key));
  if (!found) return null;
  return {
    label: found.label,
    questions: found.questions.map((q) => ({ ...q, sourceClassLabel: `Lección de muestra · ${found.label}` })),
  };
}

/** Questions that test the sample lesson. Unknown subjects get no generic study-habit quiz. */
export function buildDemoSubjectQuiz(subject: string): RescueQuizItem[] {
  return demoLessonForSubject(subject)?.questions ?? [];
}
