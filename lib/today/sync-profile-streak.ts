import type { UserProfile } from "@/lib/schemas/profile";
import { localIsoDate } from "@/lib/calendar/local-iso-date";
import { getStudyStreakDays, loadStudyStreakState } from "@/lib/storage/study-streak-storage";

/** Sync profile.streakDays / lastActiveDate from study streak storage. */
export function syncProfileStudyStreak(profile: UserProfile): UserProfile {
  const streakDays = getStudyStreakDays();
  const today = localIsoDate();
  const studiedToday = loadStudyStreakState().activeDates.includes(today);

  if (profile.streakDays === streakDays && (!studiedToday || profile.lastActiveDate === today)) {
    return profile;
  }

  return {
    ...profile,
    streakDays,
    lastActiveDate: studiedToday ? today : profile.lastActiveDate,
  };
}
