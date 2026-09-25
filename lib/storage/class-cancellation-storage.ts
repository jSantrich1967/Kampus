import {
  classCancellationListSchema,
  classCancellationSchema,
  type ClassCancellation,
} from "@/lib/schemas/class-schedule";

/** Old builds used one box for every account. Never read it into a user. */
const LEGACY_KEY = "kampus.classCancellations.v1";

let ownerId: string | null = null;

export function setClassCancellationOwner(userId: string | null) {
  ownerId = userId;
}

export function classCancellationStorageKey(userId: string | null = ownerId): string {
  if (!userId) return "kampus.classCancellations.v1.anonymous";
  return `kampus.classCancellations.v1.${userId}`;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

function readJson(userId?: string | null): unknown {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(classCancellationStorageKey(resolveOwner(userId)));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function writeJson(rows: ClassCancellation[], userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(classCancellationStorageKey(resolveOwner(userId)), JSON.stringify(rows));
}

function uid() {
  return `cancel_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function loadClassCancellations(userId?: string | null): ClassCancellation[] {
  const parsed = classCancellationListSchema.safeParse(readJson(userId));
  return parsed.success ? parsed.data : [];
}

export function saveClassCancellations(rows: ClassCancellation[], userId?: string | null) {
  writeJson(rows, userId);
}

export function upsertClassCancellation(
  input: Omit<ClassCancellation, "id">,
  userId?: string | null,
): ClassCancellation {
  const existing = loadClassCancellations(userId);
  const idx = existing.findIndex(
    (c) => c.scheduleId === input.scheduleId && c.classDate === input.classDate,
  );
  const row = classCancellationSchema.parse(
    idx >= 0 ? { ...existing[idx], reason: input.reason } : { ...input, id: uid() },
  );
  const next = idx >= 0 ? existing.map((c, i) => (i === idx ? row : c)) : [...existing, row];
  saveClassCancellations(next, userId);
  return row;
}

export function removeClassCancellation(id: string, userId?: string | null) {
  saveClassCancellations(
    loadClassCancellations(userId).filter((c) => c.id !== id),
    userId,
  );
}

export function clearClassCancellationStorage(userId: string | null = ownerId) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(classCancellationStorageKey(userId));
}

export function discardLegacyClassCancellations() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_KEY);
}
