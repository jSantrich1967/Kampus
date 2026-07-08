import type { SupabaseClient } from "@supabase/supabase-js";

import type { LmsIntegration, LmsProvider } from "@/lib/collaborate/lms-deep-link";

export async function fetchLmsIntegration(
  client: SupabaseClient,
  userId: string,
): Promise<LmsIntegration | null> {
  const { data, error } = await client
    .from("collaborate_lms_integrations")
    .select("provider, base_url")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as { provider: LmsProvider; base_url: string };
  return { provider: row.provider, baseUrl: row.base_url };
}

export async function upsertLmsIntegration(
  client: SupabaseClient,
  userId: string,
  provider: LmsProvider,
  baseUrl: string,
): Promise<void> {
  const { error } = await client.from("collaborate_lms_integrations").upsert(
    {
      user_id: userId,
      provider,
      base_url: baseUrl.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function updateVirtualClassLmsCourseId(
  client: SupabaseClient,
  sessionId: string,
  lmsCourseId: string | null,
): Promise<void> {
  const { error } = await client
    .from("virtual_class_sessions")
    .update({ lms_course_id: lmsCourseId?.trim() || null })
    .eq("id", sessionId);
  if (error) throw error;
}
