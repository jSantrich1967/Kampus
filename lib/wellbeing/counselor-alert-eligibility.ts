import type { WellbeingRiskLevel, WellbeingRiskSignal } from "@/lib/wellbeing/wellbeing-risk-bridge";

export function isProactiveAlertLevel(level: WellbeingRiskLevel): boolean {
  return level === "watch" || level === "elevated";
}

/** Student opted in and signal warrants orientation awareness. */
export function shouldSendProactiveCounselorAlert(
  signal: WellbeingRiskSignal,
  weekStart: string,
  lastAutoAlertWeek: string | null,
): boolean {
  if (!isProactiveAlertLevel(signal.level)) return false;
  if (lastAutoAlertWeek === weekStart) return false;
  return signal.reasons.length > 0;
}
