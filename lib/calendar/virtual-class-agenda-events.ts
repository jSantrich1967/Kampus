import { localIsoDate } from "@/lib/calendar/local-iso-date";
import { buildVirtualSessionHref } from "@/lib/collaborate/virtual-session-path";
import type { AgendaEvent } from "@/lib/calendar/agenda-events";

export type VirtualClassAgendaSlice = {
  id: string;
  course: string;
  topic: string;
  /** ISO timestamptz */
  startsAt: string;
};

export function buildVirtualClassAgendaEvents(sessions: VirtualClassAgendaSlice[]): AgendaEvent[] {
  return sessions.map((s) => ({
    id: `virtualClass:${s.id}`,
    kind: "virtualClass" as const,
    date: localIsoDate(new Date(s.startsAt)),
    title: s.course,
    subject: s.topic.trim() || "Aula virtual",
    href: buildVirtualSessionHref(s.id),
    note: new Date(s.startsAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
  }));
}
