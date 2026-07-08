import type { NewDiaryEntryInput } from "@/lib/storage/diary-storage";
import type { DiaryEntry } from "@/lib/schemas/diary-entry";

const QUEUE_KEY = "kampus.diary.pendingOps.v1";

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

export function loadDiaryPendingOps(): DiaryPendingOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DiaryPendingOp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDiaryPendingOps(ops: DiaryPendingOp[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
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

export function clearDiaryPendingOps() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(QUEUE_KEY);
  notifyDiaryPendingChanged();
}

export function removeDiaryPendingOpsMatching(predicate: (op: DiaryPendingOp) => boolean) {
  const next = loadDiaryPendingOps().filter((op) => !predicate(op));
  saveDiaryPendingOps(next);
}
