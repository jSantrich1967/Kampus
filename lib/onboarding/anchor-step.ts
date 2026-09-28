import type { UserRole } from "@/lib/schemas/profile";

export interface AnchorAnswers {
  displayName: string;
  university: string;
  major: string;
  semester: string;
}

/** Step 2 of onboarding. Student and learner share the study form. */
export function anchorCanContinue(role: UserRole, answers: AnchorAnswers): boolean {
  if (role === "teacher") return answers.major.trim().length > 1;
  if (role === "institution") return answers.university.trim().length > 1;
  return answers.major.trim().length > 1 && answers.semester.trim().length > 0;
}

/**
 * The profile still requires a program and a period.
 * Teacher and institution screens do not ask for a student career, so we store a role label.
 */
export function anchorForProfile(role: UserRole, answers: AnchorAnswers): Pick<AnchorAnswers, "university" | "major" | "semester"> {
  const university = answers.university.trim();
  const major = answers.major.trim();
  const semester = answers.semester.trim();
  if (role === "teacher") {
    return { university, major, semester: semester || "Docencia" };
  }
  if (role === "institution") {
    return { university, major: major || university, semester: semester || "Institución" };
  }
  return { university, major, semester };
}
