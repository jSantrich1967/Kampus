import { readAccountFlag, writeAccountFlag } from "@/lib/storage/account-box";

const SERVER_PUSH_PREFS_BASE = "kampus.collaborate.deadlineServerPush.v1";

export function loadCollaborateDeadlineServerPushEnabled(userId?: string | null): boolean {
  return readAccountFlag(SERVER_PUSH_PREFS_BASE, userId);
}

export function saveCollaborateDeadlineServerPushEnabled(value: boolean, userId?: string | null): void {
  writeAccountFlag(SERVER_PUSH_PREFS_BASE, value, userId);
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

export async function unregisterCollaborateDeadlineServerPush(userId?: string | null): Promise<void> {
  await fetch("/api/collaborate/push/opt-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: false }),
  });
  saveCollaborateDeadlineServerPushEnabled(false, userId);
}
