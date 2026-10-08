import { localIsoDate } from "@/lib/calendar/local-iso-date";
import type { UserProfile } from "@/lib/schemas/profile";

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function sameSubject(a: string, b: string): boolean {
  return normalize(a) !== "" && normalize(a) === normalize(b);
}

/**
 * Materia que deben precargar Tutor IA, Modo examen y herramientas afines.
 *
 * Antes cada pantalla tomaba `subjects[0]` en el primer render (o un valor
 * guardado de otra sesión), así que una sincronización posterior del perfil
 * —por ejemplo, al pasar a Finanzas— no se reflejaba y seguía apareciendo
 * Cálculo. El orden es: materia que coincide con la carrera, examen futuro
 * más cercano y, por último, la primera materia del perfil.
 */
export function preferredProfileSubject(profile: UserProfile, today = new Date()): string {
  const subjects = [...new Set(profile.subjects.map((s) => s.trim()).filter(Boolean))];

  const fromMajor = subjects.find((subject) => sameSubject(subject, profile.major));
  if (fromMajor) return fromMajor;

  const todayIso = localIsoDate(today);
  const nearest = [...(profile.upcomingExams ?? [])]
    .map((exam) => ({ subject: exam.subject.trim(), date: exam.date.trim().slice(0, 10) }))
    .filter((exam) => exam.subject && exam.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (nearest) return nearest.subject;

  return subjects[0] ?? "";
}

export function isProfileSubject(profile: UserProfile, subject: string): boolean {
  return profile.subjects.some((candidate) => sameSubject(candidate, subject));
}
