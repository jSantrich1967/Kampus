import {
  classCancellationListSchema,
  classCancellationSchema,
  type ClassCancellation,
} from "@/lib/schemas/class-schedule";

const KEY = "kampus.classCancellations.v1";

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

function writeJson(rows: ClassCancellation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(rows));
}

function uid() {
  return `cancel_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function loadClassCancellations(): ClassCancellation[] {
  const parsed = classCancellationListSchema.safeParse(readJson());
  return parsed.success ? parsed.data : [];
}

export function saveClassCancellations(rows: ClassCancellation[]) {
  writeJson(rows);
}

export function upsertClassCancellation(input: Omit<ClassCancellation, "id">): ClassCancellation {
  const existing = loadClassCancellations();
  const idx = existing.findIndex(
    (c) => c.scheduleId === input.scheduleId && c.classDate === input.classDate,
  );
  const row = classCancellationSchema.parse(
    idx >= 0 ? { ...existing[idx], reason: input.reason } : { ...input, id: uid() },
  );
  const next = idx >= 0 ? existing.map((c, i) => (i === idx ? row : c)) : [...existing, row];
  saveClassCancellations(next);
  return row;
}

export function removeClassCancellation(id: string) {
  saveClassCancellations(loadClassCancellations().filter((c) => c.id !== id));
}
