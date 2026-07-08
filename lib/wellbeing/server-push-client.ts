const SERVER_PUSH_PREFS_KEY = "kampus.wellbeing.serverPush.v1";

export function loadServerPushEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SERVER_PUSH_PREFS_KEY) === "1";
}

export function saveServerPushEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(SERVER_PUSH_PREFS_KEY, "1");
  else window.localStorage.removeItem(SERVER_PUSH_PREFS_KEY);
}

export function serverPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export async function fetchVapidPublicKey(): Promise<string | null> {
  const res = await fetch("/api/wellbeing/push/vapid");
  if (!res.ok) return null;
  const json = (await res.json()) as { configured?: boolean; publicKey?: string };
  return json.configured && json.publicKey ? json.publicKey : null;
}

export async function subscribeServerPush(publicKey: string): Promise<PushSubscription | null> {
  if (!serverPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });
}

export async function registerServerPushSubscription(): Promise<boolean> {
  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) return false;

  const { registerWellbeingServiceWorker } = await import("@/lib/wellbeing/pwa-check-in");
  await registerWellbeingServiceWorker();

  const sub = await subscribeServerPush(publicKey);
  if (!sub) return false;

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const res = await fetch("/api/wellbeing/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userAgent: navigator.userAgent.slice(0, 512),
    }),
  });

  return res.ok;
}

export async function unregisterServerPushSubscription(): Promise<void> {
  if (!serverPushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  await fetch("/api/wellbeing/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  await sub.unsubscribe();
}
