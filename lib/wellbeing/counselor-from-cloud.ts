import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchDiaryEntriesRemote } from "@/lib/supabase/diary-db";
import { fetchProfileForUser } from "@/lib/supabase/profile-sync";
import { diaryStreakDays } from "@/lib/storage/diary-storage";
import { computeDiaryInsights, type DiaryInsights } from "@/lib/wellbeing/diary-insights";
import { institutionKeyFromUniversityName } from "@/lib/wellbeing/university-services-catalog";
import { computeWellbeingRiskSignal, type WellbeingRiskSignal } from "@/lib/wellbeing/wellbeing-risk-bridge";
import { defaultProfile, type UserProfile } from "@/lib/schemas/profile";

export type CloudCounselorMetrics = {
  profile: UserProfile;
  institutionKey: string | null;
  insights: DiaryInsights;
  risk: WellbeingRiskSignal;
  streakDays: number;
};

/** Risk and counts come from diary rows in Supabase, not from the browser body. */
export async function loadCloudCounselorMetrics(
  client: SupabaseClient,
  userId: string,
): Promise<CloudCounselorMetrics> {
  const profile = (await fetchProfileForUser(client, userId)) ?? defaultProfile;
  const entries = await fetchDiaryEntriesRemote(client, userId);
  const insights = computeDiaryInsights(entries);
  return {
    profile: profile as UserProfile,
    institutionKey: institutionKeyFromUniversityName(profile.university),
    insights,
    risk: computeWellbeingRiskSignal(insights),
    streakDays: diaryStreakDays(entries),
  };
}
