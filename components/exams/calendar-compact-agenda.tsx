"use client";

import Link from "next/link";

import { CalendarAgendaEventChip } from "@/components/exams/calendar-agenda-event-chip";
import { Badge } from "@/components/ui/badge";
import { daysUntilDate, daysLeftLabel, urgencyTone } from "@/lib/calendar/calendar-urgency";
import type { AgendaEvent } from "@/lib/calendar/agenda-events";
import { calendarCopy } from "@/lib/i18n/calendar";
import { cn } from "@/lib/cn";

type CalendarCompactAgendaProps = {
  events: AgendaEvent[];
  kindLabel: (kind: AgendaEvent["kind"]) => string;
  draggingEventId?: string | null;
  onDragStart?: (eventId: string) => void;
  onDragEnd?: () => void;
};

function groupByDate(events: AgendaEvent[]): Map<string, AgendaEvent[]> {
  const map = new Map<string, AgendaEvent[]>();
  for (const ev of events) {
    if (!map.has(ev.date)) map.set(ev.date, []);
    map.get(ev.date)!.push(ev);
  }
  return map;
}

export function CalendarCompactAgenda({
  events,
  kindLabel,
  draggingEventId,
  onDragStart,
  onDragEnd,
}: CalendarCompactAgendaProps) {
  const t = calendarCopy.es;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 21);

  const filtered = events.filter((ev) => {
    const d = new Date(`${ev.date}T12:00:00`);
    return d >= today && d <= horizon;
  });

  const grouped = groupByDate(filtered);
  const dates = [...grouped.keys()].sort();

  if (dates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/30 px-6 py-10 text-center text-sm text-slate-500">
        {t.compactEmpty}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{t.compactHint}</p>
      {dates.map((date) => {
        const days = daysUntilDate(date);
        const dayEvents = grouped.get(date) ?? [];
        return (
          <div key={date} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white">{date}</span>
              {days !== null && days >= 0 ? (
                <Badge tone={urgencyTone(days)}>{daysLeftLabel(days)}</Badge>
              ) : null}
              <Badge tone="neutral">{dayEvents.length}</Badge>
            </div>
            <ul className="space-y-2">
              {dayEvents.map((ev) => (
                <li
                  key={ev.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2",
                    draggingEventId === ev.id && "opacity-50",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <CalendarAgendaEventChip
                      ev={ev}
                      kindLabel={kindLabel(ev.kind)}
                      dragging={draggingEventId === ev.id}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      className="inline-block max-w-full"
                    />
                  </div>
                  <Link href={ev.href} className="shrink-0 text-xs text-indigo-200 hover:underline">
                    {t.compactOpen}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
