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
  const topic = input.subjectHint.trim() || "this topic";
  const snippet = input.seedText.trim().slice(0, 280) || `Uploaded source: ${input.sourceLabel}`;

  const keyIdeas = [
    `Define the core objective of ${topic} in one sentence.`,
    `Separate assumptions vs. evidence in ${input.sourceLabel}.`,
    `Identify the 2–3 mechanisms that usually appear on exams for ${topic}.`,
    `Translate jargon into a diagram you can redraw from memory.`,
  ];

  const probableExamQuestions = [
    `Explain ${topic} from first principles using an example from class.`,
    `Compare/contrast two approaches discussed in ${input.sourceLabel}.`,
    `Solve a standard problem and justify each step (no skipped algebra).`,
    `What are the failure modes / edge cases instructors love to test?`,
  ];

  const flashcards: RescueFlashcard[] = [
    { front: `What is the main idea of ${topic}?`, back: `A compact claim supported by definitions + one example.` },
    { front: "What should you memorize vs. derive?", back: "Memorize definitions + canonical steps; derive variations." },
    { front: "What is a common trap on exams?", back: "Sign errors, unit mismatches, unstated assumptions." },
    { front: `One-line intuition for ${topic}`, back: "Explain it like you are teaching a tired friend in 60 seconds." },
  ];

  const quiz: RescueQuizItem[] = [
    {
      question: `Which best describes your first move when reviewing ${topic}?`,
      options: [
        "Skim headings only",
        "Rebuild a mini-outline from memory",
        "Re-read everything slowly",
        "Copy slides verbatim",
      ],
      answerIndex: 1,
    },
    {
      question: "What is the highest-leverage practice before an exam?",
      options: [
        "Passive highlighting",
        "Timed mixed retrieval",
        "Rewatching lectures at 2x",
        "Organizing folders",
      ],
      answerIndex: 1,
    },
  ];

  const studyChecklist = [
    `Skim ${input.sourceLabel} for structure (6 minutes).`,
    `Rewrite the outline without looking (10 minutes).`,
    `Do 12 flashcards + 6 quiz items (15 minutes).`,
    `Explain ${topic} aloud once (4 minutes).`,
    `List 5 “exam-style” prompts you still fear (5 minutes).`,
  ];

  const mindMapOutline = [
    `${topic}`,
    `  Definitions`,
    `  Mechanisms`,
    `  Examples`,
    `  Edge cases`,
    `  Exam patterns`,
    `  Your weak spots (from notes)`,
  ].join("\n");

  return {
    subjectLine: `${topic} · ${input.sourceLabel}`,
    quickSummary: `You are catching up on ${topic}. Start with structure, then retrieval: rebuild the outline, then drill 10 questions. Source anchor: ${snippet.slice(0, 120)}…`,
    fullSummary: `This rescue pack treats "${topic}" as the spine. From ${input.sourceLabel}, prioritize definitions, canonical examples, and instructor-repeated phrases. Your notes imply focus areas in: ${snippet.slice(0, 200)}… Next, connect each idea to a practice question so it becomes exam-usable, not just “understood.”`,
    deepExplanation: `Deep layer: explain ${topic} as a chain of causes → definitions → implications. When stuck, ask: what quantity is conserved? what boundary conditions matter? what approximation is valid? Use ${input.sourceLabel} as evidence, not as a script to memorize.`,
    keyIdeas: keyIdeas.map((k, i) => `${pick(["•", "→", "★"], seed, i)} ${k}`),
    probableExamQuestions: probableExamQuestions.map((q, i) => `${i + 1}. ${q}`),
    flashcards,
    quiz,
    studyChecklist,
    mindMapOutline,
    easyExplanation: `Easy version: ${topic} is basically “how things connect.” Imagine a subway map: each station is a concept; lines are relationships. Your job is to travel the map without GPS—${input.sourceLabel} is the map sketch.`,
    technicalExplanation: `Technical version: formalize ${topic} using precise definitions, invariants, and worked boundaries. Validate each step against ${input.sourceLabel} and stress-test with edge cases instructors like.`,
    questionsForClass: [
      `If ${topic} fails in a real system, what is the first diagnostic question you should ask?`,
      `Which assumption in ${input.sourceLabel} is the shakiest—and how would you test it?`,
      `What is the fastest way to check if I actually understood vs. recognized?`,
    ],
    suggestedNextResource: pick(
      [
        "A 20-question mixed practice set (timed)",
        "A peer explanation thread in your subject community",
        "A 12-minute “explain from zero” voice memo to yourself",
        "A professor-style mock exam (Pass Mode → practice)",
      ],
      seed,
      2,
    ),
  };
}
