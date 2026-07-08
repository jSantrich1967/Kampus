/** Monday=0 … Sunday=6 (same convention as class schedule). */
export function getWeekdayMon0(date: Date = new Date()): number {
  return (date.getDay() + 6) % 7;
}

export function todayIso(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export type ClassTimeStatus = "upcoming" | "now" | "past";

export function getClassTimeStatus(startTime: string, endTime: string, now: Date = new Date()): ClassTimeStatus {
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = parseHm(startTime);
  const end = parseHm(endTime);
  if (mins < start) return "upcoming";
  if (mins <= end) return "now";
  return "past";
}
