import type { UserProfile } from "@/lib/schemas/profile";

function dateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Perfil listo para explorar la app sin registrarse ni completar onboarding. */
export function buildDemoProfile(): UserProfile {
  return {
    onboardingFinished: true,
    plan: "free",
    role: "student",
    displayName: "Alex",
    university: "Centro Demo",
    major: "Ingeniería Informática",
    semester: "4º",
    subjects: ["Cálculo", "Programación", "Bases de datos", "Estadística"],
    upcomingExams: [
      { subject: "Cálculo", date: dateInDays(5) },
      { subject: "Programación", date: dateInDays(12) },
      { subject: "Bases de datos", date: dateInDays(21) },
    ],
    weakTopics: ["Integrales", "Recursión", "Normalización"],
    missedClassesApprox: 2,
    weeklyAvailabilityHours: 15,
    preferredLanguage: "es",
    interestedInCommunity: true,
    learningGoals: "Aprobar el período manteniendo un ritmo de estudio sostenible.",
    streakDays: 3,
    lastActiveDate: new Date().toISOString().slice(0, 10),
  };
}

/** Same as demo profile but with Premium plan for full kits and pass-mode simulator. */
export function buildPremiumDemoProfile(): UserProfile {
  return { ...buildDemoProfile(), plan: "premium" };
}
