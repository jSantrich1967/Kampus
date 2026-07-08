const LEGACY_STORAGE_KEY = "kampus.studyroom.v1";
const STORAGE_PREFIX = "kampus.studyroom.v1.";

export type StudyRoomState = {
  title: string;
  agenda: string[];
  sharedGoal: string;
  notes: string;
  focusSeconds: number;
};

export const defaultStudyRoomState: StudyRoomState = {
  title: "Night session",
  agenda: ["Review definitions", "20 flashcards", "1 practice exam set"],
  sharedGoal: "Pass the Friday quiz without pulling an all-nighter.",
  notes: "",
  focusSeconds: 0,
};

export const STUDY_ROOM_CHANGED_EVENT = "kampus:study-room-changed";

export function notifyStudyRoomChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STUDY_ROOM_CHANGED_EVENT));
}

function storageKeyForRoom(roomCode: string): string {
  const code = roomCode.trim() || "default";
  return code === "default" ? LEGACY_STORAGE_KEY : `${STORAGE_PREFIX}${code}`;
}

export function loadStudyRoom(roomCode = "default"): StudyRoomState {
  if (typeof window === "undefined") return defaultStudyRoomState;
  try {
    const raw = window.localStorage.getItem(storageKeyForRoom(roomCode));
    if (!raw) return defaultStudyRoomState;
    const parsed = JSON.parse(raw) as StudyRoomState;
    if (!parsed || typeof parsed !== "object") return defaultStudyRoomState;
    return { ...defaultStudyRoomState, ...parsed };
  } catch {
    return defaultStudyRoomState;
  }
}

export function saveStudyRoom(state: StudyRoomState, roomCode = "default") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKeyForRoom(roomCode), JSON.stringify(state));
  notifyStudyRoomChanged();
}
