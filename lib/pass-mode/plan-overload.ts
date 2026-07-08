import type { UserProfile } from "@/lib/schemas/profile";

/** True when weekly minutes cannot comfortably cover all subjects. */
export function isPlanOverloaded(profile: UserProfile): boolean {
  return profile.weeklyAvailabilityHours * 60 < profile.subjects.length * 90;
}

export function overloadReason(profile: UserProfile): string | null {
  if (!isPlanOverloaded(profile)) return null;
  const available = Math.round((profile.weeklyAvailabilityHours * 60) / 7);
  return `Tienes ${profile.subjects.length} materias pero ~${available} min/día disponibles. Recomendamos el plan mínimo de 15 min.`;
}
