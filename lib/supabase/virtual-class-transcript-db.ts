import type { SupabaseClient } from "@supabase/supabase-js";

export async function updateVirtualClassTranscript(
  client: SupabaseClient,
  sessionId: string,
  transcriptText: string,
): Promise<void> {
  const { error } = await client
    .from("virtual_class_sessions")
    .update({
      transcript_text: transcriptText.trim() || null,
      transcript_updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function fetchVirtualClassTranscript(
  client: SupabaseClient,
  sessionId: string,
): Promise<{ text: string | null; updatedAt: string | null }> {
  const { data, error } = await client
    .from("virtual_class_sessions")
    .select("transcript_text, transcript_updated_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { text: null, updatedAt: null };
  const row = data as { transcript_text: string | null; transcript_updated_at: string | null };
  return {
    text: row.transcript_text?.trim() || null,
    updatedAt: row.transcript_updated_at,
  };
}
