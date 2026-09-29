import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canAttachCourseToOrganization,
  enrollmentDisplayName,
  normalizeCourseCode,
  studentCourseListStatus,
} from "@/lib/courses/access";
import { listMyOrganizations } from "@/lib/supabase/organizations-db";

export type TaughtCourse = {
  id: string;
  name: string;
  status: "active" | "archived";
  organizationId: string | null;
  organizationName: string | null;
  enrolledCount: number;
  joinCode: string;
};

export type EnrolledCourse = {
  id: string;
  name: string;
  organizationName: string | null;
  seatStatus: "active" | "suspended";
};

type CourseRow = {
  id: string;
  name: string;
  status: string;
  join_code: string | null;
  organization_id: string | null;
  organizations: { name: string } | { name: string }[] | null;
  course_enrollments: { count: number }[] | null;
};

function missingCoursesTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return error.code === "42P01" || error.code === "PGRST205" || /courses|course_enrollments/.test(message);
}

function organizationName(value: CourseRow["organizations"]): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  return row?.name ?? null;
}

/** Courses this account teaches. An empty list when the table is not applied yet. */
export async function listTaughtCourses(client: SupabaseClient, userId: string): Promise<TaughtCourse[]> {
  const { data, error } = await client
    .from("courses")
    .select("id, name, status, join_code, organization_id, organizations(name), course_enrollments(count)")
    .eq("teacher_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    if (missingCoursesTable(error)) return [];
    throw error;
  }

  return ((data ?? []) as unknown as CourseRow[]).map((row) => ({
    id: String(row.id),
    name: row.name,
    status: row.status === "archived" ? "archived" : "active",
    organizationId: row.organization_id,
    organizationName: organizationName(row.organizations),
    enrolledCount: row.course_enrollments?.[0]?.count ?? 0,
    joinCode: row.join_code ?? "",
  }));
}

export async function createTaughtCourse(
  client: SupabaseClient,
  input: { name: string; organizationId: string | null },
): Promise<{ id: string }> {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("auth");

  const memberships = input.organizationId ? await listMyOrganizations(client, userId) : [];
  const membership = memberships.find((item) => item.organizationId === input.organizationId) ?? null;
  const allowed = canAttachCourseToOrganization({
    organizationId: input.organizationId,
    membershipRole: membership?.role ?? null,
    membershipStatus: membership?.memberStatus ?? null,
    organizationStatus: membership?.organizationStatus ?? null,
  });
  if (!allowed) throw new Error("organization");

  const { data, error } = await client
    .from("courses")
    .insert({
      teacher_user_id: userId,
      organization_id: input.organizationId,
      name: input.name.trim(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: String((data as { id: string }).id) };
}

type EnrollmentRow = {
  status: string;
  courses:
    | {
        id: string;
        name: string;
        status: string;
        organizations: { name: string } | { name: string }[] | null;
      }
    | {
        id: string;
        name: string;
        status: string;
        organizations: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

type EnrolledCourseRpcRow = {
  course_id: string;
  course_name: string;
  organization_name: string | null;
  course_status: string;
  seat_status: string;
};

function missingEnrollmentNotice(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return error.code === "PGRST202" || /list_my_enrolled_courses/.test(message);
}

function toEnrolledCourse(input: {
  id: string;
  name: string;
  organizationName: string | null;
  courseStatus: string;
  seatStatus: string;
}): EnrolledCourse | null {
  const seatStatus = studentCourseListStatus({
    courseStatus: input.courseStatus === "archived" ? "archived" : "active",
    enrollmentStatus: input.seatStatus === "suspended" ? "suspended" : "active",
  });
  if (!seatStatus) return null;
  return {
    id: input.id,
    name: input.name,
    organizationName: input.organizationName,
    seatStatus,
  };
}

/** The student's own seats. A suspended seat stays visible as a notice. */
export async function listEnrolledCourses(client: SupabaseClient, userId: string): Promise<EnrolledCourse[]> {
  const { data, error } = await client.rpc("list_my_enrolled_courses");
  if (!error) {
    return ((data ?? []) as EnrolledCourseRpcRow[])
      .map((row) =>
        toEnrolledCourse({
          id: String(row.course_id),
          name: row.course_name,
          organizationName: row.organization_name,
          courseStatus: row.course_status,
          seatStatus: row.seat_status,
        }),
      )
      .filter((course): course is EnrolledCourse => course !== null)
      .sort((left, right) => left.name.localeCompare(right.name));
  }
  if (!missingEnrollmentNotice(error)) {
    if (missingCoursesTable(error)) return [];
    throw error;
  }

  const fallback = await client
    .from("course_enrollments")
    .select("status, courses(id, name, status, organizations(name))")
    .eq("user_id", userId)
    .eq("status", "active");

  if (fallback.error) {
    if (missingCoursesTable(fallback.error)) return [];
    throw fallback.error;
  }

  const courses: EnrolledCourse[] = [];
  for (const row of (fallback.data ?? []) as unknown as EnrollmentRow[]) {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    if (!course) continue;
    const enrolled = toEnrolledCourse({
      id: String(course.id),
      name: course.name,
      organizationName: organizationName(course.organizations),
      courseStatus: course.status,
      seatStatus: row.status,
    });
    if (enrolled) courses.push(enrolled);
  }
  return courses;
}

export async function joinCourseByCode(
  client: SupabaseClient,
  code: string,
): Promise<{ status: "joined" | "already"; name: string } | { status: "invalid" | "suspended" | "teacher" }> {
  const normalized = normalizeCourseCode(code);
  if (!normalized) return { status: "invalid" };

  const { data, error } = await client.rpc("join_course_by_code", { p_code: normalized });
  if (error) {
    const message = error.message ?? "";
    if (message.includes("enrollment suspended")) return { status: "suspended" };
    if (message.includes("teacher already owns")) return { status: "teacher" };
    if (missingCoursesTable(error)) return { status: "invalid" };
    return { status: "invalid" };
  }

  const row = (Array.isArray(data) ? data[0] : data) as { course_name?: string; already?: boolean } | null;
  return {
    status: row?.already ? "already" : "joined",
    name: row?.course_name ?? "",
  };
}

export type CourseSeat = {
  courseId: string;
  userId: string;
  displayName: string;
  status: "active" | "suspended";
};

type SeatRow = {
  course_id: string;
  user_id: string;
  display_name: string | null;
  status: string;
};

/** Names on the courses this account teaches. Students do not see one another. */
export async function listCourseSeats(client: SupabaseClient, courseIds: string[]): Promise<CourseSeat[]> {
  if (courseIds.length === 0) return [];
  const { data, error } = await client
    .from("course_enrollments")
    .select("course_id, user_id, display_name, status")
    .in("course_id", courseIds);

  if (error) {
    if (missingCoursesTable(error)) return [];
    throw error;
  }

  return ((data ?? []) as SeatRow[]).map((row) => ({
    courseId: String(row.course_id),
    userId: String(row.user_id),
    displayName: enrollmentDisplayName(row.display_name),
    status: row.status === "suspended" ? "suspended" : "active",
  }));
}

export async function setCourseSeatStatus(
  client: SupabaseClient,
  courseId: string,
  userId: string,
  status: "active" | "suspended",
): Promise<void> {
  const { error } = await client
    .from("course_enrollments")
    .update({ status })
    .eq("course_id", courseId)
    .eq("user_id", userId);
  if (error) throw error;
}
