/**
 * Sesiones del Aula virtual en modo demo (sin sesión de Supabase).
 * Se guardan en el localStorage de este dispositivo para que la demo se sienta viva:
 * el docente las crea y el estudiante las ve en el mismo dispositivo.
 */

import { readAccountItem, writeAccountItem } from "@/lib/storage/account-box";

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

const SESSIONS_BASE = "kampus.vcDemoSessions.v1";
const ENROLLED_BASE = "kampus.vcDemoEnrolled.v1";

function readJson(base: string, userId?: string | null): unknown {
  const raw = readAccountItem(base, userId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function writeJson(base: string, value: unknown, userId?: string | null) {
  writeAccountItem(base, JSON.stringify(value), userId);
}

function isDemoVcSession(value: unknown): value is DemoVcSession {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.course === "string" && typeof v.startsAt === "string";
}

export function loadDemoVcSessions(userId?: string | null): DemoVcSession[] {
  const json = readJson(SESSIONS_BASE, userId);
  if (!Array.isArray(json)) return [];
  const enrolledIds = loadDemoVcEnrolledIds(userId);
  return json
    .filter(isDemoVcSession)
    .map((s) => ({ ...s, demo: true as const, isEnrolled: enrolledIds.includes(s.id) }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

type DemoVcSessionRow = Omit<DemoVcSession, "isEnrolled">;

function loadDemoVcSessionRows(userId?: string | null): DemoVcSessionRow[] {
  const json = readJson(SESSIONS_BASE, userId);
  if (!Array.isArray(json)) return [];
  return json.filter(isDemoVcSession).map((s) => ({ ...s, demo: true as const }));
}

export function saveDemoVcSession(
  session: Omit<DemoVcSessionRow, "demo" | "createdAt">,
  userId?: string | null,
): DemoVcSession {
  const row: DemoVcSessionRow = {
    ...session,
    demo: true,
    createdAt: new Date().toISOString(),
  };
  writeJson(SESSIONS_BASE, [...loadDemoVcSessionRows(userId), row], userId);
  return { ...row, isEnrolled: false };
}

export function loadDemoVcEnrolledIds(userId?: string | null): string[] {
  const json = readJson(ENROLLED_BASE, userId);
  return Array.isArray(json) ? json.filter((v): v is string => typeof v === "string") : [];
}

/** Alterna la inscripción local a una sesión demo. Devuelve el nuevo estado. */
export function toggleDemoVcEnrollment(sessionId: string, userId?: string | null): boolean {
  const ids = loadDemoVcEnrolledIds(userId);
  const next = ids.includes(sessionId) ? ids.filter((id) => id !== sessionId) : [...ids, sessionId];
  writeJson(ENROLLED_BASE, next, userId);
  return next.includes(sessionId);
}

/** ¿Este navegador está en modo demo? Cookie kampus_demo=1. */
export function isDemoModeClient(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim() === "kampus_demo=1");
}
