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

const REASONS: Record<string, string> = {
  "¿Cuál es la integral indefinida de 2x?":
    "La derivada de x² es 2x, así que la integral de 2x vuelve a x². Se suma C porque las constantes desaparecen al derivar. 2x² derivaría a 4x, no a 2x.",
  "¿Cuál es la derivada de x²?":
    "La regla de la potencia baja el exponente: 2 · x¹ = 2x. Quedarse en x² no deriva, y 2 sería la derivada de 2x.",
  "¿Qué relaciona el teorema fundamental del cálculo?":
    "El teorema dice que derivar e integrar son operaciones inversas. No habla de media, matrices ni máximos.",
  "¿Cuál es la integral indefinida de una constante k?":
    "La derivada de kx es k, así que la integral de k es kx + C. k + C no crece con x, y k/x derivaría a otra función.",
  "¿Qué necesita una función recursiva para no llamarse para siempre?":
    "El caso base es el paso que ya no se llama a sí mismo. Sin eso, la función sigue llamándose y no termina.",
  "¿Qué hace una función recursiva?":
    "Se llama a sí misma con un caso más pequeño. No borra memoria ni se convierte en una tabla.",
  "Si una recursión no tiene caso base, ¿qué suele ocurrir?":
    "Cada llamada espera a la siguiente y se apilan. Al no haber caso base, la pila se llena. No se convierte sola en un ciclo for.",
  "En factorial(n) = n × factorial(n − 1), ¿cuál es el caso base habitual?":
    "factorial(0) = 1 detiene la cadena. factorial(1) = 0 daría 0 para cualquier factorial, y eso es falso porque 1! es 1.",
  "¿Qué exige la primera forma normal (1FN)?":
    "Cada celda debe guardar un solo valor. Una lista dentro de una celda no está en primera forma normal.",
  "¿Qué identifica una clave primaria?":
    "La clave primaria señala una fila y no se repite. No describe el color ni el número de columnas.",
  "¿Qué evita la tercera forma normal (3FN)?":
    "Evita que una columna que no es clave dependa de otra columna que tampoco es clave. No prohíbe los números ni el WHERE.",
  "¿Qué hace una clave foránea?":
    "Apunta a la clave de otra tabla para relacionar filas. No borra filas ni ordena por nombre.",
  "En 1, 2, 2, 3 y 100, ¿qué medida se desplaza más por el 100?":
    "La media suma todos los valores, así que el 100 la sube mucho. La mediana se queda en el valor del centro, que es 2.",
  "¿Entre qué valores está una probabilidad?":
    "Una probabilidad va de 0 (imposible) a 1 (seguro). No puede ser negativa ni mayor que 1.",
  "¿Qué describe la desviación estándar?":
    "Mide qué tan alejados están los datos de la media. La moda es el valor que más se repite, no la desviación.",
  "¿Cuál es la diferencia entre población y muestra?":
    "La población es el grupo completo y la muestra es una parte de ese grupo. No son el mismo conjunto.",
};

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
    questions: found.questions.map((q) => ({
      ...q,
      explanation: REASONS[q.question],
      sourceClassLabel: `Lección de muestra · ${found.label}`,
    })),
  };
}

/** Questions that test the sample lesson. Unknown subjects get no generic study-habit quiz. */
export function buildDemoSubjectQuiz(subject: string): RescueQuizItem[] {
  return demoLessonForSubject(subject)?.questions ?? [];
}
