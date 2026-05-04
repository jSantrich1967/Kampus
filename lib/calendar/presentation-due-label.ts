/** Human label for calendar due date (YYYY-MM-DD) in presentation deck picker. */
export function presentationDueBadgeLabel(dueIso: string | undefined | null, es: boolean, now = new Date()): string {
  const d = (dueIso ?? "").trim();
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return es ? "sin fecha" : "no date";
  }
  const [y, m, day] = d.split("-").map(Number);
  const due = new Date(y!, m! - 1, day!);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) {
    const n = -diffDays;
    return es ? `hace ${n} día${n === 1 ? "" : "s"}` : `${n}d ago`;
  }
  if (diffDays === 0) return es ? "hoy" : "today";
  if (diffDays === 1) return es ? "mañana" : "tomorrow";
  return es ? `en ${diffDays} días` : `in ${diffDays}d`;
}
