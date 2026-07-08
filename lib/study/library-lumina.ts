export type SubjectCategoryTone = "purple" | "orange" | "blue" | "teal";

export function subjectCategory(subject: string): { label: string; tone: SubjectCategoryTone } {
  const s = subject.toLowerCase();
  if (/calc|mat|fís|fis|quím|quim|bio|estad|program|inform|dato|ingen|lab/i.test(s)) {
    return { label: "Ciencias", tone: "purple" };
  }
  if (/hist|liter|filos|arte|derech|econom|social|comunic/i.test(s)) {
    return { label: "Humanidades", tone: "orange" };
  }
  if (/idioma|ingl|franc|alem|lengua/i.test(s)) {
    return { label: "Idiomas", tone: "teal" };
  }
  return { label: "General", tone: "blue" };
}

const CATEGORY_BADGE: Record<SubjectCategoryTone, string> = {
  purple: "bg-purple-500/10 text-purple-400",
  orange: "bg-orange-500/10 text-orange-400",
  blue: "bg-sky-500/10 text-sky-400",
  teal: "bg-teal-500/10 text-teal-400",
};

export function categoryBadgeClass(tone: SubjectCategoryTone): string {
  return CATEGORY_BADGE[tone];
}

export function formatRelativeEdit(iso: string | undefined): string {
  const short = formatShortEdit(iso);
  if (short === "—") return "Sin ediciones recientes";
  return `Editado ${short}`;
}

/** Stitch-style: "hace 2h", "hace 1d" */
export function formatShortEdit(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function cloudUsagePercent(documentCount: number, cap = 40): number {
  return Math.min(100, Math.round((documentCount / cap) * 100));
}
