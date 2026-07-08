import { localIsoDate } from "@/lib/calendar/local-iso-date";
import { buildVirtualSessionHref } from "@/lib/collaborate/virtual-session-path";
import {
  loadVirtualClassNotifyEnabled,
  markVirtualClassNotified,
  wasVirtualClassNotified,
} from "@/lib/collaborate/virtual-class-notify-storage";

export type VirtualClassReminderTarget = {
  id: string;
  course: string;
  startsAt: string;
};

/** Notify when session starts in ~45–75 minutes (about 1 hour before). */
const MIN_MS = 45 * 60 * 1000;
const MAX_MS = 75 * 60 * 1000;

export function virtualClassInReminderWindow(startsAt: string, now = Date.now()): boolean {
  const ms = new Date(startsAt).getTime() - now;
  return ms >= MIN_MS && ms <= MAX_MS;
}

export function buildVirtualClassNotifyBody(course: string, startsAt: string): string {
  const time = new Date(startsAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `«${course}» empieza a las ${time}. Entra al aula virtual cuando quieras.`;
}

export async function fireVirtualClassReminderNotification(
  sessions: VirtualClassReminderTarget[],
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!loadVirtualClassNotifyEnabled()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = Date.now();
  const today = localIsoDate();

  for (const session of sessions) {
    if (!virtualClassInReminderWindow(session.startsAt, now)) continue;
    if (wasVirtualClassNotified(session.id, today)) continue;

    const title = "Clase virtual pronto";
    const body = buildVirtualClassNotifyBody(session.course, session.startsAt);
    const url = buildVirtualSessionHref(session.id);

    try {
      const sent = await import("@/lib/wellbeing/pwa-check-in").then((m) =>
        m.showPwaCheckInNotification(title, body, url),
      );
      if (!sent) {
        new Notification(title, { body, tag: `kampus-vc-${session.id}`, icon: "/icons/icon-192.svg" });
      }
      markVirtualClassNotified(session.id, today);
    } catch {
      /* ignore */
    }
  }
}
