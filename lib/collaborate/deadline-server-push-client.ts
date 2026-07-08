const SERVER_PUSH_PREFS_KEY = "kampus.collaborate.deadlineServerPush.v1";

export function loadCollaborateDeadlineServerPushEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SERVER_PUSH_PREFS_KEY) === "1";
}

export function saveCollaborateDeadlineServerPushEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(SERVER_PUSH_PREFS_KEY, "1");
  else window.localStorage.removeItem(SERVER_PUSH_PREFS_KEY);
}

export async function registerCollaborateDeadlineServerPush(): Promise<boolean> {
  const { registerServerPushSubscription } = await import("@/lib/wellbeing/server-push-client");
  const pushOk = await registerServerPushSubscription();
  if (!pushOk) return false;

  const res = await fetch("/api/collaborate/push/opt-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: true }),
  });
  return res.ok;
}

export async function unregisterCollaborateDeadlineServerPush(): Promise<void> {
  await fetch("/api/collaborate/push/opt-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: false }),
  });
  saveCollaborateDeadlineServerPushEnabled(false);
}
