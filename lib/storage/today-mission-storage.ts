/** Old builds used one box for every account. Never read it into a user. */
const LEGACY_KEY = "kampus.todayMission.v1";

let ownerId: string | null = null;

export function setTodayMissionOwner(userId: string | null) {
  ownerId = userId;
}

export function todayMissionStorageKey(userId: string | null = ownerId): string {
  if (!userId) return "kampus.todayMission.v1.anonymous";
  return `kampus.todayMission.v1.${userId}`;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

export type TodayMissionState = {
  /** YYYY-MM-DD local date when progress was recorded */
  date: string;
  completedBlockIds: string[];
};

function todayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyState(): TodayMissionState {
  return { date: todayDateKey(), completedBlockIds: [] };
}

export function loadTodayMission(userId?: string | null): TodayMissionState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(todayMissionStorageKey(resolveOwner(userId)));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as TodayMissionState;
    if (parsed.date !== todayDateKey()) return emptyState();
    return {
      date: todayDateKey(),
      completedBlockIds: Array.isArray(parsed.completedBlockIds)
        ? parsed.completedBlockIds.filter((id) => typeof id === "string")
        : [],
    };
  } catch {
    return emptyState();
  }
}

export function saveTodayMission(state: TodayMissionState, userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    todayMissionStorageKey(resolveOwner(userId)),
    JSON.stringify({ ...state, date: todayDateKey() }),
  );
}

export function toggleTodayBlock(blockId: string, done: boolean, userId?: string | null): TodayMissionState {
  const current = loadTodayMission(userId);
  const set = new Set(current.completedBlockIds);
  if (done) set.add(blockId);
  else set.delete(blockId);
  const next = { date: todayDateKey(), completedBlockIds: [...set] };
  saveTodayMission(next, userId);
  return next;
}

export function completeTodayBlock(blockId: string, userId?: string | null): TodayMissionState {
  return toggleTodayBlock(blockId, true, userId);
}

export function getTodayMissionProgress(blockIds: string[], userId?: string | null): {
  completedIds: string[];
  doneCount: number;
  total: number;
  percent: number;
} {
  const mission = loadTodayMission(userId);
  const total = blockIds.length;
  const doneCount = blockIds.filter((id) => mission.completedBlockIds.includes(id)).length;
  return {
    completedIds: mission.completedBlockIds,
    doneCount,
    total,
    percent: total ? Math.round((doneCount / total) * 100) : 0,
  };
}

export function clearTodayMission(userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(todayMissionStorageKey(resolveOwner(userId)));
}

export function discardLegacyTodayMission() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_KEY);
}
