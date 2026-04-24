import { z } from "zod";

import { studentWorkSchema, type StudentWork } from "@/lib/schemas/student-work";

const KEY = "kampus.studentWorks.v1";

const listSchema = z.array(studentWorkSchema);

function readJson(): unknown {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function writeJson(rows: StudentWork[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(rows));
}

function uid() {
  return `work_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function loadStudentWorks(): StudentWork[] {
  const parsed = listSchema.safeParse(readJson());
  return parsed.success ? parsed.data : [];
}

export function saveStudentWorks(rows: StudentWork[]) {
  writeJson(rows);
}

export function addStudentWork(input: Omit<StudentWork, "id" | "createdAt">): StudentWork {
  const row: StudentWork = {
    ...input,
    id: uid(),
    createdAt: new Date().toISOString(),
  };
  const next = [row, ...loadStudentWorks()];
  saveStudentWorks(next);
  return row;
}

export function removeStudentWork(id: string) {
  saveStudentWorks(loadStudentWorks().filter((w) => w.id !== id));
}
