import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { demoExamDueDatesSameMonth } from "@/lib/calendar/local-iso-date";
import { examFeedbackSchema, examQuestionSchema, type Exam, type ExamAttempt, type ExamFeedback } from "@/lib/schemas/exams";
import {
  classCancellationListSchema,
  classScheduleListSchema,
  type ClassCancellation,
  type ClassScheduleRow,
} from "@/lib/schemas/class-schedule";
import type { StudentWork } from "@/lib/schemas/student-work";
import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";
import type { PresentationState } from "@/lib/storage/presentation-storage";
import { ensurePresentationTeamCode, presentationStateFromRemoteJson } from "@/lib/storage/presentation-storage";

type UserExamRow = {
  id: string;
  user_id: string;
  subject: string;
  title: string;
  description: string;
  status: Exam["status"];
  due_date: string | null;
  questions: unknown;
  created_at: string;
};

type AttemptRow = {
  id: string;
  exam_id: string;
  student_label: string;
  answers: unknown;
  status: ExamAttempt["status"];
  feedback: unknown;
  submitted_at: string;
};

type WorkRow = {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  notes: string;
  created_at: string;
};

type PresentationDeckRow = {
  id: string;
  user_id: string;
  deck_title: string;
  presentation_due_date: string | null;
  state: unknown;
  updated_at: string;
};

export type PresentationDeckSummary = {
  id: string;
  deckTitle: string;
  presentationDueDate?: string;
  updatedAt: string;
};

export type PresentationDeckRecord = {
  id: string;
  userId: string;
  deckTitle: string;
  presentationDueDate?: string;
  state: PresentationState;
  updatedAt: string;
};

function mapPresentationDeckRow(row: PresentationDeckRow): PresentationDeckRecord {
  const fromJson = presentationStateFromRemoteJson(row.state);
  const deckTitle = (row.deck_title ?? "").trim() || fromJson.deckTitle;
  const presentationDueDate =
    row.presentation_due_date?.trim() || fromJson.presentationDueDate?.trim() || undefined;
  const state = ensurePresentationTeamCode({
    ...fromJson,
    deckTitle,
    presentationDueDate,
  });
  return {
    id: row.id,
    userId: row.user_id,
    deckTitle,
    presentationDueDate,
    state,
    updatedAt: row.updated_at,
  };
}

/** Próximas fechas primero; sin fecha al final; mismo día por updatedAt. */
export function sortPresentationDeckSummaries(list: PresentationDeckSummary[]): PresentationDeckSummary[] {
  return [...list].sort((a, b) => {
    const da = a.presentationDueDate?.trim() ?? "";
    const db = b.presentationDueDate?.trim() ?? "";
    if (!da && !db) return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    if (!da) return 1;
    if (!db) return -1;
    if (da !== db) return da.localeCompare(db);
    return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
  });
}

type ClassScheduleDbRow = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  subject: string;
  location: string | null;
  professor_name: string | null;
};

type ClassCancellationDbRow = {
  id: string;
  schedule_id: string;
  class_date: string;
  reason: string | null;
};

function mapExamRow(row: UserExamRow): Exam {
  const questions = z.array(examQuestionSchema).parse(row.questions);
  return {
    id: row.id,
    subject: row.subject,
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    dueDate: row.due_date ?? undefined,
    questions,
    createdAt: row.created_at,
  };
}

function mapAttemptRow(row: AttemptRow): ExamAttempt {
  const answers = row.answers as Record<string, string>;
  let feedback: ExamFeedback | undefined;
  if (row.feedback != null) {
    feedback = examFeedbackSchema.parse(row.feedback);
  }
  return {
    id: row.id,
    examId: row.exam_id,
    studentLabel: row.student_label,
    answers,
    status: row.status,
    submittedAt: row.submitted_at,
    feedback,
  };
}

