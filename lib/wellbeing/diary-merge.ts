import type { DiaryEntry } from "@/lib/schemas/diary-entry";

export function diaryEntryDateKey(entry: Pick<DiaryEntry, "entryDate">): string {
  return entry.entryDate.trim();
}

export function isLocalOnlyDiaryId(id: string): boolean {
  return id.startsWith("diary_");
}

/**
 * One entry per calendar day; on conflict the newer createdAt wins (tie → remote).
 */
export function mergeDiaryEntries(local: DiaryEntry[], remote: DiaryEntry[]): DiaryEntry[] {
  const map = new Map<string, DiaryEntry>();

  for (const entry of local) {
    map.set(diaryEntryDateKey(entry), entry);
  }

  for (const remoteEntry of remote) {
    const key = diaryEntryDateKey(remoteEntry);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, remoteEntry);
      continue;
    }
    const existingTime = Date.parse(existing.updatedAt ?? existing.createdAt) || 0;
    const remoteTime = Date.parse(remoteEntry.updatedAt ?? remoteEntry.createdAt) || 0;
    map.set(key, remoteTime >= existingTime ? remoteEntry : existing);
  }

  return [...map.values()].sort(
    (a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt),
  );
}

export type DiarySyncResult = {
  entries: DiaryEntry[];
  pushedCount: number;
  flushedPending: number;
};
