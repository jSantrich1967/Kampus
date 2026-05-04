import { z } from "zod";

import { diaryEntrySchema, type DiaryEntry } from "@/lib/schemas/diary-entry";
import { localIsoDate } from "@/lib/calendar/local-iso-date";

const KEY = "kampus.diary.v1";

const listSchema = z.array(diaryEntrySchema);

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

function writeJson(rows: DiaryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(rows));
}

function uid() {
  return `diary_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function loadDiaryEntries(): DiaryEntry[] {
  const parsed = listSchema.safeParse(readJson());
  return parsed.success ? parsed.data : [];
}

export function saveDiaryEntries(rows: DiaryEntry[]) {
  writeJson(rows);
}

export function upsertDiaryEntry(entry: DiaryEntry) {
  const rest = loadDiaryEntries().filter((e) => e.id !== entry.id);
  const next = [entry, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  saveDiaryEntries(next);
}

export function deleteDiaryEntry(id: string) {
  saveDiaryEntries(loadDiaryEntries().filter((e) => e.id !== id));
}

export function getDiaryEntryById(id: string): DiaryEntry | null {
  return loadDiaryEntries().find((e) => e.id === id) ?? null;
}

export type NewDiaryEntryInput = Omit<DiaryEntry, "id" | "createdAt">;

export function createDiaryEntry(input: NewDiaryEntryInput): DiaryEntry {
  const row: DiaryEntry = {
    ...input,
    id: uid(),
    createdAt: new Date().toISOString(),
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
