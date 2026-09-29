import type { SupabaseClient } from "@supabase/supabase-js";

import { canAttachCourseToOrganization } from "@/lib/courses/access";
import { listMyOrganizations } from "@/lib/supabase/organizations-db";

export type TaughtCourse = {
  id: string;
  name: string;
  status: "active" | "archived";
  organizationId: string | null;
  organizationName: string | null;
  enrolledCount: number;
};

type CourseRow = {
  id: string;
  name: string;
  status: string;
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
    .select("id, name, status, organization_id, organizations(name), course_enrollments(count)")
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
