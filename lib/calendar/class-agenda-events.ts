import type { AgendaEvent } from "@/lib/calendar/agenda-events";
import type { ClassCancellation, ClassScheduleRow } from "@/lib/schemas/class-schedule";

function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Expand weekly schedule rows into dated class events inside a range (inclusive). */
export function buildClassAgendaEventsForRange(
  classes: ClassScheduleRow[],
  cancellations: ClassCancellation[],
  start: Date,
  end: Date,
): AgendaEvent[] {
  const out: AgendaEvent[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (cur <= endDay) {
    const weekdayMon0 = (cur.getDay() + 6) % 7;
    const iso = isoFromDate(cur);
    for (const c of classes) {
      if (c.weekday !== weekdayMon0) continue;
      const cancelled = cancellations.find((x) => x.scheduleId === c.id && x.classDate === iso) ?? null;
      const uploadHref = `/study/library?subject=${encodeURIComponent(c.subject)}&topic=${encodeURIComponent(
        "Clase",
      )}&scheduleId=${encodeURIComponent(c.id)}&classDate=${encodeURIComponent(iso)}&expand=1`;
      out.push({
        id: `class:${c.id}:${iso}`,
        kind: "class",
        date: iso,
        title: cancelled ? `${c.startTime} · ${c.subject} (suspendida)` : `${c.startTime} · ${c.subject}`,
        subject: c.subject,
        href: uploadHref,
        note: cancelled?.reason?.trim() ? `Justificación: ${cancelled.reason.trim()}` : undefined,
      });
    }
    cur.setDate(cur.getDate() + 1);
  }

  return out;
}
