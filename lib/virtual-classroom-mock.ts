import type { UserProfile } from "@/lib/schemas/profile";

export type VirtualClassSession = {
  id: string;
  /** Nombre del curso / materia. */
  course: string;
  professor: string;
  topic: string;
  capacity: number;
  enrolled: number;
  /** ISO string for display. */
  startsAt: string;
  /** Sala o enlace corto (demo). */
  roomLabel: string;
  /** Enlace externo Meet/Zoom (demo). */
  joinUrl: string | null;
  /** Solo YouTube para demo de embed seguro. */
  embedVideoUrl: string | null;
};

function heatSeat(seed: number, cap: number) {
  const enrolled = Math.min(cap - 1, 8 + (seed % Math.max(1, cap - 3)));
  return enrolled;
}

/**
 * Demo data until hay backend (horario real, videoconferencia institucional, etc.).
 */
export function buildVirtualClassSessions(profile: UserProfile): VirtualClassSession[] {
  const subjects = profile.subjects.length ? profile.subjects : ["Matemáticas I", "Econometría"];
  const topics =
    profile.weakTopics.length > 0
      ? profile.weakTopics
      : ["Regresión lineal simple", "Intervalos de confianza", "Pruebas de hipótesis"];

  const profs = ["Dra. Martínez", "Prof. Ruiz", "Dr. Gómez", "Dra. López"];

  return subjects.slice(0, 4).map((course, idx) => {
    const cap = 28 + (idx % 5) * 4;
    const enrolled = heatSeat(idx + course.length, cap);
    const topic = topics[idx % topics.length] ?? "Tema del programa";
    return {
      id: `vc-${idx}-${course.replace(/\s+/g, "-").toLowerCase()}`,
      course,
      professor: profs[idx % profs.length] ?? "Profesor",
      topic,
      capacity: cap,
      enrolled,
      startsAt: new Date(Date.now() + (idx + 1) * 36e5).toISOString(),
      roomLabel: idx % 2 === 0 ? "Meet · Aula 204" : "Zoom · Sala B",
      joinUrl: idx % 2 === 0 ? "https://meet.google.com/landing" : "https://zoom.us/",
      embedVideoUrl: idx === 0 ? "https://www.youtube.com/embed/dQw4w9WgXcQ" : null,
    };
  });
}
