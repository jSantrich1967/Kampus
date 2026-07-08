import type { SupabaseClient } from "@supabase/supabase-js";

import type { VirtualClassSessionExport } from "@/lib/supabase/virtual-class-db";

export async function ensureWebcalToken(client: SupabaseClient, userId: string): Promise<string> {
  const { data: existing, error: readErr } = await client
    .from("collaborate_webcal_tokens")
    .select("token")
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (existing?.token) return String((existing as { token: string }).token);

  const { data, error } = await client
    .from("collaborate_webcal_tokens")
    .insert({ user_id: userId })
    .select("token")
    .single();
  if (error) throw error;
  return String((data as { token: string }).token);
}

export async function rotateWebcalToken(client: SupabaseClient, userId: string): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const { data, error } = await client
    .from("collaborate_webcal_tokens")
    .upsert({ user_id: userId, token, rotated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("token")
    .single();
  if (error) throw error;
  return String((data as { token: string }).token);
}

export async function resolveWebcalUserId(admin: SupabaseClient, token: string): Promise<string | null> {
  const { data, error } = await admin.rpc("resolve_webcal_user_id", { p_token: token });
  if (error) throw error;
  return data ? String(data) : null;
}

export async function fetchEnrolledVirtualClassSessionsForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<VirtualClassSessionExport[]> {
  const { data, error } = await admin
    .from("virtual_class_roster")
    .select("session_id, virtual_class_sessions(id,course,topic,starts_at,ends_at,join_url)")
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

export function buildWebcalFeedUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/api/collaborate/calendar/webcal/${encodeURIComponent(token)}`;
}

export function buildWebcalSubscribeUrl(origin: string, token: string): string {
  return buildWebcalFeedUrl(origin, token).replace(/^https:/, "webcal:");
}
