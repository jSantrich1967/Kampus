import { localIsoDate } from "@/lib/calendar/local-iso-date";
import type { CollaborationFocusItem } from "@/lib/collaborate/collaboration-deadlines";
import {
  loadCollaborateDeadlineNotifyEnabled,
  loadCollaborateDeadlineNotifyLastFiredDate,
  saveCollaborateDeadlineNotifyLastFiredDate,
} from "@/lib/collaborate/deadline-notify-storage";

/** Entregas hoy, mañana o ya vencidas (≤1 día restante o overdue). */
export function urgentCollaborationDeadlines(items: CollaborationFocusItem[]): CollaborationFocusItem[] {
  return items.filter((item) => item.daysUntil <= 1).sort((a, b) => a.daysUntil - b.daysUntil);
}

export function buildDeadlineNotifyBody(items: CollaborationFocusItem[]): string {
  const top = items[0];
  if (!top) return "Revisa tus entregas en Colaboración.";
  if (top.daysUntil < 0) return `«${top.title}» venció — actualiza tu trabajo en Colaboración.`;
  if (top.daysUntil === 0) return `«${top.title}» vence hoy — abre Colaboración para terminar.`;
  return `«${top.title}» vence mañana — planifica en Colaboración.`;
}

export async function fireCollaborationDeadlineNotification(items: CollaborationFocusItem[]): Promise<void> {
  if (typeof window === "undefined") return;
  if (!loadCollaborateDeadlineNotifyEnabled()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const urgent = urgentCollaborationDeadlines(items);
  if (urgent.length === 0) return;

  const today = localIsoDate();
  if (loadCollaborateDeadlineNotifyLastFiredDate() === today) return;

  const title = urgent.length === 1 ? "Entrega próxima" : `${urgent.length} entregas próximas`;
  const body = buildDeadlineNotifyBody(urgent);

  try {
    const sent = await import("@/lib/wellbeing/pwa-check-in").then((m) =>
      m.showPwaCheckInNotification(title, body, "/collaborate"),
    );
    if (!sent) {
      new Notification(title, { body, tag: "kampus-collab-deadline", icon: "/icons/icon-192.svg" });
    }
    saveCollaborateDeadlineNotifyLastFiredDate(today);
  } catch {
    /* ignore */
  }
}
