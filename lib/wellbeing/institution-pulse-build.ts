import { localIsoDate } from "@/lib/calendar/local-iso-date";
import type { DiaryInsights } from "@/lib/wellbeing/diary-insights";
import type { WellbeingRiskSignal } from "@/lib/wellbeing/wellbeing-risk-bridge";
import { currentWeekStartIso } from "@/lib/wellbeing/institution-pulse-storage";
import { institutionKeyFromUniversityName } from "@/lib/wellbeing/university-services-catalog";

export type InstitutionWellbeingPulse = {
  entriesLast7Days: number;
  entriesLast14Days: number;
  averageEnergy7d: number | null;
  lowMoodDays7d: number;
  stressTagCount7d: number;
  riskLevel: WellbeingRiskSignal["level"];
  riskScore: number;
  updatedAt: string;
};

export function buildInstitutionPulse(
  insights: DiaryInsights,
  risk: WellbeingRiskSignal,
): InstitutionWellbeingPulse {
  return {
    entriesLast7Days: insights.entriesLast7Days,
    entriesLast14Days: insights.entriesLast14Days,
    averageEnergy7d: insights.averageEnergy7d,
    lowMoodDays7d: insights.lowMoodDays7d,
    stressTagCount7d: insights.stressTagCount7d,
    riskLevel: risk.level,
    riskScore: risk.score,
    updatedAt: localIsoDate(),
  };
}

export function institutionKeyFromUniversity(university: string): string | null {
  return institutionKeyFromUniversityName(university);
}

export function weekStartForPulse(): string {
  return currentWeekStartIso();
}
