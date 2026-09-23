import { buildDemoClassScheduleRows } from "@/lib/demo/demo-class-schedule";
import { buildDemoProfile, buildPremiumDemoProfile } from "@/lib/demo/demo-profile";
import { seedDemoStudyStreak } from "@/lib/demo/demo-study-streak";
import type { UserProfile } from "@/lib/schemas/profile";
import { saveClassSchedule } from "@/lib/storage/class-schedule-storage";
import { syncDemoExamsWithUpcoming } from "@/lib/storage/exams-storage";
import { saveProfile } from "@/lib/storage/kampus-storage";

export type DemoModeOptions = {
  premium?: boolean;
};

/** Load demo subjects, exams, schedule seed, streak — optionally with Premium plan. */
export function activateDemoMode(options?: DemoModeOptions): UserProfile {
  const demo = options?.premium ? buildPremiumDemoProfile() : buildDemoProfile();
  saveProfile(demo);
  // Los exámenes demo reflejan los próximos exámenes del perfil: misma materia y fecha.
  syncDemoExamsWithUpcoming(demo.upcomingExams ?? []);
  // El demo siempre arranca con el mismo horario de ejemplo: nada de datos viejos.
  saveClassSchedule(buildDemoClassScheduleRows(demo.subjects));
  seedDemoStudyStreak();
  return demo;
}
