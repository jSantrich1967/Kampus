import { addDaysLocalIso } from "@/lib/calendar/local-iso-date";
import { loadStudyStreakState, recordStudyActivity } from "@/lib/storage/study-streak-storage";

/** Seeds 3 recent study days for demo momentum (idempotent if already seeded). */
export function seedDemoStudyStreak() {
  if (loadStudyStreakState().activeDates.length > 0) return;

  recordStudyActivity(addDaysLocalIso(-2));
  recordStudyActivity(addDaysLocalIso(-1));
}
