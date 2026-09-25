import { z } from "zod";

import { diaryEntrySchema, type DiaryEntry } from "@/lib/schemas/diary-entry";
import { localIsoDate } from "@/lib/calendar/local-iso-date";

/** Old builds used one box for every account. Never read it into a user. */
const LEGACY_KEY = "kampus.diary.v1";

let ownerId: string | null = null;

const listSchema = z.array(diaryEntrySchema);

/** The signed-in account, or null when nobody is logged in. */
export function setDiaryStorageOwner(userId: string | null) {
  ownerId = userId;
}

export function diaryStorageOwner(): string | null {
  return ownerId;
}

export function diaryStorageKey(userId: string | null = ownerId): string {
  if (!userId) return "kampus.diary.v1.anonymous";
  return `kampus.diary.v1.${userId}`;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

function readJson(userId?: string | null): unknown {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(diaryStorageKey(resolveOwner(userId)));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function writeJson(rows: DiaryEntry[], userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(diaryStorageKey(resolveOwner(userId)), JSON.stringify(rows));
}

export function clearDiaryStorage(userId: string | null = ownerId) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(diaryStorageKey(userId));
}

export function discardLegacyDiaryStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_KEY);
}

function uid() {
  return `diary_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function loadDiaryEntries(userId?: string | null): DiaryEntry[] {
  const parsed = listSchema.safeParse(readJson(userId));
  return parsed.success ? parsed.data : [];
}

export function saveDiaryEntries(rows: DiaryEntry[], userId?: string | null) {
  writeJson(rows, userId);
}

export function upsertDiaryEntry(entry: DiaryEntry, userId?: string | null) {
  const rest = loadDiaryEntries(userId).filter((e) => e.id !== entry.id);
  const stamped: DiaryEntry = {
    ...entry,
    updatedAt: new Date().toISOString(),
  };
  const next = [stamped, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  saveDiaryEntries(next, userId);
}

export function deleteDiaryEntry(id: string, userId?: string | null) {
  saveDiaryEntries(
    loadDiaryEntries(userId).filter((e) => e.id !== id),
    userId,
  );
}

export function getDiaryEntryById(id: string, userId?: string | null): DiaryEntry | null {
  return loadDiaryEntries(userId).find((e) => e.id === id) ?? null;
}

export type NewDiaryEntryInput = Omit<DiaryEntry, "id" | "createdAt">;

export function createDiaryEntry(input: NewDiaryEntryInput): DiaryEntry {
  const now = new Date().toISOString();
  const row: DiaryEntry = {
    ...input,
    id: uid(),
    createdAt: now,
    updatedAt: now,
  };
  upsertDiaryEntry(row);
  return row;
}

function dateFromLocalIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  const x = new Date(y!, m! - 1, d!);
  x.setHours(12, 0, 0, 0);
  return x;
}

/**
 * Racha: días seguidos con entrada, mirando hacia atrás desde hoy.
 * Si hoy aún no escribiste pero ayer sí, la racha sigue (un día de gracia).
 */
export function diaryStreakDays(entries: DiaryEntry[]): number {
  if (entries.length === 0) return 0;
  const set = new Set(entries.map((e) => e.entryDate));
  const todayIso = localIsoDate();
  let d = dateFromLocalIso(todayIso);
  if (!set.has(todayIso)) {
    d.setDate(d.getDate() - 1);
    if (!set.has(localIsoDate(d))) return 0;
  } else {
    d = dateFromLocalIso(todayIso);
  }
  let streak = 0;
  for (let guard = 0; guard < 400; guard += 1) {
    const iso = localIsoDate(d);
    if (!set.has(iso)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function hasDiaryEntryForDate(entries: DiaryEntry[], iso: string): boolean {
  return entries.some((e) => e.entryDate === iso);
}

export function hasDiaryEntryToday(entries: DiaryEntry[]): boolean {
  return hasDiaryEntryForDate(entries, localIsoDate());
}
