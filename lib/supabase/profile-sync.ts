import type { SupabaseClient } from "@supabase/supabase-js";

import { defaultProfile, profileSchema, type UserProfile } from "@/lib/schemas/profile";

const TABLE = "profiles";

/** Merge JSON from DB with app defaults and validate. */
export function mergeRemoteProfileBody(body: unknown): UserProfile {
  const base =
    body && typeof body === "object" && !Array.isArray(body) ? (body as object) : {};
  const parsed = profileSchema.safeParse({ ...defaultProfile, ...base });
  return parsed.success ? parsed.data : defaultProfile;
}

export function isMeaningfulProfile(p: UserProfile): boolean {
  return (
    p.onboardingFinished ||
    p.subjects.length > 0 ||
    p.university.trim().length > 0 ||
    p.learningGoals.trim().length > 0
  );
}

/** Prefer server when it already has real data; otherwise keep local and upload. */
export function resolveProfileMerge(local: UserProfile, remote: UserProfile): UserProfile {
  const remoteMeaningful = isMeaningfulProfile(remote);
  const localMeaningful = isMeaningfulProfile(local);
  if (remoteMeaningful) return remote;
  if (localMeaningful) return local;
  return remote;
}

export function profileToJsonBody(profile: UserProfile): Record<string, unknown> {
  return JSON.parse(JSON.stringify(profile)) as Record<string, unknown>;
}

export async function fetchProfileForUser(
  client: SupabaseClient,
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await client.from(TABLE).select("body").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!data || data.body === null || data.body === undefined) return null;
  return mergeRemoteProfileBody(data.body);
}

export async function upsertProfileForUser(
  client: SupabaseClient,
  userId: string,
  profile: UserProfile,
): Promise<void> {
  const body = profileToJsonBody(profile);
  const { error } = await client.from(TABLE).upsert(
    {
      id: userId,
      body,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}
