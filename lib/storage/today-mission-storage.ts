const STORAGE_KEY = "kampus.todayMission.v1";

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

export function loadTodayMission(): TodayMissionState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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

export function saveTodayMission(state: TodayMissionState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, date: todayDateKey() }));
}

export function toggleTodayBlock(blockId: string, done: boolean): TodayMissionState {
  const current = loadTodayMission();
  const set = new Set(current.completedBlockIds);
  if (done) set.add(blockId);
  else set.delete(blockId);
  const next = { date: todayDateKey(), completedBlockIds: [...set] };
  saveTodayMission(next);
  return next;
}

export function completeTodayBlock(blockId: string): TodayMissionState {
  return toggleTodayBlock(blockId, true);
}

export function getTodayMissionProgress(blockIds: string[]): {
  completedIds: string[];
  doneCount: number;
  total: number;
  percent: number;
} {
  const mission = loadTodayMission();
  const total = blockIds.length;
  const doneCount = blockIds.filter((id) => mission.completedBlockIds.includes(id)).length;
  return {
    completedIds: mission.completedBlockIds,
    doneCount,
    total,
    percent: total ? Math.round((doneCount / total) * 100) : 0,
  };
}
