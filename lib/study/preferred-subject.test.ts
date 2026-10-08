import { describe, expect, it } from "vitest";

import { defaultProfile, type UserProfile } from "@/lib/schemas/profile";
import { preferredProfileSubject } from "@/lib/study/preferred-subject";

function profile(partial: Partial<UserProfile>): UserProfile {
  return {
    ...defaultProfile,
    major: "Administración",
    semester: "5",
    subjects: ["Cálculo"],
    learningGoals: "Aprobar",
    ...partial,
  };
}

describe("preferredProfileSubject", () => {
  it("prioriza la materia que coincide con la carrera activa", () => {
    const result = preferredProfileSubject(
      profile({
        major: "Finanzas",
        subjects: ["Cálculo", "Finanzas"],
        upcomingExams: [{ subject: "Cálculo", date: "2026-10-09" }],
      }),
      new Date("2026-10-08T12:00:00Z"),
    );
    expect(result).toBe("Finanzas");
  });

  it("usa el examen futuro más cercano si la carrera no es una materia", () => {
    const result = preferredProfileSubject(
      profile({
        subjects: ["Cálculo", "Estadística"],
        upcomingExams: [
          { subject: "Estadística", date: "2026-10-20" },
          { subject: "Cálculo", date: "2026-10-10" },
        ],
      }),
      new Date("2026-10-08T12:00:00Z"),
    );
    expect(result).toBe("Cálculo");
  });

  it("ignora exámenes pasados y cae a la primera materia", () => {
    const result = preferredProfileSubject(
      profile({
        subjects: ["Finanzas"],
        upcomingExams: [{ subject: "Cálculo", date: "2026-10-01" }],
      }),
      new Date("2026-10-08T12:00:00Z"),
    );
    expect(result).toBe("Finanzas");
  });
});
