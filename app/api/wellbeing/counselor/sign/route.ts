import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  appendCounselorSignatureBlock,
  signCounselorPayload,
  type CounselorSignPayload,
} from "@/lib/wellbeing/counselor-sign";

export const runtime = "nodejs";

const payloadSchema = z.object({
  studentLabel: z.string().max(120),
  university: z.string().max(200),
  weekOf: z.string().max(20),
  streakDays: z.number().int().min(0).max(9999),
  insights: z.object({
    entriesLast7Days: z.number().int().min(0),
    entriesLast14Days: z.number().int().min(0),
    averageEnergy7d: z.number().min(0).max(5).nullable(),
    moodTrend: z.enum(["up", "down", "stable", "unknown", ""]).nullable(),
    lowMoodDays7d: z.number().int().min(0),
    stressTagCount7d: z.number().int().min(0),
  }),
  risk: z.object({
    level: z.enum(["ok", "watch", "elevated"]),
    score: z.number().int().min(0).max(100),
  }),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Inicia sesión para firmar el resumen." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const signPayload: CounselorSignPayload = {
    v: 1,
    studentLabel: parsed.data.studentLabel,
    university: parsed.data.university,
    weekOf: parsed.data.weekOf,
    streakDays: parsed.data.streakDays,
    entriesLast7Days: parsed.data.insights.entriesLast7Days,
    entriesLast14Days: parsed.data.insights.entriesLast14Days,
    averageEnergy7d: parsed.data.insights.averageEnergy7d,
    moodTrend: parsed.data.insights.moodTrend || "unknown",
    lowMoodDays7d: parsed.data.insights.lowMoodDays7d,
    stressTagCount7d: parsed.data.insights.stressTagCount7d,
    riskLevel: parsed.data.risk.level,
    riskScore: parsed.data.risk.score,
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
    signedBlock: appendCounselorSignatureBlock("", signPayload, signed.signature, signed.signedAt, verifyUrl).trim(),
  });
}
