"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import { AGENDA_DRAG_MIME, isAgendaEventDraggable } from "@/lib/calendar/agenda-drag";
import type { AgendaEvent } from "@/lib/calendar/agenda-events";
import { cn } from "@/lib/cn";

type CalendarAgendaEventChipProps = {
  ev: AgendaEvent;
  className?: string;
  hint?: string;
  kindLabel: string;
  selected?: boolean;
  onClassClick?: (e: MouseEvent) => void;
  onDragStart?: (eventId: string) => void;
  onDragEnd?: () => void;
  dragging?: boolean;
};

export function CalendarAgendaEventChip({
  ev,
  className,
  hint,
  kindLabel,
  selected = false,
  onClassClick,
  onDragStart,
  onDragEnd,
  dragging = false,
}: CalendarAgendaEventChipProps) {
  const draggable = isAgendaEventDraggable(ev);
  const isClass = ev.kind === "class";

  const chipClass = cn(
    "block rounded px-1.5 py-1 text-[11px] leading-tight ring-1 transition hover:bg-white/5",
    ev.kind === "exam" && "bg-emerald-500/15 text-emerald-100 ring-emerald-400/20",
    ev.kind === "presentation" && "bg-indigo-500/15 text-indigo-100 ring-indigo-400/25",
    ev.kind === "class" && !selected && "bg-white/5 text-slate-200 ring-white/10",
    ev.kind === "class" && selected && "bg-amber-500/20 text-amber-100 ring-amber-400/30",
    ev.kind === "work" && "bg-slate-400/10 text-slate-200 ring-slate-400/20",
    ev.kind === "virtualClass" && "bg-teal-500/15 text-teal-100 ring-teal-400/25",
    draggable && "cursor-grab active:cursor-grabbing",
    dragging && "opacity-40",
    className,
  );

  const title = `${kindLabel}: ${ev.title}${ev.note ? ` · ${ev.note}` : ""}${draggable ? " · Arrastra a otro día" : ""}`;

  if (isClass && onClassClick) {
    return (
      <Link
        href={ev.href}
        draggable={false}
        className={chipClass}
        title={title}
        onClick={onClassClick}
      >
        <ChipBody title={ev.title} hint={hint} />
      </Link>
    );
  }

  return (
    <Link
      href={ev.href}
      draggable={draggable}
      className={chipClass}
      title={title}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData(AGENDA_DRAG_MIME, ev.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(ev.id);
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={(e) => {
        if (draggable && e.defaultPrevented) e.preventDefault();
      }}
    >
      <ChipBody title={ev.title} hint={hint} />
    </Link>
  );
}

function ChipBody({ title, hint }: { title: string; hint?: string }) {
  return (
    <>
      <div className="font-medium">{title}</div>
      {hint ? <div className="mt-0.5 truncate text-[10px] text-slate-400">{hint}</div> : null}
    </>
  );
}
