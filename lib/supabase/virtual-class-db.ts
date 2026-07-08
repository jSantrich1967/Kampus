import type { SupabaseClient } from "@supabase/supabase-js";

import type { VirtualClassAgendaSlice } from "@/lib/calendar/virtual-class-agenda-events";

export type EnrollVirtualClassResult = {
  ok: boolean;
  error?: string;
  alreadyEnrolled?: boolean;
};

export type VirtualClassRosterRow = {
  studentUserId: string;
  displayName: string;
  joinedAt: string;
};

export type VirtualClassSessionExport = {
  id: string;
  course: string;
  topic: string;
  startsAt: string;
  endsAt: string | null;
  joinUrl: string | null;
};

export type CreateVirtualClassInput = {
  course: string;
  professorName: string;
  topic?: string;
  roomLabel?: string;
  capacity?: number;
  startsAt: string;
  endsAt?: string | null;
  openEnrollment?: boolean;
  joinUrl?: string | null;
  embedVideoUrl?: string | null;
  presentationUrl?: string | null;
  scheduleRowId?: string | null;
  classDate?: string | null;
  recordingUrl?: string | null;
};

export async function createVirtualClassSession(
  client: SupabaseClient,
  userId: string,
  input: CreateVirtualClassInput,
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("virtual_class_sessions")
    .insert({
      created_by: userId,
      course: input.course.trim(),
      professor_name: input.professorName.trim(),
      topic: input.topic?.trim() ?? "",
      room_label: input.roomLabel?.trim() ?? "",
      capacity: input.capacity ?? 30,
      starts_at: input.startsAt,
      ends_at: input.endsAt ?? null,
      open_enrollment: input.openEnrollment ?? true,
      join_url: input.joinUrl ?? null,
      embed_video_url: input.embedVideoUrl ?? null,
      presentation_url: input.presentationUrl ?? null,
      schedule_row_id: input.scheduleRowId ?? null,
      class_date: input.classDate ?? null,
      recording_url: input.recordingUrl ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: String((data as { id: string }).id) };
}

export async function fetchMyEnrolledVirtualClassSessionsForExport(
  client: SupabaseClient,
  userId: string,
): Promise<VirtualClassSessionExport[]> {
  const { data, error } = await client
    .from("virtual_class_roster")
    .select(
      "session_id, virtual_class_sessions(id,course,topic,starts_at,ends_at,join_url)",
    )
    .eq("student_user_id", userId);
  if (error) throw error;

  const out: VirtualClassSessionExport[] = [];
  for (const row of data ?? []) {
    const nested = (row as {
      virtual_class_sessions?: {
        id: string;
        course: string;
        topic?: string;
        starts_at: string;
        ends_at?: string | null;
        join_url?: string | null;
      } | {
        id: string;
        course: string;
        topic?: string;
        starts_at: string;
        ends_at?: string | null;
        join_url?: string | null;
      }[] | null;
    }).virtual_class_sessions;
    const session = Array.isArray(nested) ? nested[0] : nested;
    if (!session) continue;
    out.push({
      id: String(session.id),
      course: String(session.course),
      topic: String(session.topic ?? ""),
      startsAt: String(session.starts_at),
      endsAt: session.ends_at ? String(session.ends_at) : null,
      joinUrl: session.join_url ? String(session.join_url) : null,
    });
  }
  return out.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function fetchVirtualClassSessionsInRangeForExport(
  client: SupabaseClient,
  from: Date,
  to: Date,
): Promise<VirtualClassSessionExport[]> {
  const { data, error } = await client
    .from("virtual_class_sessions")
    .select("id,course,topic,starts_at,ends_at,join_url")
    .gte("starts_at", from.toISOString())
    .lte("starts_at", to.toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    course: String((row as { course: string }).course),
    topic: String((row as { topic?: string }).topic ?? ""),
    startsAt: String((row as { starts_at: string }).starts_at),
    endsAt: (row as { ends_at?: string | null }).ends_at ? String((row as { ends_at: string }).ends_at) : null,
    joinUrl: (row as { join_url?: string | null }).join_url ? String((row as { join_url: string }).join_url) : null,
  }));
}

export async function bootstrapVirtualClassDemo(
  client: SupabaseClient,
): Promise<{ ok: boolean; sessionId?: string; alreadyExists?: boolean; error?: string }> {
  const { data, error } = await client.rpc("bootstrap_virtual_class_demo");
  if (error) throw error;
  if (!data || typeof data !== "object") return { ok: false, error: "unknown" };
  const row = data as Record<string, unknown>;
  if (!row.ok) {
    return { ok: false, error: typeof row.error === "string" ? row.error : "unknown" };
  }
  return {
    ok: true,
    sessionId: String(row.session_id ?? ""),
    alreadyExists: Boolean(row.already_exists),
  };
}

