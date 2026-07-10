import type { RescueQuizItem } from "@/lib/class-rescue";
import { combineNotebookExtractedTextForPack } from "@/lib/notebooks/document-tags";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { postRescuePack } from "@/lib/rescue/post-rescue-pack";
import type { UserProfile } from "@/lib/schemas/profile";
import {
  buildPressureQuizPackInput,
  describePressureQuizSources,
  groupDocsByClass,
  selectDocsForPressureQuiz,
  tagQuizWithSource,
} from "@/lib/study/pressure-quiz";

const MAX_QUESTIONS = 12;
const QUESTIONS_PER_CLASS = 3;
const MAX_CLASS_GROUPS = 5;

function hasUsableExtractedText(combined: string): boolean {
  return combined.replace(/\(sin texto extraído[^)]*\)/g, "").trim().length > 80;
}

async function fetchQuizFromText(
  subject: string,
  extractedFileText: string,
  sourceLabel: string,
  fallbackSeed: string,
  uploadedFileCount: number,
): Promise<{ questions: RescueQuizItem[]; packWarning: string | null }> {
  const { pack, packError } = await postRescuePack(
    {
      subjectHint: subject,
      sourceLabel,
      sourceKind: "notes",
      extractedFileText,
      notes: "",
      link: "",
      uploadedFileCount,
      seedText: fallbackSeed,
      packMode: "lite",
    },
    {
      seedText: fallbackSeed,
      subjectHint: subject,
      sourceLabel,
      sourceKind: "notes",
    },
  );
  return { questions: pack.quiz, packWarning: packError };
}

export async function generatePressureQuizQuestions(
  subject: string,
  docs: NotebookDocumentRow[],
  profile: UserProfile,
): Promise<{
  questions: RescueQuizItem[];
  sourceLabel: string;
  isDemoSource: boolean;
  packWarning: string | null;
}> {
  const selected = selectDocsForPressureQuiz(docs);
  const packInput = buildPressureQuizPackInput(subject, selected, profile);

  if (packInput.isDemoSource) {
    const { questions, packWarning } = await fetchQuizFromText(
      subject,
      packInput.extractedFileText,
      packInput.sourceLabel,
      packInput.fallbackSeed,
      0,
    );
    return {
      questions: questions.slice(0, MAX_QUESTIONS).map((q) => ({
        ...q,
        sourceClassLabel: "Perfil demo (sin apuntes)",
        sourceClassDate: null,
      })),
      sourceLabel: packInput.sourceLabel,
      isDemoSource: true,
      packWarning,
    };
  }

  const groups = groupDocsByClass(selected);
  let packWarning: string | null = null;
  const merged: RescueQuizItem[] = [];

  if (groups.length <= 1) {
    const group = groups[0];
    const { questions, packWarning: warn } = await fetchQuizFromText(
      subject,
      packInput.extractedFileText,
      packInput.sourceLabel,
      packInput.fallbackSeed,
      selected.length,
    );
    if (warn) packWarning = warn;
    const label = group?.classLabel ?? describePressureQuizSources(selected);
    const tagged = questions.slice(0, MAX_QUESTIONS).map((q) => ({
      ...q,
      sourceClassLabel: q.sourceClassLabel ?? label,
      sourceClassDate: q.sourceClassDate ?? group?.classDate ?? null,
      sourceFilename: q.sourceFilename ?? group?.docs[0]?.filename,
      sourceDocumentId: q.sourceDocumentId ?? group?.docs[0]?.id,
    }));
    return {
      questions: tagged,
      sourceLabel: packInput.sourceLabel,
      isDemoSource: false,
      packWarning,
    };
  }

  for (const group of groups.slice(0, MAX_CLASS_GROUPS)) {
    const combined = combineNotebookExtractedTextForPack(group.docs);
    if (!hasUsableExtractedText(combined)) continue;

    const groupLabel = `${group.classLabel} (${group.docs.length} apunte${group.docs.length === 1 ? "" : "s"})`;
    const { questions, packWarning: warn } = await fetchQuizFromText(
      subject,
      combined,
      groupLabel,
      combined,
      group.docs.length,
    );
    if (warn && !packWarning) packWarning = warn;
    merged.push(...tagQuizWithSource(questions, group, QUESTIONS_PER_CLASS));
    if (merged.length >= MAX_QUESTIONS) break;
  }

  if (merged.length === 0) {
    const { questions, packWarning: warn } = await fetchQuizFromText(
      subject,
      packInput.extractedFileText,
      packInput.sourceLabel,
      packInput.fallbackSeed,
      selected.length,
    );
    return {
      questions: questions.slice(0, MAX_QUESTIONS),
      sourceLabel: packInput.sourceLabel,
      isDemoSource: false,
      packWarning: warn,
    };
  }

  return {
    questions: merged.slice(0, MAX_QUESTIONS),
    sourceLabel: describePressureQuizSources(selected),
    isDemoSource: false,
    packWarning,
  };
}
