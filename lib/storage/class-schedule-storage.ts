import { classScheduleListSchema, type ClassScheduleRow } from "@/lib/schemas/class-schedule";

const KEY = "kampus.classSchedule.v1";

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

function writeJson(rows: ClassScheduleRow[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(rows));
}

function uid() {
  return `cls_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function loadClassSchedule(): ClassScheduleRow[] {
  const parsed = classScheduleListSchema.safeParse(readJson());
  return parsed.success ? parsed.data : [];
}

export function saveClassSchedule(rows: ClassScheduleRow[]) {
  writeJson(rows);
}

export function addClassScheduleRow(input: Omit<ClassScheduleRow, "id">): ClassScheduleRow {
  const row: ClassScheduleRow = { ...input, id: uid() };
  const next = [...loadClassSchedule(), row];
  saveClassSchedule(next);
  return row;
}

export function removeClassScheduleRow(id: string) {
  saveClassSchedule(loadClassSchedule().filter((r) => r.id !== id));
}

