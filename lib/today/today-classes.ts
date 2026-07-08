import { subjectToPathSegment } from "@/lib/notebooks/paths";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import type { ClassScheduleRow } from "@/lib/schemas/class-schedule";

import { getClassTimeStatus, getWeekdayMon0, todayIso, type ClassTimeStatus } from "@/lib/today/today-date";

export type TodayClassSlot = {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  location: string;
  professorName: string;
  classDate: string;
  status: ClassTimeStatus;
  noteCount: number;
  hasNotesForToday: boolean;
  uploadHref: string;
  reviewHref: string;
};

function docsForClassToday(
  docs: NotebookDocumentRow[],
  scheduleId: string,
  classDate: string,
): NotebookDocumentRow[] {
  return docs.filter(
    (d) =>
      d.schedule_id === scheduleId &&
      (d.class_date ?? "").slice(0, 10) === classDate,
  );
}

export function buildTodayClassSlots(
  schedule: ClassScheduleRow[],
  docs: NotebookDocumentRow[],
  date: Date = new Date(),
): TodayClassSlot[] {
  const weekday = getWeekdayMon0(date);
  const classDate = todayIso(date);

  return schedule
    .filter((row) => row.weekday === weekday)
    .map((row) => {
      const classDocs = docsForClassToday(docs, row.id, classDate);
      const slug = subjectToPathSegment(row.subject);
      const uploadParams = new URLSearchParams({
        subject: row.subject,
        topic: "Clase",
        scheduleId: row.id,
        classDate,
        expand: "1",
      });

      return {
        id: row.id,
        subject: row.subject,
        startTime: row.startTime,
        endTime: row.endTime,
        location: row.location,
        professorName: row.professorName,
        classDate,
        status: getClassTimeStatus(row.startTime, row.endTime, date),
        noteCount: classDocs.length,
        hasNotesForToday: classDocs.length > 0,
        uploadHref: `/study/library?${uploadParams.toString()}`,
        reviewHref: `/study/notebook/${slug}`,
      };
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}
