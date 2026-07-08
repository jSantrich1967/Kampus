import type { StudyRoomState } from "@/lib/storage/study-room-storage";
import { defaultStudyRoomState } from "@/lib/storage/study-room-storage";

export function parseStudyRoomState(raw: unknown): StudyRoomState {
  if (!raw || typeof raw !== "object") return defaultStudyRoomState;
  const o = raw as Partial<StudyRoomState>;
  return {
    title: typeof o.title === "string" ? o.title : defaultStudyRoomState.title,
    agenda: Array.isArray(o.agenda) ? o.agenda.filter((x): x is string => typeof x === "string") : defaultStudyRoomState.agenda,
    sharedGoal: typeof o.sharedGoal === "string" ? o.sharedGoal : defaultStudyRoomState.sharedGoal,
    notes: typeof o.notes === "string" ? o.notes : defaultStudyRoomState.notes,
    focusSeconds: typeof o.focusSeconds === "number" ? o.focusSeconds : 0,
  };
}

export function pickNewerStudyRoomState(
  local: StudyRoomState,
  localUpdatedAt: number,
  remote: StudyRoomState,
  remoteUpdatedAt: number,
): StudyRoomState {
  return remoteUpdatedAt >= localUpdatedAt ? remote : local;
}
