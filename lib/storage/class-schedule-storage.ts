import { classScheduleListSchema, type ClassScheduleRow } from "@/lib/schemas/class-schedule";

/** Old builds used one box for every account. Never read it into a user. */
const LEGACY_KEY = "kampus.classSchedule.v1";

let ownerId: string | null = null;

export function setClassScheduleOwner(userId: string | null) {
  ownerId = userId;
}

export function classScheduleStorageKey(userId: string | null = ownerId): string {
  if (!userId) return "kampus.classSchedule.v1.anonymous";
  return `kampus.classSchedule.v1.${userId}`;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

function readJson(userId?: string | null): unknown {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(classScheduleStorageKey(resolveOwner(userId)));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function writeJson(rows: ClassScheduleRow[], userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(classScheduleStorageKey(resolveOwner(userId)), JSON.stringify(rows));
}

function uid() {
  return `cls_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function loadClassSchedule(userId?: string | null): ClassScheduleRow[] {
  const parsed = classScheduleListSchema.safeParse(readJson(userId));
  return parsed.success ? parsed.data : [];
}

export function saveClassSchedule(rows: ClassScheduleRow[], userId?: string | null) {
  writeJson(rows, userId);
}

export function addClassScheduleRow(input: Omit<ClassScheduleRow, "id">, userId?: string | null): ClassScheduleRow {
  const row: ClassScheduleRow = { ...input, id: uid() };
  const next = [...loadClassSchedule(userId), row];
  saveClassSchedule(next, userId);
  return row;
}

export function removeClassScheduleRow(id: string, userId?: string | null) {
  saveClassSchedule(
    loadClassSchedule(userId).filter((r) => r.id !== id),
    userId,
  );
}

export function clearClassScheduleStorage(userId: string | null = ownerId) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(classScheduleStorageKey(userId));
}

export function discardLegacyClassSchedule() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_KEY);
}
