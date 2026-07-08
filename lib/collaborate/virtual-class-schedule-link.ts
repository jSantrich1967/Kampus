/** Build ISO timestamptz from local calendar date + HH:MM schedule time. */
export function startsAtFromScheduleSlot(classDate: string, startTime: string): string {
  const [y, m, d] = classDate.split("-").map((x) => Number(x));
  const [hh, mm] = startTime.split(":").map((x) => Number(x));
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

export function endsAtFromScheduleSlot(classDate: string, endTime: string): string {
  const [y, m, d] = classDate.split("-").map((x) => Number(x));
  const [hh, mm] = endTime.split(":").map((x) => Number(x));
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

export function buildVirtualClassFromScheduleHref(scheduleId: string, classDate: string): string {
  const qs = new URLSearchParams();
  qs.set("scheduleId", scheduleId);
  qs.set("classDate", classDate);
  return `/collaborate/aula-virtual?${qs.toString()}`;
}

export function buildCalendarHrefForScheduleLink(scheduleRowId: string, classDate: string): string {
  return `/exams/calendar?scheduleId=${encodeURIComponent(scheduleRowId)}&classDate=${encodeURIComponent(classDate)}`;
}
