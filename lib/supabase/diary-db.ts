import type { SupabaseClient } from "@supabase/supabase-js";

import { diaryPayloadSchema, type DiaryEntry } from "@/lib/schemas/diary-entry";
import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";

type DiaryRow = {
  id: string;
  user_id: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
  payload: unknown;
};

function mapDiaryRow(row: DiaryRow): DiaryEntry {
  const payload = diaryPayloadSchema.parse(row.payload);
  return {
    id: row.id,
    entryDate: row.entry_date.slice(0, 10),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...payload,
  };
}

export async function fetchDiaryEntriesRemote(client: SupabaseClient, userId: string): Promise<DiaryEntry[]> {
  const { data, error } = await client
    .from("diary_entries")
    .select("id,user_id,entry_date,created_at,updated_at,payload")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(formatAgendaCloudError(error.message));
  return ((data ?? []) as DiaryRow[]).map(mapDiaryRow);
}

export async function insertDiaryEntryRemote(
  client: SupabaseClient,
  userId: string,
  input: Omit<DiaryEntry, "id" | "createdAt">,
): Promise<DiaryEntry> {
  const payload = diaryPayloadSchema.parse({
    mood: input.mood,
    energy: input.energy,
    moment: input.moment,
    gratitude: input.gratitude,
    body: input.body,
    intention: input.intention,
    tags: input.tags,
  });

  const { data, error } = await client
    .from("diary_entries")
    .insert({
      user_id: userId,
      entry_date: input.entryDate,
      payload,
    })
    .select("id,user_id,entry_date,created_at,updated_at,payload")
    .single();
  if (error) throw new Error(formatAgendaCloudError(error.message));
  return mapDiaryRow(data as DiaryRow);
}

export async function updateDiaryEntryRemote(client: SupabaseClient, userId: string, entry: DiaryEntry): Promise<DiaryEntry> {
  const payload = diaryPayloadSchema.parse({
    mood: entry.mood,
    energy: entry.energy,
    moment: entry.moment,
    gratitude: entry.gratitude,
    body: entry.body,
    intention: entry.intention,
    tags: entry.tags,
  });

  const { data, error } = await client
    .from("diary_entries")
    .update({
      entry_date: entry.entryDate,
      payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entry.id)
    .eq("user_id", userId)
    .select("id,user_id,entry_date,created_at,updated_at,payload")
    .single();
  if (error) throw new Error(formatAgendaCloudError(error.message));
  return mapDiaryRow(data as DiaryRow);
}

export async function deleteDiaryEntryRemote(client: SupabaseClient, userId: string, entryId: string): Promise<void> {
  const { error } = await client.from("diary_entries").delete().eq("id", entryId).eq("user_id", userId);
  if (error) throw new Error(formatAgendaCloudError(error.message));
}
