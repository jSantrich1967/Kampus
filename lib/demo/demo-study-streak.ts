import { addDaysLocalIso } from "@/lib/calendar/local-iso-date";
import { loadStudyStreakState, recordStudyActivity } from "@/lib/storage/study-streak-storage";

/** Seeds 3 recent study days for demo momentum (idempotent if already seeded). */
export function seedDemoStudyStreak(userId?: string | null) {
  // Demo has no account. Write the anonymous box so it never lands in a real user.
  const owner = userId === undefined ? null : userId;
  if (loadStudyStreakState(owner).activeDates.length > 0) return;

  recordStudyActivity(addDaysLocalIso(-2), owner);
  recordStudyActivity(addDaysLocalIso(-1), owner);
}
