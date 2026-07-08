export function buildDiaryHref(opts?: { date?: string; entryId?: string }): string {
  const qs = new URLSearchParams();
  if (opts?.date?.trim()) qs.set("date", opts.date.trim());
  if (opts?.entryId?.trim()) qs.set("entry", opts.entryId.trim());
  const q = qs.toString();
  return q ? `/wellbeing/diary?${q}` : "/wellbeing/diary";
}

export function buildDiaryTodayHref(entryId?: string): string {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return buildDiaryHref({ date: iso, entryId });
}
