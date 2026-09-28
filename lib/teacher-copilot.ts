/**
 * Teacher Copilot — deterministic helpers until LLM + LMS integration exists.
 */

export type RubricRow = { criterion: string; points: number; guidance: string };

export function buildRubricFromPrompt(prompt: string): RubricRow[] {
  const topic = prompt.trim().slice(0, 80) || "esta tarea";
  return [
    {
      criterion: `Concepto central correcto (${topic})`,
      points: 40,
      guidance: "Puntaje completo solo si el razonamiento está explícito.",
    },
    {
      criterion: "Estructura y claridad",
      points: 25,
      guidance: "Introducción, desarrollo y cierre; cada párrafo tiene una función.",
    },
    {
      criterion: "Uso de evidencia o pasos",
      points: 20,
      guidance: "Cada afirmación se apoya en un dato, un cálculo o una cita.",
    },
    {
      criterion: "Forma y notación",
      points: 15,
      guidance: "Unidades, símbolos y coherencia con lo que pide el curso.",
    },
  ];
}

export function suggestScore(answer: string): { score: number; rationale: string } {
  const len = answer.trim().length;
  if (len < 40) return { score: 58, rationale: "La respuesta es muy corta: faltan justificación o ejemplos." };
  if (len < 160) return { score: 74, rationale: "Buen comienzo; precisa las definiciones y añade un caso límite." };
  return { score: 86, rationale: "Buen desarrollo; revisa la notación y deja las suposiciones por escrito." };
}

export function suggestFeedback(answer: string): string {
  const { score, rationale } = suggestScore(answer);
  return `Calificación sugerida (demo): ${score}/100. ${rationale}\n\nSiguiente paso: pide una versión con “por lo tanto” explícito en cada transición clave.`;
}

export function detectCommonIssues(answer: string): string[] {
  const text = answer.toLowerCase();
  const issuesEs = [
    !text.includes("porque") && !text.includes("por lo tanto") ? "Faltan conectores causales explícitos" : null,
    text.includes("obviamente") || text.includes("claramente") ? "Afirmaciones fuertes sin demostración" : null,
    answer.length < 80 ? "Muy poca evidencia / pasos mostrados" : null,
  ].filter(Boolean) as string[];

  return issuesEs;
}
