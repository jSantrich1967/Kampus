import { z } from "zod";

import { demoExamDueDatesSameMonth, localIsoDate } from "@/lib/calendar/local-iso-date";
import { examAttemptSchema, examSchema, type Exam, type ExamAttempt, type ExamFeedback } from "@/lib/schemas/exams";
import { loadProfile, saveProfile } from "@/lib/storage/kampus-storage";

const LEGACY_EXAMS_KEY = "kampus.exams.v1";
const LEGACY_ATTEMPTS_KEY = "kampus.examAttempts.v1";

let ownerId: string | null = null;

export function setExamStorageOwner(userId: string | null) {
  ownerId = userId;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

export function examsStorageKey(userId: string | null = ownerId): string {
  if (!userId) return "kampus.exams.v1.anonymous";
  return `kampus.exams.v1.${userId}`;
}

export function examAttemptsStorageKey(userId: string | null = ownerId): string {
  if (!userId) return "kampus.examAttempts.v1.anonymous";
  return `kampus.examAttempts.v1.${userId}`;
}

export function clearExamStorage(userId: string | null = ownerId) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(examsStorageKey(userId));
  window.localStorage.removeItem(examAttemptsStorageKey(userId));
}

export function discardLegacyExamStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_EXAMS_KEY);
  window.localStorage.removeItem(LEGACY_ATTEMPTS_KEY);
}

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

/** Marca del título que identifica los exámenes demo sembrados automáticamente. */
const DEMO_TITLE_MARK = "(demo)";

/** Preguntas demo por materia para que el examen de prueba tenga sentido. */
const DEMO_QUESTIONS_BY_SUBJECT: Record<string, string[]> = {
  "Cálculo": [
    "Explica qué es una derivada y qué información te da sobre una función.",
    "Describe los pasos para resolver una integral por sustitución con un ejemplo.",
  ],
  "Programación": [
    "Explica qué es la recursión y en qué casos conviene usarla.",
    "Describe la diferencia entre un bucle for y un bucle while con un ejemplo.",
  ],
  "Bases de datos": [
    "Explica qué es la normalización y por qué es importante.",
    "Describe qué es un JOIN con un ejemplo usando dos tablas.",
  ],
  "Estadística": [
    "Explica la diferencia entre media, mediana y moda, y cuándo usar cada una.",
    "Describe qué es un intervalo de confianza y cómo interpretarlo.",
  ],
};

const GENERIC_DEMO_QUESTIONS = [
  "Explica con tus palabras el concepto central del tema y por qué es importante.",
  "Describe un ejemplo o aplicación práctica y cómo interpretar el resultado.",
];

const DEMO_TITLES = ["Parcial 1 (demo)", "Quiz corto de práctica (demo)", "Parcial 2 (demo)"];

function demoQuestionsFor(subject: string): Array<{ id: string; prompt: string }> {
  const prompts = DEMO_QUESTIONS_BY_SUBJECT[subject] ?? GENERIC_DEMO_QUESTIONS;
  return prompts.slice(0, 2).map((prompt, i) => ({ id: `q${i + 1}`, prompt }));
}

