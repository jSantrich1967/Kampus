/**
 * Teacher Copilot — deterministic helpers until LLM + LMS integration exists.
 */

export type RubricRow = { criterion: string; points: number; guidance: string };

export function buildRubricFromPrompt(prompt: string): RubricRow[] {
  const topic = prompt.trim().slice(0, 80) || "this assignment";
  return [
    { criterion: `Correctness of core concept (${topic})`, points: 40, guidance: "Full credit only if reasoning is explicit." },
    { criterion: "Structure & clarity", points: 25, guidance: "Intro → body → conclusion; each paragraph has a job." },
    { criterion: "Use of evidence / steps", points: 20, guidance: "Each claim ties to a fact, derivation, or citation." },
    { criterion: "Mechanics & notation", points: 15, guidance: "Units, symbols, and consistency with course conventions." },
  ];
}

export function suggestScore(answer: string): { score: number; rationale: string } {
  const len = answer.trim().length;
  if (len < 40) return { score: 58, rationale: "Answer is very short — likely missing justification or examples." };
  if (len < 160) return { score: 74, rationale: "Solid start; tighten definitions and add one worked boundary case." };
  return { score: 86, rationale: "Strong depth; verify notation and explicitly state assumptions." };
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
