import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { insertCounselorAlert } from "@/lib/supabase/wellbeing-counselor-alerts-db";
import { isProactiveAlertLevel } from "@/lib/wellbeing/counselor-alert-eligibility";
import { loadCloudCounselorMetrics } from "@/lib/wellbeing/counselor-from-cloud";
import { postInstitutionWellbeingWebhook } from "@/lib/wellbeing/institution-webhook";

export const runtime = "nodejs";

const bodySchema = z.object({
  institutionKey: z.string().min(2).max(120),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

  const metrics = await loadCloudCounselorMetrics(supabase, user.id);
  if (!metrics.institutionKey || metrics.institutionKey !== parsed.data.institutionKey) {
    return NextResponse.json({ error: "La institución no coincide con tu perfil." }, { status: 403 });
  }
  if (!isProactiveAlertLevel(metrics.risk.level)) {
    return NextResponse.json({ error: "Risk level not eligible for counselor alert." }, { status: 400 });
  }

  const alert = {
    institutionKey: metrics.institutionKey,
    weekStart: parsed.data.weekStart,
    riskLevel: metrics.risk.level as "watch" | "elevated",
    riskScore: metrics.risk.score,
    reasons: metrics.risk.reasons,
    channel: parsed.data.channel,
  };

  try {
    await insertCounselorAlert(supabase, user.id, alert);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: msg || "Could not save alert." }, { status: 500 });
  }

  const webhookOk = await postInstitutionWellbeingWebhook({
    event: "wellbeing.counselor_alert",
    institutionKey: alert.institutionKey,
    weekStart: alert.weekStart,
    riskLevel: alert.riskLevel,
    riskScore: alert.riskScore,
    reasons: alert.reasons,
    channel: alert.channel,
    emittedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, webhookDelivered: webhookOk });
}
