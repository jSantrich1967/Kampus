/** Old builds used one switch for every account on this computer. Never copy it into a user. */
const LEGACY_OPT_IN_KEY = "kampus.wellbeing.institutionOptIn.v1";

let ownerId: string | null = null;

export function setInstitutionOptInOwner(userId: string | null) {
  ownerId = userId;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

function optInKey(userId: string | null): string {
  return userId
    ? `kampus.wellbeing.institutionOptIn.v1.${userId}`
    : "kampus.wellbeing.institutionOptIn.v1.anonymous";
}

export function loadInstitutionWellbeingOptIn(userId?: string | null): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(optInKey(resolveOwner(userId))) === "1";
}

export function saveInstitutionWellbeingOptIn(value: boolean, userId?: string | null): void {
  if (typeof window === "undefined") return;
  const key = optInKey(resolveOwner(userId));
  if (value) window.localStorage.setItem(key, "1");
  else window.localStorage.removeItem(key);
}

export function clearInstitutionOptIn(userId: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(optInKey(userId));
}

export function discardLegacyInstitutionOptIn(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_OPT_IN_KEY);
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