function buildDemoExam(subject: string, dueDate: string, index: number): Exam {
  return {
    id: uid("exam"),
    subject,
    title: DEMO_TITLES[index % DEMO_TITLES.length],
    description: "Examen de prueba para explorar la app.",
    status: "open",
    dueDate,
    questions: demoQuestionsFor(subject),
    createdAt: nowIso(),
  };
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDaysIso(a: string, b: string): number {
  const ms = new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime();
  return Math.round(ms / 86400000);
}

/**
 * Hace que los exámenes demo reflejen los próximos exámenes del perfil
 * (misma materia y misma fecha). Así la tarjeta "Examen más cercano" y la
 * lista del calendario siempre muestran lo mismo.
 * Conserva los exámenes creados por el usuario.
 */
export function syncDemoExamsWithUpcoming(upcoming: Array<{ subject: string; date: string }>) {
  if (typeof window === "undefined") return;
  const existing = loadExams();
  const userExams = existing.filter((exam) => !exam.title.includes(DEMO_TITLE_MARK));
  const demo = upcoming.slice(0, 3).map((u, i) => buildDemoExam(u.subject, (u.date || "").slice(0, 10), i));
  writeJson(examsStorageKey(), [...userExams, ...demo]);
}

/**
 * Renueva la fecha de vencimiento de los demos ya vencidos: los datos
 * sembrados hace semanas seguirían mostrando "hace N días" para siempre.
 * Desplaza todas las fechas demo (y los próximos exámenes del perfil con la
 * misma materia) el mismo número de días, para que la tarjeta
 * "Examen más cercano" y el calendario sigan coincidiendo.
 */
export function refreshExpiredDemoExams() {
  if (typeof window === "undefined") return;
  const today = localIsoDate();
  const exams = loadExams();
  const demoDues = exams
    .filter((exam) => exam.title.includes(DEMO_TITLE_MARK) && (exam.dueDate ?? "").trim())
    .map((exam) => (exam.dueDate as string).trim());
  if (demoDues.length === 0) return;
  const earliest = [...demoDues].sort()[0];
  if (earliest >= today) return;
  const shift = diffDaysIso(today, earliest) + 1;
  const next = exams.map((exam) => {
    if (!exam.title.includes(DEMO_TITLE_MARK)) return exam;
    const due = (exam.dueDate ?? "").trim();
    if (!due) return exam;
    return { ...exam, dueDate: addDaysIso(due, shift) };
  });
  saveExams(next);
  try {
    const profile = loadProfile();
    const demoSubjects = new Set(next.filter((e) => e.title.includes(DEMO_TITLE_MARK)).map((e) => e.subject));
    const upcoming = (profile.upcomingExams ?? []).map((u) =>
      demoSubjects.has(u.subject) ? { ...u, date: addDaysIso(u.date.slice(0, 10), shift) } : u,
    );
    saveProfile({ ...profile, upcomingExams: upcoming });
  } catch {
    // Si el perfil no se puede leer, los exámenes ya quedaron renovados.
  }
}

export function seedDemoExamsIfEmpty(subjectHint?: string) {
  if (typeof window === "undefined") return;
  const existing = loadExams();
  if (existing.length === 0) {
    const subject = (subjectHint && subjectHint.trim()) || "Econometría";
    const { due1, due2 } = demoExamDueDatesSameMonth();
    writeJson(examsStorageKey(), [buildDemoExam(subject, due1, 0), buildDemoExam(subject, due2, 1)]);
  }

  // Los demos sembrados en visitas viejas pueden haber vencido: renuévalos
  // para que ningún demo muestre fecha pasada.
  refreshExpiredDemoExams();
}

export function loadExams(userId?: string | null): Exam[] {
  const json = readJson(examsStorageKey(resolveOwner(userId)));
  const parsed = examsArraySchema.safeParse(json);
  return parsed.success ? parsed.data : [];
}

export function saveExams(exams: Exam[], userId?: string | null) {
  writeJson(examsStorageKey(resolveOwner(userId)), exams);
}

export function updateExamDueDate(examId: string, dueDate: string, userId?: string | null) {
  const next = loadExams(userId).map((e) => (e.id === examId ? { ...e, dueDate } : e));
  saveExams(next, userId);
}

export function loadAttempts(userId?: string | null): ExamAttempt[] {
  const json = readJson(examAttemptsStorageKey(resolveOwner(userId)));
  const parsed = attemptsArraySchema.safeParse(json);
  return parsed.success ? parsed.data : [];
}

export function saveAttempts(attempts: ExamAttempt[], userId?: string | null) {
  writeJson(examAttemptsStorageKey(resolveOwner(userId)), attempts);
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

