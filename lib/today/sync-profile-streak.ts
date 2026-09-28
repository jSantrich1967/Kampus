import type { UserProfile } from "@/lib/schemas/profile";
import { localIsoDate } from "@/lib/calendar/local-iso-date";
import { getStudyStreakDays, loadStudyStreakState } from "@/lib/storage/study-streak-storage";

/** Sync profile.streakDays / lastActiveDate from study streak storage. */
export function syncProfileStudyStreak(profile: UserProfile, userId?: string | null): UserProfile {
  const streakDays = getStudyStreakDays(userId);
  const today = localIsoDate();
  const studiedToday = loadStudyStreakState(userId).activeDates.includes(today);

  if (profile.streakDays === streakDays && (!studiedToday || profile.lastActiveDate === today)) {
    return profile;
  }

  return {
    ...profile,
    streakDays,
    lastActiveDate: studiedToday ? today : profile.lastActiveDate,
  };
}
