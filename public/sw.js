/* Kampus wellbeing PWA — local + server Web Push check-in reminders. */
const CACHE = "kampus-wellbeing-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function openWellbeingUrl(url) {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if ("focus" in client) {
        return client.focus();
      }
    }
    return self.clients.openWindow(url);
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/wellbeing/diary";
  event.waitUntil(openWellbeingUrl(url));
});

self.addEventListener("push", (event) => {
  let title = "Kampus";
  let body = "¿Cómo ha ido tu día?";
  let url = "/wellbeing/diary";

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload.title) title = payload.title;
      if (payload.body) body = payload.body;
      if (payload.url) url = payload.url;
    } catch {
      body = event.data.text() || body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      tag: "kampus-check-in-push",
      data: { url },
      renotify: true,
    }),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "SHOW_CHECK_IN") {
    event.waitUntil(
      self.registration.showNotification(data.title || "Kampus", {
        body: data.body || "",
        icon: "/icons/icon-192.svg",
        badge: "/icons/icon-192.svg",
        tag: "kampus-check-in-pwa",
        data: { url: data.url || "/wellbeing/diary" },
        renotify: true,
      }),
    );
  }
});
