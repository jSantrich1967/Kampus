import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  appendCounselorSignatureBlock,
  signCounselorPayload,
  type CounselorSignPayload,
} from "@/lib/wellbeing/counselor-sign";
import { loadCloudCounselorMetrics } from "@/lib/wellbeing/counselor-from-cloud";
import { buildCounselorShareSummary } from "@/lib/wellbeing/counselor-summary";
import { currentWeekStartIso } from "@/lib/wellbeing/institution-pulse-storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Inicia sesión para firmar el resumen." }, { status: 401 });
  }

  const metrics = await loadCloudCounselorMetrics(supabase, user.id);
  const signPayload: CounselorSignPayload = {
    v: 1,
    studentLabel: metrics.profile.displayName || "Estudiante",
    university: metrics.profile.university,
    weekOf: currentWeekStartIso(),
    streakDays: metrics.streakDays,
    entriesLast7Days: metrics.insights.entriesLast7Days,
    entriesLast14Days: metrics.insights.entriesLast14Days,
    averageEnergy7d: metrics.insights.averageEnergy7d,
    moodTrend: metrics.insights.moodTrend ?? "unknown",
    lowMoodDays7d: metrics.insights.lowMoodDays7d,
    stressTagCount7d: metrics.insights.stressTagCount7d,
    riskLevel: metrics.risk.level,
    riskScore: metrics.risk.score,
  };
  const signed = signCounselorPayload(signPayload);

  if (!signed) {
    return NextResponse.json({ error: "Signing secret not configured." }, { status: 503 });
  }

  const origin = new URL(req.url).origin;
  const verifyUrl = `${origin}/wellbeing/counselor-verify`;

  return NextResponse.json({
    ok: true,
    signature: signed.signature,
    signedAt: signed.signedAt,
    verifyUrl,
    signedBlock: appendCounselorSignatureBlock(
      buildCounselorShareSummary({
        studentLabel: signPayload.studentLabel,
        university: signPayload.university,
        weekOf: signPayload.weekOf,
        streakDays: signPayload.streakDays,
        insights: metrics.insights,
        risk: metrics.risk,
      }),
      signPayload,
      signed.signature,
      signed.signedAt,
      verifyUrl,
    ).trim(),
  });
}
