import type { CounselorSharePayload } from "@/lib/wellbeing/counselor-summary";

export type CounselorSignPayload = {
  v: 1;
  studentLabel: string;
  university: string;
  weekOf: string;
  streakDays: number;
  entriesLast7Days: number;
  entriesLast14Days: number;
  averageEnergy7d: number | null;
  moodTrend: string;
  lowMoodDays7d: number;
  stressTagCount7d: number;
  riskLevel: string;
  riskScore: number;
};

export function counselorPayloadFromShare(payload: CounselorSharePayload): CounselorSignPayload {
  return {
    v: 1,
    studentLabel: payload.studentLabel,
    university: payload.university,
    weekOf: payload.weekOf,
    streakDays: payload.streakDays,
    entriesLast7Days: payload.insights.entriesLast7Days,
    entriesLast14Days: payload.insights.entriesLast14Days,
    averageEnergy7d: payload.insights.averageEnergy7d,
    moodTrend: payload.insights.moodTrend ?? "unknown",
    lowMoodDays7d: payload.insights.lowMoodDays7d,
    stressTagCount7d: payload.insights.stressTagCount7d,
    riskLevel: payload.risk.level,
    riskScore: payload.risk.score,
  };
}

export function canonicalCounselorPayloadJson(payload: CounselorSignPayload): string {
  const sorted = Object.keys(payload)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = payload[key as keyof CounselorSignPayload];
      return acc;
    }, {});
  return JSON.stringify(sorted);
}

/** Browser-safe base64url — no Node `Buffer` or `node:crypto`. */
export function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function appendCounselorSignatureBlock(
  summary: string,
  payload: CounselorSignPayload,
  signature: string,
  signedAt: string,
  verifyUrl: string,
): string {
  const payloadB64 = encodeBase64Url(canonicalCounselorPayloadJson(payload));
  return [
    summary,
    "",
    "Verificación Kampus (resumen firmado)",
    "────────────────────────────────────",
    `Generado: ${signedAt}`,
    `Firma: ${signature}`,
    `Payload: ${payloadB64}`,
    `Verificar: ${verifyUrl}`,
  ].join("\n");
}
