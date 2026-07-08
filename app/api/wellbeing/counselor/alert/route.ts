import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { insertCounselorAlert } from "@/lib/supabase/wellbeing-counselor-alerts-db";
import { isProactiveAlertLevel } from "@/lib/wellbeing/counselor-alert-eligibility";
import { postInstitutionWellbeingWebhook } from "@/lib/wellbeing/institution-webhook";

export const runtime = "nodejs";

const bodySchema = z.object({
  institutionKey: z.string().min(2).max(120),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  riskLevel: z.enum(["watch", "elevated"]),
  riskScore: z.number().int().min(0).max(100),
  reasons: z.array(z.string().max(400)).max(8),
  channel: z.enum(["auto", "manual"]),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Inicia sesión para enviar avisos a orientación." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (!isProactiveAlertLevel(parsed.data.riskLevel)) {
    return NextResponse.json({ error: "Risk level not eligible for counselor alert." }, { status: 400 });
  }

  try {
    await insertCounselorAlert(supabase, user.id, parsed.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: msg || "Could not save alert." }, { status: 500 });
  }

  const webhookOk = await postInstitutionWellbeingWebhook({
    event: "wellbeing.counselor_alert",
    institutionKey: parsed.data.institutionKey,
    weekStart: parsed.data.weekStart,
    riskLevel: parsed.data.riskLevel,
    riskScore: parsed.data.riskScore,
    reasons: parsed.data.reasons,
    channel: parsed.data.channel,
    emittedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, webhookDelivered: webhookOk });
}
