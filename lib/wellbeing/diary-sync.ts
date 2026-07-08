import type { SupabaseClient } from "@supabase/supabase-js";

import { saveDiaryEntries, loadDiaryEntries } from "@/lib/storage/diary-storage";
import {
  fetchDiaryEntriesRemote,
  insertDiaryEntryRemote,
  updateDiaryEntryRemote,
} from "@/lib/supabase/diary-db";
import {
  diaryEntryDateKey,
  isLocalOnlyDiaryId,
  mergeDiaryEntries,
  type DiarySyncResult,
} from "@/lib/wellbeing/diary-merge";
import { notifyDiaryChanged, notifyDiarySyncCompleted } from "@/lib/wellbeing/diary-events";
import { flushDiaryPendingQueue } from "@/lib/wellbeing/diary-offline-flush";

const SYNC_META_KEY = "kampus.diary.syncMeta.v1";

type SyncMeta = { userId: string; syncedAt: string };

function readSyncMeta(): SyncMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SYNC_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SyncMeta;
  } catch {
    return null;
  }
}

export function markDiarySyncedForUser(userId: string) {
  if (typeof window === "undefined") return;
  const meta: SyncMeta = { userId, syncedAt: new Date().toISOString() };
  window.localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
}

/** True when local rows need uploading or user changed since last sync. */
export function diaryNeedsCloudSync(userId: string): boolean {
  const local = loadDiaryEntries();
  if (local.some((e) => isLocalOnlyDiaryId(e.id))) return true;
  const meta = readSyncMeta();
  return meta?.userId !== userId;
}

/** Push local-only rows, merge with cloud, cache locally. */
export async function syncDiaryWithCloud(
  client: SupabaseClient,
  userId: string,
): Promise<DiarySyncResult> {
  const flushedPending = await flushDiaryPendingQueue(client, userId);

  const local = loadDiaryEntries();
  let remote = await fetchDiaryEntriesRemote(client, userId);
  const remoteByDate = new Map(remote.map((e) => [diaryEntryDateKey(e), e]));
  let pushedCount = 0;

  for (const loc of local.filter((e) => isLocalOnlyDiaryId(e.id))) {
    const remoteSame = remoteByDate.get(diaryEntryDateKey(loc));
    if (!remoteSame) {
      const inserted = await insertDiaryEntryRemote(client, userId, loc);
      remoteByDate.set(diaryEntryDateKey(inserted), inserted);
      pushedCount += 1;
      continue;
    }

    const localTime = Date.parse(loc.updatedAt ?? loc.createdAt) || 0;
    const remoteTime = Date.parse(remoteSame.updatedAt ?? remoteSame.createdAt) || 0;
    if (localTime > remoteTime) {
      await updateDiaryEntryRemote(client, userId, {
        ...loc,
        id: remoteSame.id,
        createdAt: remoteSame.createdAt,
        updatedAt: remoteSame.updatedAt,
      });
      pushedCount += 1;
    }
  }

  remote = await fetchDiaryEntriesRemote(client, userId);
  const remoteDates = new Set(remote.map((e) => diaryEntryDateKey(e)));
  const stillLocalOnly = local.filter(
    (e) => isLocalOnlyDiaryId(e.id) && !remoteDates.has(diaryEntryDateKey(e)),
  );
  const merged = mergeDiaryEntries(stillLocalOnly, remote);
  saveDiaryEntries(merged);
  markDiarySyncedForUser(userId);
  notifyDiaryChanged();
  notifyDiarySyncCompleted({ pushedCount, flushedPending });
  return { entries: merged, pushedCount, flushedPending };
}

export function cacheDiaryEntriesLocally(entries: Parameters<typeof saveDiaryEntries>[0]) {
  saveDiaryEntries(entries);
}
