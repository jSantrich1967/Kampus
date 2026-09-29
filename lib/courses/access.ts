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
