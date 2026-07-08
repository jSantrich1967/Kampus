import type { AgendaEvent } from "@/lib/calendar/agenda-events";

export const AGENDA_DRAG_MIME = "application/x-kampus-agenda-event";

export type ParsedAgendaEventRef =
  | { kind: "exam"; entityId: string }
  | { kind: "work"; entityId: string }
  | { kind: "presentation"; entityId: string };

export function isAgendaEventDraggable(ev: AgendaEvent): boolean {
  return ev.kind === "exam" || ev.kind === "work" || ev.kind === "presentation";
}

export function parseAgendaEventRef(eventId: string): ParsedAgendaEventRef | null {
  const [kind, entityId] = eventId.split(":");
  if (!entityId?.trim()) return null;
  if (kind === "exam" || kind === "work" || kind === "presentation") {
    return { kind, entityId: entityId.trim() };
  }
  return null;
}

export function agendaDragPayload(eventId: string): string {
  return eventId;
}
