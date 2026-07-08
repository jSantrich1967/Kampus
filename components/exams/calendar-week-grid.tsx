"use client";

import { CalendarAgendaEventChip } from "@/components/exams/calendar-agenda-event-chip";
import { Badge } from "@/components/ui/badge";
import { AGENDA_DRAG_MIME } from "@/lib/calendar/agenda-drag";
import type { AgendaEvent } from "@/lib/calendar/agenda-events";
import type { WeekDayCell } from "@/lib/calendar/calendar-week";
import { calendarCopy } from "@/lib/i18n/calendar";
import { cn } from "@/lib/cn";

type ClassDocsMeta = {
  count: number;
  filenames: string[];
  topic?: string | null;
  lesson_point?: string | null;
};

type CalendarWeekGridProps = {
  days: WeekDayCell[];
  eventsOnDay: (iso: string) => AgendaEvent[];
  classDocsByKey: Record<string, ClassDocsMeta>;
  selectedClassKeys: string[];
  onToggleClassKey: (key: string) => void;
  materialHint: (mat: ClassDocsMeta | null) => string;
  kindLabel: (kind: AgendaEvent["kind"]) => string;
  dropTargetIso?: string | null;
  draggingEventId?: string | null;
  onDragStart?: (eventId: string) => void;
  onDragEnd?: () => void;
  onDayDragOver?: (iso: string) => void;
  onDayDragLeave?: () => void;
  onDayDrop?: (iso: string, eventId: string) => void;
};

export function CalendarWeekGrid({
  days,
  eventsOnDay,
  classDocsByKey,
  selectedClassKeys,
  onToggleClassKey,
  materialHint,
  kindLabel,
  dropTargetIso,
  draggingEventId,
  onDragStart,
  onDragEnd,
  onDayDragOver,
  onDayDragLeave,
  onDayDrop,
}: CalendarWeekGridProps) {
  const t = calendarCopy.es;

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
      <div className="grid min-w-[640px] grid-cols-7 gap-px border-b border-white/10 bg-white/10 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {days.map((d) => (
          <div key={d.iso} className="bg-slate-950/90 px-1 py-2">
            {d.weekdayLabel}
          </div>
        ))}
      </div>
      <div className="grid min-w-[640px] grid-cols-7 gap-px bg-white/10">
        {days.map((d) => {
          const dayEvents = eventsOnDay(d.iso);
          const isDropTarget = dropTargetIso === d.iso;
          return (
            <div
              key={d.iso}
              className={cn(
                "min-h-[8rem] bg-slate-950/80 p-2 text-left transition",
                d.isToday && "ring-1 ring-inset ring-indigo-400/40",
                isDropTarget && "bg-indigo-500/10 ring-2 ring-inset ring-indigo-400/50",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                onDayDragOver?.(d.iso);
              }}
              onDragLeave={() => onDayDragLeave?.()}
              onDrop={(e) => {
                e.preventDefault();
                const eventId = e.dataTransfer.getData(AGENDA_DRAG_MIME);
                if (eventId) onDayDrop?.(d.iso, eventId);
                onDayDragLeave?.();
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={cn("text-xs font-semibold", d.isToday ? "text-indigo-200" : "text-slate-400")}>
                  {d.dayNum}
                </span>
                {dayEvents.length > 0 ? (
                  <Badge tone="neutral" className="text-[10px]">
                    {dayEvents.length}
                  </Badge>
                ) : null}
              </div>
              {isDropTarget ? (
                <p className="mt-1 text-[10px] text-indigo-200">{t.dropHint}</p>
              ) : null}
              <div className="mt-1.5 space-y-1">
                {dayEvents.map((ev) => {
                  const isClass = ev.kind === "class" && ev.id.startsWith("class:");
                  const key = isClass ? `${ev.id.split(":")[1]}:${ev.date}` : "";
                  const selected = Boolean(key) && selectedClassKeys.includes(key);
                  const mat = key ? classDocsByKey[key] : null;
                  const hint = materialHint(mat);
                  return (
                    <CalendarAgendaEventChip
                      key={ev.id}
                      ev={ev}
                      hint={hint}
                      kindLabel={kindLabel(ev.kind)}
                      selected={selected}
                      dragging={draggingEventId === ev.id}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      onClassClick={(e) => {
                        if (e.metaKey || e.ctrlKey) return;
                        e.preventDefault();
                        onToggleClassKey(key);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
