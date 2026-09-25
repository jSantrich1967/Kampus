/** Old builds used one box for every account. Never read it into a user. */
const LEGACY_STORAGE_KEY = "kampus.psychologist.chat.v1";

export type PsychologistChatTurn = { role: "user" | "assistant"; content: string };

/** Each account gets its own box. Logged-out use stays in a separate anonymous box. */
export function psychologistChatStorageKey(userId: string | null): string {
  if (!userId) return "kampus.psychologist.chat.v1.anonymous";
  return `kampus.psychologist.chat.v1.${userId}`;
}

function readTurns(key: string): PsychologistChatTurn[] {
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as PsychologistChatTurn[];
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (m) =>
      m &&
      typeof m === "object" &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string",
  );
}

export function loadPsychologistChat(userId: string | null): PsychologistChatTurn[] {
  if (typeof window === "undefined") return [];
  try {
    return readTurns(psychologistChatStorageKey(userId));
  } catch {
    return [];
  }
}

export function savePsychologistChat(userId: string | null, messages: PsychologistChatTurn[]) {
  if (typeof window === "undefined") return;
  const trimmed = messages.slice(-28);
  window.localStorage.setItem(psychologistChatStorageKey(userId), JSON.stringify(trimmed));
}

export function clearPsychologistChatStorage(userId: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(psychologistChatStorageKey(userId));
}

export function discardLegacyPsychologistChat(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}
