import type { SupabaseClient } from "@supabase/supabase-js";

import {
  deleteDiaryEntryRemote,
  insertDiaryEntryRemote,
  updateDiaryEntryRemote,
} from "@/lib/supabase/diary-db";
import {
  loadDiaryPendingOps,
  removeDiaryPendingOpsMatching,
  type DiaryPendingOp,
} from "@/lib/storage/diary-pending-queue";
import { deleteDiaryEntry, loadDiaryEntries, saveDiaryEntries, upsertDiaryEntry } from "@/lib/storage/diary-storage";
import { isLocalOnlyDiaryId } from "@/lib/wellbeing/diary-merge";

export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/** Replay queued diary ops against Supabase; returns count flushed. */
export async function flushDiaryPendingQueue(client: SupabaseClient, userId: string): Promise<number> {
  if (!isBrowserOnline()) return 0;

  const ops = loadDiaryPendingOps(userId);
  if (ops.length === 0) return 0;

  let flushed = 0;
  const idMap = new Map<string, string>();

  for (const op of ops) {
    try {
      if (op.kind === "create") {
        const created = await insertDiaryEntryRemote(client, userId, op.input);
        idMap.set(op.localId, created.id);
        const local = loadDiaryEntries(userId).filter((e) => e.id !== op.localId);
        saveDiaryEntries([created, ...local], userId);
        removeDiaryPendingOpsMatching((x) => x.kind === "create" && x.localId === op.localId, userId);
        flushed += 1;
      } else if (op.kind === "update") {
        const resolvedId = idMap.get(op.entry.id) ?? op.entry.id;
        if (isLocalOnlyDiaryId(resolvedId)) continue;
        const updated = await updateDiaryEntryRemote(client, userId, { ...op.entry, id: resolvedId });
        upsertDiaryEntry(updated, userId);
        removeDiaryPendingOpsMatching((x) => x.kind === "update" && x.entry.id === op.entry.id, userId);
        flushed += 1;
      } else if (op.kind === "delete") {
        const resolvedId = idMap.get(op.id) ?? op.id;
        if (!isLocalOnlyDiaryId(resolvedId)) {
          await deleteDiaryEntryRemote(client, userId, resolvedId);
        }
        deleteDiaryEntry(op.id, userId);
        removeDiaryPendingOpsMatching((x) => x.kind === "delete" && x.id === op.id, userId);
        flushed += 1;
      }
    } catch {
      break;
    }
  }

  return flushed;
}

export function mapPendingOpLabel(op: DiaryPendingOp): string {
  if (op.kind === "create") return "nueva entrada";
  if (op.kind === "update") return "edición";
  return "borrado";
}
