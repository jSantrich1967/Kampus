export type CourseStatus = "active" | "archived";
export type EnrollmentStatus = "active" | "suspended";

/**
 * The teacher always sees the course. A student sees it only with an active seat
 * on a course that is still open. The screen role is not an input.
 */
export function courseVisibleTo(input: {
  viewerId: string;
  teacherId: string;
  courseStatus: CourseStatus;
  enrollmentStatus: EnrollmentStatus | null;
}): boolean {
  if (input.viewerId === input.teacherId) return true;
  return input.courseStatus === "active" && input.enrollmentStatus === "active";
}

/**
 * What the student may see on Mis cursos. A suspended seat stays as a notice.
 * An archived course stays off the list. This is not permission to open the course.
 */
export function studentCourseListStatus(input: {
  courseStatus: CourseStatus;
  enrollmentStatus: EnrollmentStatus;
}): EnrollmentStatus | null {
  if (input.courseStatus !== "active") return null;
  return input.enrollmentStatus;
}

/**
 * A course with no institution belongs to the teacher. An institution course
 * requires an active staff seat in that institution. A student seat is not enough.
 */
export function canAttachCourseToOrganization(input: {
  organizationId: string | null;
  membershipRole: "owner" | "admin" | "teacher" | "student" | null;
  membershipStatus: "active" | "suspended" | null;
  organizationStatus: "active" | "suspended" | null;
}): boolean {
  if (!input.organizationId) return true;
  if (input.organizationStatus !== "active" || input.membershipStatus !== "active") return false;
  return (
    input.membershipRole === "owner" ||
    input.membershipRole === "admin" ||
    input.membershipRole === "teacher"
  );
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Turns a typed class code into the stored shape. Empty when it cannot be a code. */
export function normalizeCourseCode(input: string): string | null {
  const code = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 8) return null;
  if ([...code].some((character) => !CODE_ALPHABET.includes(character))) return null;
  return code;
}

/**
 * A matching active course enrolls the student. An unknown code, an archived
 * course, a suspended seat, or the teacher of that course does not.
 */
export function joinCourseDecision(input: {
  codeMatches: boolean;
  courseStatus: CourseStatus;
  viewerIsTeacher: boolean;
  enrollmentStatus: EnrollmentStatus | null;
}): "join" | "already" | "rejected" {
  if (!input.codeMatches || input.courseStatus !== "active") return "rejected";
  if (input.viewerIsTeacher || input.enrollmentStatus === "suspended") return "rejected";
  if (input.enrollmentStatus === "active") return "already";
  return "join";
}

/** The name saved on the seat. An empty profile becomes Estudiante. */
export function enrollmentDisplayName(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed.slice(0, 80) : "Estudiante";
}
