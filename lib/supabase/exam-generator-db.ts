import type { SupabaseClient } from "@supabase/supabase-js";

import type { GeneratedExam } from "@/lib/schemas/exam-generator";

export interface SavedGeneratedExam {
  id: string;
  subject: string;
  topic: string;
  questionCount: number;
  questionTypes: string;
  difficulty: string;
  exam: GeneratedExam;
  createdAt: string;
}

interface ExamRow {
  id: string;
  subject: string;
  topic: string;
  question_count: number;
  question_types: string;
  difficulty: string;
  exam_json: unknown;
  created_at: string;
}

function toSaved(row: ExamRow): SavedGeneratedExam {
  return {
    id: row.id,
    subject: row.subject,
    topic: row.topic,
    questionCount: row.question_count,
    questionTypes: row.question_types,
    difficulty: row.difficulty,
    exam: row.exam_json as GeneratedExam,
    createdAt: row.created_at,
  };
}

export async function saveGeneratedExam(
  client: SupabaseClient,
  userId: string,
  input: {
    subject: string;
    topic: string;
    questionCount: number;
    questionTypes: string;
    difficulty: string;
    exam: GeneratedExam;
  },
): Promise<SavedGeneratedExam> {
  const { data, error } = await client
    .from("teacher_generated_exams")
    .insert({
      teacher_id: userId,
      subject: input.subject,
      topic: input.topic,
      question_count: input.questionCount,
      question_types: input.questionTypes,
      difficulty: input.difficulty,
      exam_json: input.exam,
    })
    .select("id, subject, topic, question_count, question_types, difficulty, exam_json, created_at")
    .single();
  if (error) throw error;
  return toSaved(data as ExamRow);
}

export async function listGeneratedExams(
  client: SupabaseClient,
): Promise<SavedGeneratedExam[]> {
  const { data, error } = await client
    .from("teacher_generated_exams")
    .select("id, subject, topic, question_count, question_types, difficulty, exam_json, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return ((data ?? []) as ExamRow[]).map(toSaved);
}

export async function deleteGeneratedExam(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client.from("teacher_generated_exams").delete().eq("id", id);
  if (error) throw error;
}
