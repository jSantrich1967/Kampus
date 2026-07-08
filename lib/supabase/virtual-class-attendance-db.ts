import type { SupabaseClient } from "@supabase/supabase-js";

export type VirtualClassAttendanceRow = {
  sessionId: string;
  course: string;
  professorName: string;
  startsAt: string;
  enrolledCount: number;
  attendedCount: number;
};

export async function markVirtualClassAttendance(
  client: SupabaseClient,
  sessionId: string,
): Promise<void> {
  const { error } = await client.rpc("mark_virtual_class_attendance", {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

export async function fetchInstitutionVirtualAttendanceSummary(
  client: SupabaseClient,
): Promise<VirtualClassAttendanceRow[]> {
  const { data, error } = await client.rpc("list_institution_virtual_attendance_summary");
  if (error) throw error;
  if (!Array.isArray(data)) return [];

  return (data as Record<string, unknown>[]).map((row) => ({
    sessionId: String(row.sessionId ?? row.session_id ?? ""),
    course: String(row.course ?? ""),
    professorName: String(row.professorName ?? row.professor_name ?? ""),
    startsAt: String(row.startsAt ?? row.starts_at ?? ""),
    enrolledCount: Number(row.enrolledCount ?? row.enrolled_count ?? 0),
    attendedCount: Number(row.attendedCount ?? row.attended_count ?? 0),
  }));
}
