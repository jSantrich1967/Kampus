export type TopicScore = { topic: string; correct: number; total: number };

const FALSE_MISS = /fallaste|punto más débil|punto mas debil|tema débil|tema debil/i;

export function hasMissedTopic(scores: readonly TopicScore[]): boolean {
  return scores.some((score) => score.total > 0 && score.correct < score.total);
}

/**
 * A perfect diagnosis cannot be described as a miss.
 * "Fallaste 0/1" is the case the demo showed after 6/6.
 */
export function honestPlanText(text: string, scores: readonly TopicScore[]): string {
  if (!FALSE_MISS.test(text)) return text;
  if (!hasMissedTopic(scores)) {
    return "El diagnóstico salió completo. Este bloque mantiene lo que ya respondiste bien.";
  }
  return text.replace(/fallaste\s+0\s*\/\s*\d+[^.,;]*/gi, "este tema salió bien");
}
