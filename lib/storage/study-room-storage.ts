const STORAGE_KEY = "kampus.studyroom.v1";

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

export function loadStudyRoom(): StudyRoomState {
  if (typeof window === "undefined") return defaultStudyRoomState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStudyRoomState;
    const parsed = JSON.parse(raw) as StudyRoomState;
    if (!parsed || typeof parsed !== "object") return defaultStudyRoomState;
    return { ...defaultStudyRoomState, ...parsed };
  } catch {
    return defaultStudyRoomState;
  }
}

export function saveStudyRoom(state: StudyRoomState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
