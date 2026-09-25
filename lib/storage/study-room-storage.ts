/** Old builds keyed the room only by its code, so every account shared one box. */
const LEGACY_EXACT_KEY = "kampus.studyroom.v1";
const LEGACY_PREFIX = "kampus.studyroom.v1.";

let ownerId: string | null = null;

export function setStudyRoomOwner(userId: string | null) {
  ownerId = userId;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

function roomSuffix(roomCode: string): string {
  const code = roomCode.trim() || "default";
  return code === "default" ? "default" : code;
}

function accountPrefix(userId: string | null): string {
  return userId ? `kampus.studyroom.v1.user.${userId}.` : "kampus.studyroom.v1.anonymous.";
}

export function studyRoomStorageKey(roomCode = "default", userId: string | null = ownerId): string {
  return `${accountPrefix(userId)}${roomSuffix(roomCode)}`;
}

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

export function hasSavedStudyRoom(roomCode = "default", userId?: string | null): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(studyRoomStorageKey(roomCode, resolveOwner(userId))) !== null;
}

export function loadStudyRoom(roomCode = "default", userId?: string | null): StudyRoomState {
  if (typeof window === "undefined") return defaultStudyRoomState;
  try {
    const raw = window.localStorage.getItem(studyRoomStorageKey(roomCode, resolveOwner(userId)));
    if (!raw) return defaultStudyRoomState;
    const parsed = JSON.parse(raw) as StudyRoomState;
    if (!parsed || typeof parsed !== "object") return defaultStudyRoomState;
    return { ...defaultStudyRoomState, ...parsed };
  } catch {
    return defaultStudyRoomState;
  }
}

export function saveStudyRoom(state: StudyRoomState, roomCode = "default", userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(studyRoomStorageKey(roomCode, resolveOwner(userId)), JSON.stringify(state));
  notifyStudyRoomChanged();
}

function removeKeysWithPrefix(prefix: string) {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  for (const key of keys) window.localStorage.removeItem(key);
}

export function clearStudyRoomStorage(userId: string | null = ownerId) {
  removeKeysWithPrefix(accountPrefix(userId));
}

export function discardLegacyStudyRooms() {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (key === LEGACY_EXACT_KEY) keys.push(key);
    else if (
      key.startsWith(LEGACY_PREFIX) &&
      !key.startsWith(`${LEGACY_PREFIX}anonymous.`) &&
      !key.startsWith(`${LEGACY_PREFIX}user.`)
    ) {
      keys.push(key);
    }
  }
  for (const key of keys) window.localStorage.removeItem(key);
}
