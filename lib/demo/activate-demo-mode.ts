import { buildDemoClassScheduleRows } from "@/lib/demo/demo-class-schedule";
import { buildDemoProfile, buildPremiumDemoProfile } from "@/lib/demo/demo-profile";
import { seedDemoStudyStreak } from "@/lib/demo/demo-study-streak";
import type { UserProfile } from "@/lib/schemas/profile";
import { loadClassSchedule, saveClassSchedule } from "@/lib/storage/class-schedule-storage";
import { saveProfile } from "@/lib/storage/kampus-storage";

export type DemoModeOptions = {
  premium?: boolean;
};

/** Load demo subjects, exams, schedule seed, streak — optionally with Premium plan. */
export function activateDemoMode(options?: DemoModeOptions): UserProfile {
  const demo = options?.premium ? buildPremiumDemoProfile() : buildDemoProfile();
  saveProfile(demo);
  if (loadClassSchedule().length === 0) {
    saveClassSchedule(buildDemoClassScheduleRows(demo.subjects));
  }
  seedDemoStudyStreak();
  return demo;
}
