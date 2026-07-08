const OPT_IN_KEY = "kampus.wellbeing.institutionOptIn.v1";

export function loadInstitutionWellbeingOptIn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(OPT_IN_KEY) === "1";
}

export function saveInstitutionWellbeingOptIn(value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(OPT_IN_KEY, "1");
  else window.localStorage.removeItem(OPT_IN_KEY);
}

export function normalizeInstitutionKey(university: string): string {
  return university
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function currentWeekStartIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
