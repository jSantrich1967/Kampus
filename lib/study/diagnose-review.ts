export type DiagnoseReviewItem = {
  index: number;
  topic: string;
  selected: string | null;
  key: string | null;
  matched: boolean;
};

type Question = {
  topic: string;
  options: string[];
  answerIndex: number;
};

/**
 * Compares each chosen option with the stored key.
 * A mismatch is this item only; it is not by itself a proof the student was wrong.
 */
export function reviewDiagnosis(questions: Question[], answers: Array<number | null>): DiagnoseReviewItem[] {
  return questions.map((question, index) => {
    const selectedIndex = answers[index];
    const selected =
      typeof selectedIndex === "number" ? (question.options[selectedIndex] ?? null) : null;
    const key = question.options[question.answerIndex] ?? null;
    return {
      index,
      topic: question.topic,
      selected,
      key,
      matched: selectedIndex === question.answerIndex,
    };
  });
}

export function scoreDiagnosis(items: DiagnoseReviewItem[], excluded: ReadonlySet<number> = new Set()) {
  const counted = items.filter((item) => !excluded.has(item.index));
  return {
    correct: counted.filter((item) => item.matched).length,
    total: counted.length,
  };
}
