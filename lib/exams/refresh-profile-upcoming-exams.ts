import type { UserProfile } from "@/lib/schemas/profile";
import type { Exam } from "@/lib/schemas/exams";
import { mergeUpcomingExamsIntoProfile, upcomingExamsEqual } from "@/lib/exams/sync-upcoming-exams";

/** Applies agenda exam due dates onto profile.upcomingExams (returns same ref if unchanged). */
export function applyAgendaExamsToProfile(
  profile: UserProfile,
  agendaExams: Exam[],
  options?: { retainDemoExams?: boolean },
): UserProfile {
  const merged = mergeUpcomingExamsIntoProfile(
    profile.upcomingExams,
    agendaExams.filter((e) => e.status !== "draft"),
    options,
  );
  if (upcomingExamsEqual(profile.upcomingExams, merged)) return profile;
  return { ...profile, upcomingExams: merged };
}
