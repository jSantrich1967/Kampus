import type { DiaryEntry } from "@/lib/schemas/diary-entry";
import { diaryStorageOwner } from "@/lib/storage/diary-storage";
import type { NewDiaryEntryInput } from "@/lib/storage/diary-storage";

const LEGACY_QUEUE_KEY = "kampus.diary.pendingOps.v1";

function queueKey(userId: string | null = diaryStorageOwner()): string {
  if (!userId) return "kampus.diary.pendingOps.v1.anonymous";
  return `kampus.diary.pendingOps.v1.${userId}`;
}

export type DiaryPendingCreate = {
  kind: "create";
  localId: string;
  input: NewDiaryEntryInput;
  queuedAt: string;
};

export type DiaryPendingUpdate = {
  kind: "update";
  entry: DiaryEntry;
  queuedAt: string;
};

export type DiaryPendingDelete = {
  kind: "delete";
  id: string;
  queuedAt: string;
};

export type DiaryPendingOp = DiaryPendingCreate | DiaryPendingUpdate | DiaryPendingDelete;

export const DIARY_PENDING_CHANGED_EVENT = "kampus:diary-pending-changed";

export function notifyDiaryPendingChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DIARY_PENDING_CHANGED_EVENT));
}

export function loadDiaryPendingOps(userId?: string | null): DiaryPendingOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(queueKey(userId === undefined ? diaryStorageOwner() : userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DiaryPendingOp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDiaryPendingOps(ops: DiaryPendingOp[], userId?: string | null) {
  if (typeof window === "undefined") return;
  const owner = userId === undefined ? diaryStorageOwner() : userId;
  window.localStorage.setItem(queueKey(owner), JSON.stringify(ops));
  notifyDiaryPendingChanged();
}

export function countDiaryPendingOps(): number {
  return loadDiaryPendingOps().length;
}

export function enqueueDiaryPendingOp(op: DiaryPendingOp) {
  const ops = loadDiaryPendingOps();
  if (op.kind === "create") {
    const filtered = ops.filter((x) => !(x.kind === "create" && x.localId === op.localId));
    saveDiaryPendingOps([...filtered, op]);
    return;
  }
  if (op.kind === "update") {
    const filtered = ops.filter(
      (x) => !(x.kind === "update" && x.entry.id === op.entry.id) && !(x.kind === "delete" && x.id === op.entry.id),
    );
    saveDiaryPendingOps([...filtered, op]);
    return;
  }
  const filtered = ops.filter(
    (x) =>
      !(x.kind === "delete" && x.id === op.id) &&
      !(x.kind === "update" && x.entry.id === op.id) &&
      !(x.kind === "create" && x.localId === op.id),
  );
  saveDiaryPendingOps([...filtered, op]);
}

export function clearDiaryPendingOps(userId?: string | null) {
  if (typeof window === "undefined") return;
  const owner = userId === undefined ? diaryStorageOwner() : userId;
  window.localStorage.removeItem(queueKey(owner));
  notifyDiaryPendingChanged();
}

export function discardLegacyDiaryPendingQueue() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_QUEUE_KEY);
}

export function removeDiaryPendingOpsMatching(predicate: (op: DiaryPendingOp) => boolean, userId?: string | null) {
  const next = loadDiaryPendingOps(userId).filter((op) => !predicate(op));
  saveDiaryPendingOps(next, userId);
}
