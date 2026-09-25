import type { ClassCancellation } from "@/lib/schemas/class-schedule";
import { saveClassCancellations } from "@/lib/storage/class-cancellation-storage";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fetchClassCancellationsRemote,
  upsertClassCancellationRemote,
} from "@/lib/supabase/agenda-db";

export function cancellationKey(c: Pick<ClassCancellation, "scheduleId" | "classDate">): string {
  return `${c.scheduleId.trim()}|${c.classDate.trim()}`;
}

/** Cloud wins on duplicate scheduleId+classDate. */
export function mergeCancellations(
  local: ClassCancellation[],
  remote: ClassCancellation[],
): ClassCancellation[] {
  const map = new Map<string, ClassCancellation>();
  for (const c of local) map.set(cancellationKey(c), c);
  for (const c of remote) map.set(cancellationKey(c), c);
  return [...map.values()].sort((a, b) => a.classDate.localeCompare(b.classDate));
}

/** Push local-only rows to cloud, then return merged list cached locally. */
export async function syncCancellationsWithCloud(
  client: SupabaseClient,
  userId: string,
  local: ClassCancellation[],
): Promise<ClassCancellation[]> {
  const remote = await fetchClassCancellationsRemote(client, userId);
  const remoteKeys = new Set(remote.map(cancellationKey));

  for (const c of local) {
    if (remoteKeys.has(cancellationKey(c))) continue;
    await upsertClassCancellationRemote(client, userId, {
      scheduleId: c.scheduleId,
      classDate: c.classDate,
      reason: c.reason,
    });
  }

  const after = await fetchClassCancellationsRemote(client, userId);
  const merged = mergeCancellations(local, after);
  saveClassCancellations(merged, userId);
  return merged;
}

export function cacheCancellationsLocally(rows: ClassCancellation[], userId?: string | null) {
  saveClassCancellations(rows, userId);
}
