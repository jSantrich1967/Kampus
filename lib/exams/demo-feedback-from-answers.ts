import type { Exam, ExamFeedback } from "@/lib/schemas/exams";

/** Respuestas demasiado cortas o “relleno” para el demo (no es corrección real de contenido). */
function looksLikeNonAnswer(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length < 12) return true;
  const junk =
    /^(no\s*s[eé]|no\s+s[eé]|mal|nada|idk|xd+|x+|\.{3,}|asdf|test|lorem|abc+)$/i.test(t) ||
    /^(.)\1{8,}$/i.test(t);
  return junk;
}

function avgAnswerLength(exam: Exam, answers: Record<string, string>): number {
  const lens = exam.questions.map((q) => (answers[q.id] ?? "").trim().length);
  if (lens.length === 0) return 0;
  return lens.reduce((a, b) => a + b, 0) / lens.length;
}

/**
 * Retro demo basada en heurísticas (longitud, patrones vacíos). No lee el temario ni sustituye a un docente.
 * Sirve para que “contestar mal” o en frío se note en la nota y en el texto.
 */
export function buildDemoGradingFeedback(exam: Exam, answers: Record<string, string>): ExamFeedback {
  const now = new Date().toISOString();
  const perQ = exam.questions.map((q) => ({
    id: q.id,
    text: (answers[q.id] ?? "").trim(),
  }));

  let weak = 0;
  let bad = 0;
  for (const { text } of perQ) {
    if (looksLikeNonAnswer(text)) bad += 1;
    else if (text.length < 80) weak += 1;
  }

  const avg = avgAnswerLength(exam, answers);

  if (bad === perQ.length) {
    return {
      score: 28,
      summary:
        "Con lo que enviaste no se puede verificar que domines el tema: respuestas muy cortas, genéricas o de relleno. Vuelve a leer el enunciado y desarrolla cada pregunta con tus propias palabras y ejemplos.",
      strengths: [],
      improvements: [
        "Evita respuestas de una sola frase o palabras sueltas; el profesor necesita ver tu razonamiento.",
        "Si no sabes algo, explica qué parte entiendes y qué te falta — eso ya cuenta como intento serio.",
      ],
      createdAt: now,
    };
  }

  if (bad >= 1 || avg < 45) {
    const score = Math.max(32, Math.min(52, 40 - bad * 8 + Math.floor(avg / 5)));
    return {
      score,
      summary:
        "Hay partes que se notan apresuradas o demasiado breves frente a lo que pide la pregunta. Para aprobar hace falta argumentar con más detalle, no solo tocar el tema de pasada.",
      strengths:
        weak + bad < perQ.length
          ? ["Al menos una respuesta va en la dirección correcta — apóyate en eso y extiende el resto igual de claro."]
          : [],
      improvements: [
        "Amplía cada respuesta: definiciones, pasos o consecuencias concretas según lo que pregunte el ítem.",
        "Revisa si contestaste realmente lo pedido (no solo una idea cercana).",
      ],
      createdAt: now,
    };
  }

  if (weak >= Math.ceil(perQ.length / 2) || avg < 120) {
    return {
      score: Math.max(55, Math.min(68, 58 + Math.floor(avg / 30))),
      summary:
        "Se entiende la línea general, pero varias respuestas quedan cortas o poco precisas para demostrar dominio. Con un poco más de profundidad subiría la calificación.",
      strengths: ["Ordenas ideas con claridad en lo que sí desarrollas."],
      improvements: [
        "Añade definiciones formales o pasos intermedios donde el enunciado lo pida.",
        "Conecta cada párrafo con la pregunta concreta (evita respuestas “globales” que no cerraban el círculo).",
      ],
      createdAt: now,
    };
  }

  return {
    score: Math.min(88, 72 + Math.min(12, Math.floor((avg - 120) / 25))),
    summary:
      "Buen entendimiento general. Falta precisión en una definición y más pasos en el razonamiento para redondear al nivel de examen.",
    strengths: ["Explicas la intuición con claridad en varios puntos.", "Conectas el concepto con ideas o casos que mencionas."],
    improvements: ["Añade una definición formal breve donde aplique.", "Muestra al menos un paso intermedio explícito en los argumentos más largos."],
    createdAt: now,
  };
}
