import { z } from "zod";

import { studentWorkSchema, type StudentWork } from "@/lib/schemas/student-work";

/** Old builds used one box for every account. Never read it into a user. */
const LEGACY_KEY = "kampus.studentWorks.v1";

let ownerId: string | null = null;

export function setStudentWorkOwner(userId: string | null) {
  ownerId = userId;
}

export function studentWorkStorageKey(userId: string | null = ownerId): string {
  if (!userId) return "kampus.studentWorks.v1.anonymous";
  return `kampus.studentWorks.v1.${userId}`;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

const listSchema = z.array(studentWorkSchema);

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

function writeJson(key: string, rows: StudentWork[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}

function uid() {
  return `work_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function loadStudentWorks(userId?: string | null): StudentWork[] {
  const parsed = listSchema.safeParse(readJson(studentWorkStorageKey(resolveOwner(userId))));
  return parsed.success ? parsed.data : [];
}

export function saveStudentWorks(rows: StudentWork[], userId?: string | null) {
  writeJson(studentWorkStorageKey(resolveOwner(userId)), rows);
}

export function addStudentWork(
  input: Omit<StudentWork, "id" | "createdAt">,
  userId?: string | null,
): StudentWork {
  const row: StudentWork = {
    title: input.title,
    subject: input.subject,
    dueDate: input.dueDate,
    notes: input.notes,
    completedAt: input.completedAt,
    id: uid(),
    createdAt: new Date().toISOString(),
  };
  const next = [row, ...loadStudentWorks(userId)];
  saveStudentWorks(next, userId);
  return row;
}

export function setStudentWorkCompleted(id: string, completed: boolean, userId?: string | null) {
  const ts = completed ? new Date().toISOString() : undefined;
  const next = loadStudentWorks(userId).map((w) => (w.id === id ? { ...w, completedAt: ts } : w));
  saveStudentWorks(next, userId);
}

export function removeStudentWork(id: string, userId?: string | null) {
  saveStudentWorks(
    loadStudentWorks(userId).filter((w) => w.id !== id),
    userId,
  );
}

export function updateStudentWorkDueDate(workId: string, dueDate: string, userId?: string | null) {
  const next = loadStudentWorks(userId).map((w) => (w.id === workId ? { ...w, dueDate } : w));
  saveStudentWorks(next, userId);
}

export function clearStudentWorks(userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(studentWorkStorageKey(resolveOwner(userId)));
}

export function discardLegacyStudentWorks() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_KEY);
}
