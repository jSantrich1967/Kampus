import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deletePushSubscriptionsByEndpoints, listAllWellbeingPushSubscriptions } from "@/lib/supabase/wellbeing-push-db";
import { broadcastCheckInPush } from "@/lib/wellbeing/web-push-server";
import { getVapidPublicKey } from "@/lib/wellbeing/web-push-env";

export const runtime = "nodejs";

const DEFAULT_TITLE = "¿Cómo ha ido tu día?";
const DEFAULT_BODY = "Un minuto en el diario cierra el día y protege tu racha.";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!getVapidPublicKey()) {
    return NextResponse.json({ error: "VAPID not configured." }, { status: 503 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role not configured." }, { status: 503 });
  }

  let title = DEFAULT_TITLE;
  let body = DEFAULT_BODY;
  try {
    const json = await req.json().catch(() => null);
    if (json && typeof json === "object") {
      if (typeof (json as { title?: unknown }).title === "string") title = (json as { title: string }).title;
      if (typeof (json as { body?: unknown }).body === "string") body = (json as { body: string }).body;
    }
  } catch {
    /* use defaults */
  }

  try {
    const rows = await listAllWellbeingPushSubscriptions(admin);
    const result = await broadcastCheckInPush(rows, title, body);

    if (result.goneEndpoints.length > 0) {
      await deletePushSubscriptionsByEndpoints(admin, result.goneEndpoints);
    }

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      removed: result.goneEndpoints.length,
      total: rows.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron push failed." },
      { status: 500 },
    );
  }
}
