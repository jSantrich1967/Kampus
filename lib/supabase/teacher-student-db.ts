import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Conexión profesor ↔ estudiante (buzón de trabajos y avisos).
 * Privacidad: ninguna de las partes consulta el perfil de la otra; los
 * nombres viajan como instantánea en cada fila (display names).
 */

export type TeacherRef = {
  teacherUserId: string;
  displayName: string;
};

export type StudentWork = {
  id: string;
  studentUserId: string;
  teacherUserId: string;
  sessionId: string | null;
  course: string;
  title: string;
  body: string;
  studentDisplayName: string;
  teacherDisplayName: string;
  status: "sent" | "reviewed";
  feedback: string;
  grade: number | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type TeacherAnnouncement = {
  id: string;
  teacherUserId: string;
  sessionId: string | null;
  course: string;
  title: string;
  body: string;
  teacherDisplayName: string;
  createdAt: string;
};

type WorkRow = {
  id: string;
  student_user_id: string;
  teacher_user_id: string;
  session_id: string | null;
  course: string;
  title: string;
  body: string;
  student_display_name: string;
  teacher_display_name: string;
  status: "sent" | "reviewed";
  feedback: string;
  grade: number | string | null;
  created_at: string;
  reviewed_at: string | null;
};

type AnnouncementRow = {
  id: string;
  teacher_user_id: string;
  session_id: string | null;
  course: string;
  title: string;
  body: string;
  teacher_display_name: string;
  created_at: string;
};

function toStudentWork(r: WorkRow): StudentWork {
  return {
    id: String(r.id),
    studentUserId: String(r.student_user_id),
    teacherUserId: String(r.teacher_user_id),
    sessionId: r.session_id ? String(r.session_id) : null,
    course: r.course ?? "",
    title: r.title ?? "",
    body: r.body ?? "",
    studentDisplayName: r.student_display_name ?? "Estudiante",
    teacherDisplayName: r.teacher_display_name ?? "Profesor",
    status: r.status === "reviewed" ? "reviewed" : "sent",
    feedback: r.feedback ?? "",
    grade: r.grade === null || r.grade === undefined ? null : Number(r.grade),
    createdAt: String(r.created_at),
    reviewedAt: r.reviewed_at ? String(r.reviewed_at) : null,
  };
}

function toAnnouncement(r: AnnouncementRow): TeacherAnnouncement {
  return {
    id: String(r.id),
    teacherUserId: String(r.teacher_user_id),
    sessionId: r.session_id ? String(r.session_id) : null,
    course: r.course ?? "",
    title: r.title ?? "",
    body: r.body ?? "",
    teacherDisplayName: r.teacher_display_name ?? "Profesor",
    createdAt: String(r.created_at),
  };
}

/** Profesores del estudiante (sesiones donde está inscrito). */
export async function listMyTeachers(client: SupabaseClient): Promise<TeacherRef[]> {
  const { data, error } = await client.rpc("list_my_teachers");
  if (error) throw error;
  const rows = (data ?? []) as Array<{ teacher_user_id: string; display_name: string }>;
  return rows.map((r) => ({
    teacherUserId: String(r.teacher_user_id),
    displayName: r.display_name ?? "Profesor",
  }));
}

export async function createStudentWork(
  client: SupabaseClient,
  input: {
    teacherUserId: string;
    sessionId?: string | null;
    course: string;
    title: string;
    body: string;
    studentDisplayName: string;
    teacherDisplayName: string;
  },
): Promise<{ id: string }> {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const uid = userData.user?.id;
  if (!uid) throw new Error("auth");
  const { data, error } = await client
    .from("student_submissions")
    .insert({
      student_user_id: uid,
      teacher_user_id: input.teacherUserId,
      session_id: input.sessionId ?? null,
      course: input.course.trim(),
      title: input.title.trim(),
      body: input.body.trim(),
      student_display_name: input.studentDisplayName.trim() || "Estudiante",
      teacher_display_name: input.teacherDisplayName.trim() || "Profesor",
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: String((data as { id: string }).id) };
}

/** Trabajos del estudiante autenticado (con devoluciones). */
export async function listMyStudentWorks(client: SupabaseClient): Promise<StudentWork[]> {
  const { data, error } = await client
    .from("student_submissions")
    .select(
      "id,student_user_id,teacher_user_id,session_id,course,title,body,student_display_name,teacher_display_name,status,feedback,grade,created_at,reviewed_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as WorkRow[]).map(toStudentWork);
}

/** Buzón del profesor: trabajos que le enviaron sus estudiantes. */
export async function listWorksForReview(client: SupabaseClient): Promise<StudentWork[]> {
  const { data, error } = await client
    .from("student_submissions")
    .select(
      "id,student_user_id,teacher_user_id,session_id,course,title,body,student_display_name,teacher_display_name,status,feedback,grade,created_at,reviewed_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as WorkRow[]).map(toStudentWork);
}

/** El profesor corrige: devolución + nota (0–20) + marca como revisado. */
export async function reviewStudentWork(
  client: SupabaseClient,
  id: string,
  input: { feedback: string; grade: number | null },
): Promise<void> {
  const grade =
    input.grade === null || Number.isNaN(input.grade)
      ? null
      : Math.min(20, Math.max(0, Math.round(input.grade * 10) / 10));
  const { error } = await client
    .from("student_submissions")
    .update({
      feedback: input.feedback.trim(),
      grade,
      status: "reviewed",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

/** El profesor publica un aviso (a todos sus estudiantes o a una sesión). */
export async function createAnnouncement(
  client: SupabaseClient,
  input: {
    sessionId?: string | null;
    course: string;
    title: string;
    body: string;
    teacherDisplayName: string;
  },
): Promise<{ id: string }> {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const uid = userData.user?.id;
  if (!uid) throw new Error("auth");
  const { data, error } = await client
    .from("teacher_announcements")
    .insert({
      teacher_user_id: uid,
      session_id: input.sessionId ?? null,
      course: input.course.trim(),
      title: input.title.trim(),
      body: input.body.trim(),
      teacher_display_name: input.teacherDisplayName.trim() || "Profesor",
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: String((data as { id: string }).id) };
}

/** Avisos publicados por el profesor autenticado. */
export async function listMyAnnouncements(client: SupabaseClient): Promise<TeacherAnnouncement[]> {
  const { data, error } = await client
    .from("teacher_announcements")
    .select("id,teacher_user_id,session_id,course,title,body,teacher_display_name,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as AnnouncementRow[]).map(toAnnouncement);
}

/** Avisos que recibe el estudiante autenticado. */
export async function listStudentAnnouncements(client: SupabaseClient): Promise<TeacherAnnouncement[]> {
  const { data, error } = await client
    .from("teacher_announcements")
    .select("id,teacher_user_id,session_id,course,title,body,teacher_display_name,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as AnnouncementRow[]).map(toAnnouncement);
}

export async function deleteAnnouncement(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("teacher_announcements").delete().eq("id", id);
  if (error) throw error;
}

/** Sesiones del aula virtual creadas por el profesor (para dirigir avisos). */
export async function listMyTeachingSessions(
  client: SupabaseClient,
  userId: string,
): Promise<Array<{ id: string; course: string; startsAt: string }>> {
  const { data, error } = await client
    .from("virtual_class_sessions")
    .select("id,course,starts_at")
    .eq("created_by", userId)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; course: string; starts_at: string }>).map((r) => ({
    id: String(r.id),
    course: r.course ?? "",
    startsAt: String(r.starts_at),
  }));
}
