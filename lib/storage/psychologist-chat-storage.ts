const STORAGE_KEY = "kampus.psychologist.chat.v1";

export type PsychologistChatTurn = { role: "user" | "assistant"; content: string };

export function loadPsychologistChat(): PsychologistChatTurn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
  } catch {
    return [];
  }
}

export function savePsychologistChat(messages: PsychologistChatTurn[]) {
  if (typeof window === "undefined") return;
  const trimmed = messages.slice(-28);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function clearPsychologistChatStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
