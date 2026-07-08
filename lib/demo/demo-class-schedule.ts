import type { ClassScheduleRow } from "@/lib/schemas/class-schedule";
import { getWeekdayMon0 } from "@/lib/today/today-date";

function uid() {
  return `demo_cls_${Math.random().toString(36).slice(2, 8)}`;
}

/** Horario de ejemplo para la demo: clases hoy + otra en la semana. */
export function buildDemoClassScheduleRows(subjects: string[]): ClassScheduleRow[] {
  const today = getWeekdayMon0();
  const pick = (i: number) => subjects[i]?.trim() || subjects[0]?.trim() || "General";

  return [
    {
      id: uid(),
      weekday: today,
      startTime: "10:00",
      endTime: "11:30",
      subject: pick(0),
      location: "Aula 3.1",
      professorName: "Prof. García",
    },
    {
      id: uid(),
      weekday: today,
      startTime: "16:00",
      endTime: "18:00",
      subject: pick(2),
      location: "Laboratorio B",
      professorName: "Prof. López",
    },
    {
      id: uid(),
      weekday: (today + 1) % 7,
      startTime: "09:00",
      endTime: "10:30",
      subject: pick(1),
      location: "Aula 2.2",
      professorName: "Prof. Ruiz",
    },
  ];
}
