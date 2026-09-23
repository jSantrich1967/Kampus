/**
 * Sesiones del Aula virtual en modo demo (sin sesión de Supabase).
 * Se guardan en el localStorage de este dispositivo para que la demo se sienta viva:
 * el docente las crea y el estudiante las ve en el mismo dispositivo.
 */

export type DemoVcSession = {
  id: string;
  course: string;
  professor: string;
  topic: string;
  capacity: number;
  enrolled: number;
  isEnrolled: boolean;
  startsAt: string;
  roomLabel: string;
  joinUrl: string | null;
  embedVideoUrl: string | null;
  /** Siempre true: marca visual "demo" en la UI. */
  demo: true;
  createdAt: string;
};

const SESSIONS_KEY = "kampus.vcDemoSessions.v1";
const ENROLLED_KEY = "kampus.vcDemoEnrolled.v1";

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function isDemoVcSession(value: unknown): value is DemoVcSession {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.course === "string" && typeof v.startsAt === "string";
}

export function loadDemoVcSessions(): DemoVcSession[] {
  const json = readJson(SESSIONS_KEY);
  if (!Array.isArray(json)) return [];
  const enrolledIds = loadDemoVcEnrolledIds();
  return json
    .filter(isDemoVcSession)
    .map((s) => ({ ...s, demo: true as const, isEnrolled: enrolledIds.includes(s.id) }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

type DemoVcSessionRow = Omit<DemoVcSession, "isEnrolled">;

function loadDemoVcSessionRows(): DemoVcSessionRow[] {
  const json = readJson(SESSIONS_KEY);
  if (!Array.isArray(json)) return [];
  return json.filter(isDemoVcSession).map((s) => ({ ...s, demo: true as const }));
}

export function saveDemoVcSession(session: Omit<DemoVcSessionRow, "demo" | "createdAt">): DemoVcSession {
  const row: DemoVcSessionRow = {
    ...session,
    demo: true,
    createdAt: new Date().toISOString(),
  };
  writeJson(SESSIONS_KEY, [...loadDemoVcSessionRows(), row]);
  return { ...row, isEnrolled: false };
}

export function loadDemoVcEnrolledIds(): string[] {
  const json = readJson(ENROLLED_KEY);
  return Array.isArray(json) ? json.filter((v): v is string => typeof v === "string") : [];
}

/** Alterna la inscripción local a una sesión demo. Devuelve el nuevo estado. */
export function toggleDemoVcEnrollment(sessionId: string): boolean {
  const ids = loadDemoVcEnrolledIds();
  const next = ids.includes(sessionId) ? ids.filter((id) => id !== sessionId) : [...ids, sessionId];
  writeJson(ENROLLED_KEY, next);
  return next.includes(sessionId);
}

/** ¿Este navegador está en modo demo? Cookie kampus_demo=1. */
export function isDemoModeClient(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim() === "kampus_demo=1");
}
