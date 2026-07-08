const STORAGE_KEY = "kampus.passCloseCycle.v1";

export type PassCloseCycleState = {
  date: string;
  errors: [string, string, string];
  classQuestion: string;
};

function todayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyState(): PassCloseCycleState {
  return { date: todayDateKey(), errors: ["", "", ""], classQuestion: "" };
}

export function loadPassCloseCycle(): PassCloseCycleState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as PassCloseCycleState;
    if (parsed.date !== todayDateKey()) return emptyState();
    const errors = Array.isArray(parsed.errors) ? parsed.errors.slice(0, 3) : [];
    while (errors.length < 3) errors.push("");
    return {
      date: todayDateKey(),
      errors: [errors[0] ?? "", errors[1] ?? "", errors[2] ?? ""] as [string, string, string],
      classQuestion: typeof parsed.classQuestion === "string" ? parsed.classQuestion : "",
    };
  } catch {
    return emptyState();
  }
}

export function savePassCloseCycle(state: PassCloseCycleState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, date: todayDateKey() }));
}

export function isPassCloseCycleFilled(state: PassCloseCycleState): boolean {
  const filledErrors = state.errors.filter((e) => e.trim().length > 0).length;
  return filledErrors >= 1 && state.classQuestion.trim().length > 0;
}