function mapWorkRow(row: WorkRow): StudentWork {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    dueDate: row.due_date,
    notes: row.notes ?? "",
    createdAt: row.created_at,
  };
}

export async function fetchUserExams(client: SupabaseClient, userId: string): Promise<Exam[]> {
  const { data, error } = await client
    .from("user_exams")
    .select("id,user_id,subject,title,description,status,due_date,questions,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(formatAgendaCloudError(error.message));
  const rows = (data ?? []) as UserExamRow[];
  return rows.map(mapExamRow);
}

export async function fetchExamById(client: SupabaseClient, userId: string, examId: string): Promise<Exam | null> {
  const { data, error } = await client
    .from("user_exams")
    .select("id,user_id,subject,title,description,status,due_date,questions,created_at")
    .eq("user_id", userId)
    .eq("id", examId)
    .maybeSingle();
  if (error) throw new Error(formatAgendaCloudError(error.message));
  if (!data) return null;
  return mapExamRow(data as UserExamRow);
}

/** Si el usuario no tiene exámenes, inserta el mismo par demo que el seed local. */
export async function ensureDemoExamsRemote(client: SupabaseClient, userId: string, subjectHint: string): Promise<void> {
  const { count, error: cErr } = await client
    .from("user_exams")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (cErr) throw new Error(formatAgendaCloudError(cErr.message));
  if ((count ?? 0) > 0) return;

  const subject = (subjectHint && subjectHint.trim()) || "Econometría";
  const { due1, due2 } = demoExamDueDatesSameMonth();
  const { error: iErr } = await client.from("user_exams").insert([
    {
      user_id: userId,
      subject,
      title: "Parcial 1 (demo)",
      description: "Responde con claridad y muestra pasos cuando aplique.",
      status: "open",
      due_date: due1,
      questions: [
        { id: "q1", prompt: "Define heterocedasticidad y explica por qué importa." },
        { id: "q2", prompt: "Describe un test para detectarla y cómo interpretar el resultado." },
      ],
    },
    {
      user_id: userId,
      subject,
      title: "Quiz corto de práctica (demo)",
      description: "Pensado para 12–18 minutos.",
      status: "open",
      due_date: due2,
      questions: [{ id: "q1", prompt: "Explica la intuición detrás de MCO y menciona un supuesto clave." }],
    },
  ]);
  if (iErr) throw new Error(formatAgendaCloudError(iErr.message));
}

export async function fetchAttemptsForExam(
  client: SupabaseClient,
  userId: string,
  examId: string,
  studentLabel: string,
): Promise<ExamAttempt[]> {
  const { data, error } = await client
    .from("user_exam_attempts")
    .select("id,exam_id,student_label,answers,status,feedback,submitted_at")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("student_label", studentLabel)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(formatAgendaCloudError(error.message));
  return ((data ?? []) as AttemptRow[]).map(mapAttemptRow);
}

export async function insertAttemptRemote(
  client: SupabaseClient,
  userId: string,
  params: { examId: string; studentLabel: string; answers: Record<string, string> },
): Promise<ExamAttempt> {
  const { data, error } = await client
    .from("user_exam_attempts")
    .insert({
      user_id: userId,
      exam_id: params.examId,
      student_label: params.studentLabel,
      answers: params.answers,
      status: "submitted",
    })
    .select("id,exam_id,student_label,answers,status,feedback,submitted_at")
    .single();
  if (error) throw new Error(formatAgendaCloudError(error.message));
  return mapAttemptRow(data as AttemptRow);
}

export async function updateAttemptFeedbackRemote(
  client: SupabaseClient,
  userId: string,
  attemptId: string,
  feedback: ExamFeedback,
): Promise<void> {
  const { error } = await client
    .from("user_exam_attempts")
    .update({ status: "graded", feedback })
    .eq("id", attemptId)
    .eq("user_id", userId);
  if (error) throw new Error(formatAgendaCloudError(error.message));
}

export async function fetchStudentWorksRemote(client: SupabaseClient, userId: string): Promise<StudentWork[]> {
  const { data, error } = await client
    .from("student_works")
    .select("id,title,subject,due_date,notes,created_at")
    .eq("user_id", userId)
    .order("due_date", { ascending: true });
  if (error) throw new Error(formatAgendaCloudError(error.message));
  return ((data ?? []) as WorkRow[]).map(mapWorkRow);
}

export async function insertStudentWorkRemote(
  client: SupabaseClient,
  userId: string,
  input: Omit<StudentWork, "id" | "createdAt">,
): Promise<StudentWork> {
  const { data, error } = await client
    .from("student_works")
    .insert({
      user_id: userId,
      title: input.title,
      subject: input.subject,
      due_date: input.dueDate,
      notes: input.notes,
    })
    .select("id,title,subject,due_date,notes,created_at")
    .single();
  if (error) throw new Error(formatAgendaCloudError(error.message));
  return mapWorkRow(data as WorkRow);
}

export async function deleteStudentWorkRemote(client: SupabaseClient, userId: string, workId: string): Promise<void> {
  const { error } = await client.from("student_works").delete().eq("id", workId).eq("user_id", userId);
  if (error) throw new Error(formatAgendaCloudError(error.message));
}

export async function fetchClassScheduleRemote(client: SupabaseClient, userId: string): Promise<ClassScheduleRow[]> {
  const { data, error } = await client
    .from("user_class_schedule")
    .select("id,weekday,start_time,end_time,subject,location,professor_name")
    .eq("user_id", userId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw new Error(formatAgendaCloudError(error.message));
  const rows = ((data ?? []) as ClassScheduleDbRow[]).map((r) => ({
    id: r.id,
    weekday: r.weekday,
    startTime: (r.start_time ?? "").slice(0, 5),
    endTime: (r.end_time ?? "").slice(0, 5),
    subject: r.subject ?? "Clase",
    location: r.location ?? "",
    professorName: r.professor_name ?? "",
  }));
  return classScheduleListSchema.parse(rows);
}

export async function insertClassScheduleRemote(
  client: SupabaseClient,
  userId: string,
  input: Omit<ClassScheduleRow, "id">,
): Promise<ClassScheduleRow> {
  const { data, error } = await client
    .from("user_class_schedule")
    .insert({
      user_id: userId,
      weekday: input.weekday,
      start_time: input.startTime,
      end_time: input.endTime,
      subject: input.subject,
      location: input.location,
      professor_name: input.professorName,
    })
    .select("id,weekday,start_time,end_time,subject,location,professor_name")
    .single();
  if (error) throw new Error(formatAgendaCloudError(error.message));
  const row = data as ClassScheduleDbRow;
  return classScheduleListSchema.element.parse({
    id: row.id,
    weekday: row.weekday,
    startTime: (row.start_time ?? "").slice(0, 5),
    endTime: (row.end_time ?? "").slice(0, 5),
    subject: row.subject ?? "",
    location: row.location ?? "",
    professorName: row.professor_name ?? "",
  });
}

export async function deleteClassScheduleRemote(client: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await client.from("user_class_schedule").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(formatAgendaCloudError(error.message));
}

export async function fetchClassCancellationsRemote(client: SupabaseClient, userId: string): Promise<ClassCancellation[]> {
  const { data, error } = await client
    .from("user_class_cancellations")
    .select("id,schedule_id,class_date,reason")
    .eq("user_id", userId)
    .order("class_date", { ascending: false })
    .limit(200);
  if (error) throw new Error(formatAgendaCloudError(error.message));
  const rows = ((data ?? []) as ClassCancellationDbRow[]).map((r) => ({
    id: r.id,
    scheduleId: r.schedule_id,
    classDate: r.class_date,
    reason: r.reason ?? "",
  }));
  return classCancellationListSchema.parse(rows);
}

export async function upsertClassCancellationRemote(
  client: SupabaseClient,
  userId: string,
  input: { scheduleId: string; classDate: string; reason: string },
): Promise<ClassCancellation> {
  const { data, error } = await client
    .from("user_class_cancellations")
    .upsert({
      user_id: userId,
      schedule_id: input.scheduleId,
      class_date: input.classDate,
      reason: input.reason,
    })
    .select("id,schedule_id,class_date,reason")
    .single();
  if (error) throw new Error(formatAgendaCloudError(error.message));
  const row = data as ClassCancellationDbRow;
  return classCancellationListSchema.element.parse({
    id: row.id,
    scheduleId: row.schedule_id,
    classDate: row.class_date,
    reason: row.reason ?? "",
  });
}

export async function deleteClassCancellationRemote(client: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await client.from("user_class_cancellations").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(formatAgendaCloudError(error.message));
}

export async function fetchPresentationDeckSummariesRemote(
  client: SupabaseClient,
  userId: string,
): Promise<PresentationDeckSummary[]> {
  const { data, error } = await client
    .from("user_presentation_decks")
    .select("id,deck_title,presentation_due_date,updated_at")
    .eq("user_id", userId)
    .order("presentation_due_date", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });
  if (error) throw new Error(formatAgendaCloudError(error.message));
  const rows = (data ?? []) as Pick<PresentationDeckRow, "id" | "deck_title" | "presentation_due_date" | "updated_at">[];
  return sortPresentationDeckSummaries(
    rows.map((r) => ({
      id: r.id,
      deckTitle: r.deck_title ?? "",
      presentationDueDate: r.presentation_due_date ?? undefined,
      updatedAt: r.updated_at,
    })),
  );
}

export async function fetchPresentationDeckByIdRemote(
  client: SupabaseClient,
  userId: string,
  deckId: string,
): Promise<PresentationDeckRecord> {
  const { data, error } = await client
    .from("user_presentation_decks")
    .select("id,user_id,deck_title,presentation_due_date,state,updated_at")
    .eq("user_id", userId)
    .eq("id", deckId)
    .single();
  if (error) throw new Error(formatAgendaCloudError(error.message));
  return mapPresentationDeckRow(data as PresentationDeckRow);
}

export async function insertPresentationDeckRemote(
  client: SupabaseClient,
  userId: string,
  state: PresentationState,
): Promise<PresentationDeckRecord> {
  const deckTitle = state.deckTitle.trim();
  const due = state.presentationDueDate?.trim() ? state.presentationDueDate : null;
  const { data, error } = await client
    .from("user_presentation_decks")
    .insert({
      user_id: userId,
      deck_title: deckTitle,
      presentation_due_date: due,
      state: state as unknown as Record<string, unknown>,
    })
    .select("id,user_id,deck_title,presentation_due_date,state,updated_at")
    .single();
  if (error) throw new Error(formatAgendaCloudError(error.message));
  return mapPresentationDeckRow(data as PresentationDeckRow);
}

export async function updatePresentationDeckRemote(
  client: SupabaseClient,
  userId: string,
  deckId: string,
  state: PresentationState,
): Promise<void> {
  const deckTitle = state.deckTitle.trim();
  const due = state.presentationDueDate?.trim() ? state.presentationDueDate : null;
  const { error } = await client
    .from("user_presentation_decks")
    .update({
      deck_title: deckTitle,
      presentation_due_date: due,
      state: state as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deckId)
    .eq("user_id", userId);
  if (error) throw new Error(formatAgendaCloudError(error.message));
}

export async function deletePresentationDeckRemote(
  client: SupabaseClient,
  userId: string,
  deckId: string,
): Promise<void> {
  const { error } = await client.from("user_presentation_decks").delete().eq("id", deckId).eq("user_id", userId);
  if (error) throw new Error(formatAgendaCloudError(error.message));
}
