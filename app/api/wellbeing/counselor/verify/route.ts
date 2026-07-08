import { NextResponse } from "next/server";
import { z } from "zod";

import {
  parseCounselorSignatureBlock,
  verifyCounselorSignature,
  type CounselorSignPayload,
} from "@/lib/wellbeing/counselor-sign";

export const runtime = "nodejs";

const verifySchema = z.object({
  text: z.string().min(20).max(12000).optional(),
  payload: z
    .object({
      v: z.literal(1),
      studentLabel: z.string(),
      university: z.string(),
      weekOf: z.string(),
      streakDays: z.number(),
      entriesLast7Days: z.number(),
      entriesLast14Days: z.number(),
      averageEnergy7d: z.number().nullable(),
      moodTrend: z.string(),
      lowMoodDays7d: z.number(),
      stressTagCount7d: z.number(),
      riskLevel: z.string(),
      riskScore: z.number(),
    })
    .optional(),
  signature: z.string().optional(),
  signedAt: z.string().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let payload: CounselorSignPayload;
  let signature: string;
  let signedAt: string;

  if (parsed.data.text) {
    const block = parseCounselorSignatureBlock(parsed.data.text);
    if (!block) {
      return NextResponse.json({ valid: false, error: "No se encontró bloque de verificación válido." });
    }
    payload = block.payload;
    signature = block.signature;
    signedAt = block.signedAt;
  } else if (parsed.data.payload && parsed.data.signature && parsed.data.signedAt) {
    payload = parsed.data.payload as CounselorSignPayload;
    signature = parsed.data.signature;
    signedAt = parsed.data.signedAt;
  } else {
    return NextResponse.json({ error: "Provide text or payload+signature+signedAt." }, { status: 400 });
  }

  const valid = verifyCounselorSignature(payload, signature, signedAt);
  if (!valid) {
    return NextResponse.json({ valid: false, error: "La firma no coincide — el resumen pudo haber sido alterado." });
  }

  return NextResponse.json({
    valid: true,
    payload,
    signedAt,
    message: "Resumen auténtico generado por Kampus (métricas agregadas, sin texto del diario).",
  });
}
