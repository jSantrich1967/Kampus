import { z } from "zod";

import { demoExamDueDatesSameMonth } from "@/lib/calendar/local-iso-date";
import { examAttemptSchema, examSchema, type Exam, type ExamAttempt, type ExamFeedback } from "@/lib/schemas/exams";

const EXAMS_KEY = "kampus.exams.v1";
const ATTEMPTS_KEY = "kampus.examAttempts.v1";

const examsArraySchema = z.array(examSchema);
const attemptsArraySchema = z.array(examAttemptSchema);

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function seedDemoExamsIfEmpty(subjectHint?: string) {
  if (typeof window === "undefined") return;
  const existing = loadExams();
  if (existing.length > 0) return;

  const subject = (subjectHint && subjectHint.trim()) || "Econometría";
  const { due1, due2 } = demoExamDueDatesSameMonth();
  const demo: Exam[] = [
    {
      id: uid("exam"),
      subject,
      title: "Parcial 1 (demo)",
      description: "Responde con claridad y muestra pasos cuando aplique.",
      status: "open",
      dueDate: due1,
      questions: [
        { id: "q1", prompt: "Define heterocedasticidad y explica por qué importa." },
        { id: "q2", prompt: "Describe un test para detectarla y cómo interpretar el resultado." },
      ],
      createdAt: nowIso(),
    },
    {
      id: uid("exam"),
      subject,
      title: "Quiz corto de práctica (demo)",
      description: "Pensado para 12–18 minutos.",
      status: "open",
      dueDate: due2,
      questions: [{ id: "q1", prompt: "Explica la intuición detrás de MCO y menciona un supuesto clave." }],
      createdAt: nowIso(),
    },
  ];

  writeJson(EXAMS_KEY, demo);
}

export function loadExams(): Exam[] {
  const json = readJson(EXAMS_KEY);
  const parsed = examsArraySchema.safeParse(json);
  return parsed.success ? parsed.data : [];
}

export function saveExams(exams: Exam[]) {
  writeJson(EXAMS_KEY, exams);
}

export function updateExamDueDate(examId: string, dueDate: string) {
  const next = loadExams().map((e) => (e.id === examId ? { ...e, dueDate } : e));
  saveExams(next);
}

export function loadAttempts(): ExamAttempt[] {
  const json = readJson(ATTEMPTS_KEY);
  const parsed = attemptsArraySchema.safeParse(json);
  return parsed.success ? parsed.data : [];
}

export function saveAttempts(attempts: ExamAttempt[]) {
  writeJson(ATTEMPTS_KEY, attempts);
}

export function getExamById(examId: string): Exam | null {
  return loadExams().find((e) => e.id === examId) ?? null;
}

export function listAttemptsForExam(examId: string, studentLabel: string): ExamAttempt[] {
  return loadAttempts()
    .filter((a) => a.examId === examId && a.studentLabel === studentLabel)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function createAttempt(params: {
  examId: string;
  studentLabel: string;
  answers: Record<string, string>;
}): ExamAttempt {
  const attempt: ExamAttempt = {
    id: uid("attempt"),
    examId: params.examId,
    studentLabel: params.studentLabel,
    answers: params.answers,
    status: "submitted",
    submittedAt: nowIso(),
  };
  const next = [attempt, ...loadAttempts()];
  saveAttempts(next);
  return attempt;
}

export function gradeAttempt(attemptId: string, feedback: ExamFeedback): ExamAttempt | null {
  const all = loadAttempts();
  const idx = all.findIndex((a) => a.id === attemptId);
  if (idx === -1) return null;
  const updated: ExamAttempt = { ...all[idx], status: "graded", feedback };
  const next = [...all];
  next[idx] = updated;
  saveAttempts(next);
  return updated;
}