export async function enrollVirtualClassSession(
  client: SupabaseClient,
  sessionId: string,
): Promise<EnrollVirtualClassResult> {
  const { data, error } = await client.rpc("enroll_virtual_class_session", {
    p_session_id: sessionId,
  });
  if (error) throw error;
  if (!data || typeof data !== "object") return { ok: false, error: "unknown" };
  const row = data as Record<string, unknown>;
  return {
    ok: Boolean(row.ok),
    error: typeof row.error === "string" ? row.error : undefined,
    alreadyEnrolled: Boolean(row.already_enrolled),
  };
}

export async function fetchMyVirtualClassSessionIds(client: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data, error } = await client
    .from("virtual_class_roster")
    .select("session_id")
    .eq("student_user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => String((r as { session_id: string }).session_id)));
}

export async function fetchVirtualClassSessionsInRange(
  client: SupabaseClient,
  from: Date,
  to: Date,
): Promise<VirtualClassAgendaSlice[]> {
  const { data, error } = await client
    .from("virtual_class_sessions")
    .select("id,course,topic,starts_at")
    .gte("starts_at", from.toISOString())
    .lte("starts_at", to.toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    course: String((row as { course: string }).course),
    topic: String((row as { topic?: string }).topic ?? ""),
    startsAt: String((row as { starts_at: string }).starts_at),
  }));
}

export async function fetchMyEnrolledVirtualClassSessions(
  client: SupabaseClient,
  userId: string,
): Promise<VirtualClassAgendaSlice[]> {
  const { data, error } = await client
    .from("virtual_class_roster")
    .select("session_id, virtual_class_sessions(id,course,topic,starts_at)")
    .eq("student_user_id", userId);
  if (error) throw error;

  const out: VirtualClassAgendaSlice[] = [];
  for (const row of data ?? []) {
    const nested = (row as { virtual_class_sessions?: { id: string; course: string; topic?: string; starts_at: string } | { id: string; course: string; topic?: string; starts_at: string }[] | null })
      .virtual_class_sessions;
    const session = Array.isArray(nested) ? nested[0] : nested;
    if (!session) continue;
    out.push({
      id: String(session.id),
      course: String(session.course),
      topic: String(session.topic ?? ""),
      startsAt: String(session.starts_at),
    });
  }
  return out.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function listVirtualClassRoster(
  client: SupabaseClient,
  sessionId: string,
): Promise<VirtualClassRosterRow[]> {
  const { data, error } = await client.rpc("list_virtual_class_roster", { p_session_id: sessionId });
  if (error) throw error;
  if (!data || typeof data !== "object") return [];
  const payload = data as { ok?: boolean; rows?: unknown };
  if (!payload.ok || !Array.isArray(payload.rows)) return [];
  return payload.rows.map((row) => {
    const r = row as { student_user_id: string; display_name?: string; joined_at: string };
    return {
      studentUserId: String(r.student_user_id),
      displayName: String(r.display_name ?? "Estudiante"),
      joinedAt: String(r.joined_at),
    };
  });
}

export async function addVirtualClassRosterStudent(
  client: SupabaseClient,
  sessionId: string,
  studentUserId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await client.from("virtual_class_roster").insert({
    session_id: sessionId,
    student_user_id: studentUserId,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) return { ok: false, error: "already" };
    if (msg.includes("policy") || msg.includes("capacity")) return { ok: false, error: "full" };
    throw error;
  }
  return { ok: true };
}

export async function addVirtualClassRosterByEmail(
  client: SupabaseClient,
  sessionId: string,
  email: string,
): Promise<{ ok: boolean; error?: string; alreadyEnrolled?: boolean }> {
  const { data, error } = await client.rpc("add_virtual_class_roster_by_email", {
    p_session_id: sessionId,
    p_email: email.trim(),
  });
  if (error) throw error;
  if (!data || typeof data !== "object") return { ok: false, error: "unknown" };
  const row = data as Record<string, unknown>;
  if (!row.ok) {
    const err = typeof row.error === "string" ? row.error : "unknown";
    if (err === "not_found") return { ok: false, error: "email_not_found" };
    if (err === "full") return { ok: false, error: "full" };
    if (err === "forbidden") return { ok: false, error: "forbidden" };
    return { ok: false, error: err };
  }
  return { ok: true, alreadyEnrolled: Boolean(row.already_enrolled) };
}

export async function removeVirtualClassRosterStudent(
  client: SupabaseClient,
  sessionId: string,
  studentUserId: string,
): Promise<void> {
  const { error } = await client
    .from("virtual_class_roster")
    .delete()
    .eq("session_id", sessionId)
    .eq("student_user_id", studentUserId);
  if (error) throw error;
}
