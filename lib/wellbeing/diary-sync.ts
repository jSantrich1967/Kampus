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

import { readAccountItem, writeAccountItem } from "@/lib/storage/account-box";

const SYNC_META_BASE = "kampus.diary.syncMeta.v1";

type SyncMeta = { userId: string; syncedAt: string };

function readSyncMeta(userId: string): SyncMeta | null {
  const raw = readAccountItem(SYNC_META_BASE, userId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SyncMeta;
  } catch {
    return null;
  }
}

export function markDiarySyncedForUser(userId: string) {
  const meta: SyncMeta = { userId, syncedAt: new Date().toISOString() };
  writeAccountItem(SYNC_META_BASE, JSON.stringify(meta), userId);
}

/** True when local rows need uploading or user changed since last sync. */
export function diaryNeedsCloudSync(userId: string): boolean {
  const local = loadDiaryEntries(userId);
  if (local.some((e) => isLocalOnlyDiaryId(e.id))) return true;
  const meta = readSyncMeta(userId);
  return meta?.userId !== userId;
}

/** Push local-only rows, merge with cloud, cache locally. */
export async function syncDiaryWithCloud(
  client: SupabaseClient,
  userId: string,
): Promise<DiarySyncResult> {
  const flushedPending = await flushDiaryPendingQueue(client, userId);

  const local = loadDiaryEntries(userId);
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
  saveDiaryEntries(merged, userId);
  markDiarySyncedForUser(userId);
  notifyDiaryChanged();
  notifyDiarySyncCompleted({ pushedCount, flushedPending });
  return { entries: merged, pushedCount, flushedPending };
}

export function cacheDiaryEntriesLocally(
  entries: Parameters<typeof saveDiaryEntries>[0],
  userId?: string | null,
) {
  saveDiaryEntries(entries, userId);
}
